# 老舅厨房 — 生产部署

目标服务器：阿里云 ECS Ubuntu 22.04，公网 IP `101.201.37.18`，域名 `laojiukitchen.cn`。

## 一次性准备

1. DNS 已配置 `@` / `api` / `admin` 三条 A 记录指向公网 IP（**未配置 `www`，证书脚本不会请求 www**）
2. 服务器已安装 Docker Engine + compose plugin
3. ICP 备案已通过

## 部署步骤

```bash
# 在服务器上
git clone <repo> /opt/laojiu-kitchen
cd /opt/laojiu-kitchen/deploy

# 1) 准备生产环境变量
cp .env.production.example .env.production
vim .env.production   # 改密、填 WX_SECRET / AI_API_KEY 等

# 2) 一键部署
sudo ./deploy.sh
```

部署脚本执行 15 个步骤，全部成功后：

- 落地页    `https://laojiukitchen.cn/`
- API       `https://api.laojiukitchen.cn/api`
- 管理后台  `https://admin.laojiukitchen.cn/?admin=1`

## 关键路径

```
laojiu-kitchen/
├── server/                  # 后端源码（Docker 构建上下文）
├── frontend/                # 前端源码（部署时用 npm 构建）
├── deploy/
│   ├── deploy.sh                  # 一键部署主脚本
│   ├── docker-compose.prod.yml    # 三服务（postgres/redis/api）
│   ├── Dockerfile.prod            # 后端镜像（context = ../server）
│   ├── .env.production.example    # 环境变量模板
│   ├── nginx/laojiukitchen.cn.conf
│   ├── landing/index.html         # 主域落地页
│   └── backup.sh                  # 每日备份（pg_dump + uploads）
```

## 数据卷

宿主机持久化目录：

| 容器卷                  | 宿主路径                              |
|-------------------------|---------------------------------------|
| postgres 数据           | `/var/lib/laojiu-kitchen/pgdata`      |
| redis    数据           | `/var/lib/laojiu-kitchen/redisdata`   |
| 上传文件                | `/var/lib/laojiu-kitchen/uploads`     |
| 每日备份                | `/var/backups/laojiu-kitchen`         |

## 升级

```bash
cd /opt/laojiu-kitchen && git pull
cd deploy && sudo ./deploy.sh
```

`deploy.sh` 是幂等的：nginx 配置覆盖、前端重建、容器以 `up -d` 滚动重建。证书会自动续期。

## 上次部署踩过的坑（脚本里已规避）

- `systemctl reload nginx` 在 nginx 未启动时会失败 → 改用 `restart`
- 前端构建用 pnpm 时被 workspace.yaml 干扰 → 用 `npm install + npx vite build`
- HTTPS 证书包含 `www` 但 DNS 没配 → 不申请 www
- docker compose 没读到 `.env.production` → 显式 `--env-file ./.env.production`
- `vite` 二进制 Permission denied → 用 `npx vite build`
