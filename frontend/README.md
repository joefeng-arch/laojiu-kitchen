# 老舅厨房 — 前端 H5

React 19 + TypeScript + Vite + Tailwind CSS 4 · 端口 3000

## 快速启动（开发）

```bash
cd frontend
pnpm install

# 配置 API 地址
cp .env.example .env.local
# 编辑 .env.local，填入：
# VITE_API_BASE_URL=http://localhost:3001/api

pnpm dev
```

访问 http://localhost:3000

> 局域网真机测试时无需改配置——`src/api.ts` 会自动将 `localhost` 替换为 `window.location.hostname`，手机和电脑在同一子网即可。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 → `dist/` |
| `pnpm lint` | TypeScript 类型检查 |

## 依赖说明

| 库 | 用途 |
|----|------|
| react 19 + react-dom | UI 框架 |
| vite 6 | 构建工具 |
| tailwindcss 4 | 原子化 CSS（通过 `@tailwindcss/vite` 插件） |
| react-i18next / i18next | 国际化（当前仅 zh-CN） |
| lucide-react | 图标 |
| recharts | 管理后台图表 |
| motion | 动画（framer-motion 继任） |

## 页面一览

| 组件 | 路由触发方式 | 说明 |
|------|-------------|------|
| `OnboardingView` | 首次访问 | 新用户引导 |
| `HomeView` | 默认首页 | 菜谱列表、搜索、快捷入口 |
| `RecipeDetailView` | 点击菜谱卡片 | 食材、步骤、份量调整、开始烹饪 |
| `CreateRecipeView` | 新建/编辑按钮 | 食材行（主料/调味料）、步骤 + 计时器 |
| `SopView` | 点击「开始烹饪」 | 逐步引导、计时器、食材高亮、完成扣库存 |
| `TimerView` | 底栏计时器 Tab | 滚轮选择器（时:分:秒）、多计时器并行 |
| `PantryView` | 底栏食材 Tab | 在库/已耗尽分组、编辑弹窗、补货成本 |
| `DiscoverView` | 底栏发现 Tab | 公开菜谱、收藏 |
| `ProfileView` | 底栏我的 Tab | 资料、统计、设置 |
| `MyRecipesView` | 个人中心 | 我的菜谱列表 |
| `MealPlanView` | 个人中心 | 每周餐计划 |
| `ShoppingListView` | 个人中心 | 采购清单 |
| `HelpCenterView` | 个人中心 | 帮助中心 |
| `AdminLoginView` | `?admin=1` | 管理后台登录 |
| `AdminDashboardView` | 登录后 | 仪表盘、菜谱/用户/食材/分类管理 |

## 管理后台

访问 http://localhost:3000/?admin=1，使用独立的 admin 账号体系（`admin_users` 表）。

## 生产构建

```bash
# 部署脚本会自动执行，手动构建：
npm install --no-audit --no-fund
npx vite build
# dist/ 静态文件部署到 admin.laojiukitchen.cn
```

> 生产构建用 `npm` 而非 `pnpm`，避免 `pnpm-workspace.yaml` 在服务器上干扰构建路径。
