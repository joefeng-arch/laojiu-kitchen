# 老舅厨房 — 微信小程序壳

uni-app 3（Vue 3 + TypeScript）· AppID `wxe657793473769f5a`

> 这个项目**不承担业务 UI**，只是一个极简的微信小程序壳：
> 启动 → `uni.login` 拿 code → 后端换 JWT → 通过 `<web-view>` 加载 React H5。
>
> 真正的业务 UI 在 `../frontend/`（React 19 + Vite + Tailwind）。

## 架构

```
微信用户 ─► [小程序 shell.vue]
              │  uni.login() → code
              ▼
           POST api.laojiukitchen.cn/api/auth/wx-login
              │  { token }
              ▼
           <web-view src="https://admin.laojiukitchen.cn?token=JWT" />
              │
              ▼
           React H5（读取 ?token=，存 localStorage，清掉 URL）
```

## 快速启动

```bash
cd miniapp
pnpm install
pnpm dev:mp-weixin
# 用微信开发者工具打开 miniapp/ 目录
# miniprogramRoot 自动指向 dist/dev/mp-weixin/
```

> **模拟器注意**：模拟器中 `uni.login` 会报 `Failed to fetch`，已通过 `platform === "devtools"` 检测跳过，直接加载 H5（H5 端使用 mock 登录）。

## 生产构建

```bash
pnpm build:mp-weixin
# 用微信开发者工具上传 → 提交审核 → 发布
```

## 配置

`src/pages/shell/shell.vue` 顶部常量：

```ts
const H5_BASE_URL  = "https://admin.laojiukitchen.cn";      // React H5 部署地址
const API_BASE_URL = "https://api.laojiukitchen.cn/api";    // 后端 API 地址
```

## 微信公众平台配置

「开发管理 → 开发设置 → 服务器域名」：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://api.laojiukitchen.cn` |
| **业务域名**（web-view） | `https://admin.laojiukitchen.cn` |

> 业务域名需下载校验文件放到 H5 的 `frontend/public/` 目录并重新部署。

## 上架前提

- 微信小程序的 `<web-view>` 仅对**企业主体**开放，个人主体不可用
- ICP 备案：`laojiukitchen.cn` 已通过备案
- HTTPS 证书：通过 `deploy/deploy.sh` 的 certbot 步骤自动申请

## 上架完整流程

1. `deploy/deploy.sh` 部署后端 + 前端 HTTPS
2. 微信公众平台配置业务域名，下载校验文件放入 `frontend/public/`，重新触发前端构建
3. 修改 `shell.vue` 中的两个常量为真实域名（如已改，可跳过）
4. `pnpm build:mp-weixin` 生产构建
5. 微信开发者工具 → 上传 → 提交审核 → 发布
