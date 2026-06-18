#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 老舅厨房 增量更新脚本（已部署后的日常代码更新用）
# 与 deploy.sh 区别：不碰 nginx / certbot / ufw / fail2ban / 数据目录，
# 只做「拉代码 → 重建后端容器 → 重建前端静态 → 跑迁移」。
#
# 用法（服务器上 root 执行）：
#   cd /opt/laojiu-kitchen/deploy && sudo ./update.sh
#
# 可选参数：
#   --front-only   只重建前端
#   --api-only     只重建后端容器
#   --no-pull      跳过 git pull（已手动拉过）
#   --no-migrate   跳过数据库迁移
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── 路径（基于 deploy/ 自身定位仓库根，与 deploy.sh 一致）─────
DEPLOY_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$DEPLOY_DIR/.." && pwd)
SERVER_DIR="$REPO_ROOT/server"
FRONT_DIR="$REPO_ROOT/frontend"
ADMIN_WWW=/var/www/laojiukitchen-admin
COMPOSE=(docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" --env-file "$DEPLOY_DIR/.env.production")

log()  { printf "\033[1;34m[update]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m[fail]\033[0m %s\n" "$*"; exit 1; }

[ "$EUID" -eq 0 ] || die "必须以 root 运行：sudo ./update.sh"

# ── 参数解析 ────────────────────────────────────────────────
DO_PULL=1; DO_API=1; DO_FRONT=1; DO_MIGRATE=1
for arg in "$@"; do
  case "$arg" in
    --front-only) DO_API=0 ;;
    --api-only)   DO_FRONT=0 ;;
    --no-pull)    DO_PULL=0 ;;
    --no-migrate) DO_MIGRATE=0 ;;
    *) die "未知参数：$arg" ;;
  esac
done

[ -f "$DEPLOY_DIR/.env.production" ] || die "缺少 $DEPLOY_DIR/.env.production"

# ── 1. 拉取最新代码 ─────────────────────────────────────────
if [ "$DO_PULL" -eq 1 ]; then
  log "1/4 git pull origin main"
  git -C "$REPO_ROOT" pull --ff-only origin main || die "git pull 失败（本地可能有改动，先处理）"
else
  log "1/4 跳过 git pull（--no-pull）"
fi

OLD_HEAD=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "?")
log "    当前提交：$OLD_HEAD"

# ── 2. 重建并重启后端 API 容器 ──────────────────────────────
if [ "$DO_API" -eq 1 ]; then
  log "2/4 重建后端镜像并滚动重启 ujk-api"
  # 同步最新 .env.production 到 server/（compose 用 deploy/.env.production，
  # 此处仅为 typeorm CLI 等可能读取 server/.env.production 的场景保持一致）
  cp "$DEPLOY_DIR/.env.production" "$SERVER_DIR/.env.production"
  chmod 600 "$SERVER_DIR/.env.production"
  "${COMPOSE[@]}" build api
  "${COMPOSE[@]}" up -d api

  log "    等待 API 健康检查…"
  ok=0
  for i in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:3001/api/health >/dev/null 2>&1; then ok=1; break; fi
    sleep 2
  done
  [ "$ok" -eq 1 ] && log "    API 已就绪" || warn "API 健康检查超时，请 docker logs ujk-api 排查"

  # ── 数据库迁移（仅跑未执行的，幂等）─────────────────────
  if [ "$DO_MIGRATE" -eq 1 ]; then
    log "    执行数据库迁移（如无新迁移则空操作）"
    docker exec ujk-api node ./node_modules/typeorm/cli.js migration:run \
      -d dist/config/typeorm.datasource.js || warn "迁移执行失败，请检查"
  else
    log "    跳过数据库迁移（--no-migrate）"
  fi
else
  log "2/4 跳过后端（--front-only）"
fi

# ── 3. 重建前端静态并发布 ───────────────────────────────────
if [ "$DO_FRONT" -eq 1 ]; then
  log "3/4 构建前端（npm + npx vite，屏蔽 pnpm-workspace）"
  pushd "$FRONT_DIR" >/dev/null
  [ -f pnpm-workspace.yaml ] && mv pnpm-workspace.yaml pnpm-workspace.yaml.bak
  rm -rf node_modules dist
  npm install --no-audit --no-fund
  npx --no-install vite build
  [ -f pnpm-workspace.yaml.bak ] && mv pnpm-workspace.yaml.bak pnpm-workspace.yaml

  log "    发布到 $ADMIN_WWW"
  rm -rf "${ADMIN_WWW:?}"/*
  cp -a dist/. "$ADMIN_WWW/"
  chown -R www-data:www-data "$ADMIN_WWW"
  popd >/dev/null
else
  log "3/4 跳过前端（--api-only）"
fi

# ── 4. 收尾 ─────────────────────────────────────────────────
log "4/4 完成 ✓  提交 $OLD_HEAD"
[ "$DO_API" -eq 1 ]   && "${COMPOSE[@]}" ps --format "  {{.Name}}  {{.Status}}" 2>/dev/null || true
echo
log "前端已更新，浏览器请强制刷新（Ctrl+Shift+R）。"
log "后端日志：docker logs -f ujk-api"
