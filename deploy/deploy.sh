#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 老舅厨房 一键部署脚本
# 目标机：阿里云 ECS Ubuntu 22.04 (2C2G)，公网 101.201.37.18
# 域名 ：laojiukitchen.cn / api.laojiukitchen.cn / admin.laojiukitchen.cn
# 用法 ：在服务器上 clone 仓库后 cd laojiu-kitchen/deploy && sudo ./deploy.sh
#
# 关键路径（脚本基于 deploy/ 自身位置定位仓库根）
#   REPO_ROOT  = ../        (laojiu-kitchen/)
#   SERVER_DIR = ../server/
#   FRONT_DIR  = ../frontend/
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── 配置 ────────────────────────────────────────────────────
DOMAIN_ROOT=laojiukitchen.cn
DOMAIN_API=api.laojiukitchen.cn
DOMAIN_ADMIN=admin.laojiukitchen.cn
CERTBOT_EMAIL=joefeng1998@gmail.com

DEPLOY_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$DEPLOY_DIR/.." && pwd)
SERVER_DIR="$REPO_ROOT/server"
FRONT_DIR="$REPO_ROOT/frontend"

NGINX_AVAILABLE=/etc/nginx/sites-available/laojiukitchen.cn.conf
NGINX_ENABLED=/etc/nginx/sites-enabled/laojiukitchen.cn.conf
LANDING_DIR=/var/www/laojiukitchen-landing
ADMIN_WWW=/var/www/laojiukitchen-admin
DATA_ROOT=/var/lib/laojiu-kitchen

log()  { printf "\033[1;34m[deploy]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m[fail]\033[0m %s\n" "$*"; exit 1; }

[ "$EUID" -eq 0 ] || die "必须以 root 运行：sudo ./deploy.sh"

# ── 1. 安装基础软件 ─────────────────────────────────────────
log "1/15 安装 nginx / certbot / fail2ban / ufw / curl"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx fail2ban ufw curl ca-certificates

# ── 2. 检查 Docker ──────────────────────────────────────────
log "2/15 检查 Docker"
command -v docker >/dev/null || die "Docker 未安装，请先安装 Docker Engine 与 compose plugin"
docker compose version >/dev/null || die "缺少 docker compose plugin"

# ── 3. 创建数据目录 ─────────────────────────────────────────
log "3/15 创建数据目录"
mkdir -p "$DATA_ROOT/pgdata" "$DATA_ROOT/redisdata" "$DATA_ROOT/uploads"
mkdir -p "$LANDING_DIR" "$ADMIN_WWW" /var/www/certbot
chown -R 999:999 "$DATA_ROOT/pgdata"       # postgres 容器内 uid
chown -R 999:999 "$DATA_ROOT/redisdata"    # redis    容器内 uid
chown -R 1000:1000 "$DATA_ROOT/uploads"    # node     容器内 uid (alpine app user 创建时取得)

# ── 4. 配置防火墙 ───────────────────────────────────────────
log "4/15 配置 ufw"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── 5. 配置 fail2ban ────────────────────────────────────────
log "5/15 配置 fail2ban (sshd + nginx)"
cat > /etc/fail2ban/jail.d/laojiu.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h

[nginx-http-auth]
enabled = true

[nginx-botsearch]
enabled = true
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# ── 6. 部署 Nginx 配置 ──────────────────────────────────────
log "6/15 安装 nginx 站点配置（restart，非 reload）"
cp "$DEPLOY_DIR/nginx/laojiukitchen.cn.conf" "$NGINX_AVAILABLE"
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

# ── 7. 部署落地页 ───────────────────────────────────────────
log "7/15 部署落地页到 $LANDING_DIR"
cp -a "$DEPLOY_DIR/landing/." "$LANDING_DIR/"
# 法律文档：若 frontend/public 已有，则同步过来
for f in privacy-policy.html user-agreement.html; do
    if [ -f "$FRONT_DIR/public/$f" ]; then
        cp "$FRONT_DIR/public/$f" "$LANDING_DIR/$f"
    fi
done
chown -R www-data:www-data "$LANDING_DIR"

# ── 8. 构建前端（admin / H5）─────────────────────────────────
log "8/15 构建前端：使用 npm，避免 pnpm workspace 干扰"
pushd "$FRONT_DIR" >/dev/null

# 关键：屏蔽 pnpm-workspace.yaml，避免 vite 被 hoist 出现路径混乱
if [ -f pnpm-workspace.yaml ]; then
    mv pnpm-workspace.yaml pnpm-workspace.yaml.bak
fi

rm -rf node_modules dist
npm install --no-audit --no-fund

# 直接用 npx 调用 vite，避开二进制权限问题
npx --no-install vite build

[ -d pnpm-workspace.yaml.bak ] || true
[ -f pnpm-workspace.yaml.bak ] && mv pnpm-workspace.yaml.bak pnpm-workspace.yaml

# 同步到 admin 站点根
rm -rf "$ADMIN_WWW"/*
cp -a dist/. "$ADMIN_WWW/"
chown -R www-data:www-data "$ADMIN_WWW"
popd >/dev/null

# ── 9. 申请 HTTPS 证书（不含 www）───────────────────────────
log "9/15 申请/续期 HTTPS 证书（$DOMAIN_ROOT, $DOMAIN_API, $DOMAIN_ADMIN）"
certbot --nginx --non-interactive --agree-tos --redirect \
    -m "$CERTBOT_EMAIL" \
    -d "$DOMAIN_ROOT" -d "$DOMAIN_API" -d "$DOMAIN_ADMIN" \
    || warn "certbot 失败，请检查 DNS 是否已生效"

# 续期 cron（certbot 自带 systemd timer 即可，二次保险）
systemctl enable --now certbot.timer || true

# ── 10. 复制 .env.production 到 server/ ─────────────────────
log "10/15 写入生产环境变量到 server/.env.production"
if [ ! -f "$DEPLOY_DIR/.env.production" ]; then
    die "缺少 $DEPLOY_DIR/.env.production；请基于 .env.production.example 创建后重跑"
fi
cp "$DEPLOY_DIR/.env.production" "$SERVER_DIR/.env.production"
chmod 600 "$SERVER_DIR/.env.production"

# ── 11. 构建并启动 Docker 容器 ──────────────────────────────
log "11/15 构建并启动 docker compose（显式 --env-file）"
pushd "$DEPLOY_DIR" >/dev/null
docker compose -f docker-compose.prod.yml --env-file ./.env.production build
docker compose -f docker-compose.prod.yml --env-file ./.env.production up -d
popd >/dev/null

# ── 12. 等待服务就绪 ───────────────────────────────────────
log "12/15 等待 API 就绪"
for i in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
        log "    API 已就绪"
        break
    fi
    sleep 2
    [ $i -eq 30 ] && warn "API 30 次健康检查仍未通过，请 docker logs ujk-api 排查"
done

# ── 13. 运行 seed ──────────────────────────────────────────
log "13/15 执行数据库 seed（首次部署）"
docker exec ujk-api node dist/database/seeds/run-seeds.js || warn "seed 执行失败或已 seed 过"

# ── 14. 每日备份 ───────────────────────────────────────────
log "14/15 安装每日备份脚本到 /etc/cron.daily/"
install -m 0755 "$DEPLOY_DIR/backup.sh" /etc/cron.daily/laojiu-kitchen-backup
# 通过环境文件提供 DB_USER / DB_NAME（cron 自身不读 .env.production）
cat > /etc/default/laojiu-kitchen-backup <<EOF
DB_USER=$(grep ^DB_USER "$SERVER_DIR/.env.production" | cut -d= -f2)
DB_NAME=$(grep ^DB_NAME "$SERVER_DIR/.env.production" | cut -d= -f2)
EOF
# 让 cron 脚本读取
sed -i '2a [ -f /etc/default/laojiu-kitchen-backup ] && . /etc/default/laojiu-kitchen-backup' \
    /etc/cron.daily/laojiu-kitchen-backup

# ── 15. 最终验证 ───────────────────────────────────────────
log "15/15 最终验证"
echo "── nginx ────────────────"
systemctl is-active nginx || warn "nginx 未运行"
echo "── docker 容器 ──────────"
docker ps --filter name=ujk- --format 'table {{.Names}}\t{{.Status}}'
echo "── 健康检查 ─────────────"
curl -fsS http://127.0.0.1:3001/api/health && echo
curl -fsS -o /dev/null -w "landing  : %{http_code}\n" "https://$DOMAIN_ROOT/"  || true
curl -fsS -o /dev/null -w "api      : %{http_code}\n" "https://$DOMAIN_API/api/health" || true
curl -fsS -o /dev/null -w "admin    : %{http_code}\n" "https://$DOMAIN_ADMIN/"  || true

log "部署完成 🎉"
log "  落地页    https://$DOMAIN_ROOT/"
log "  API       https://$DOMAIN_API/api"
log "  管理后台  https://$DOMAIN_ADMIN/?admin=1"
