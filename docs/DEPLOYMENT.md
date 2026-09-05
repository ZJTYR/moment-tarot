# 本地运行与 Vercel 部署

这是一个浏览器端交互作品，没有账号服务、数据库、LLM 接口或需要设置的业务密钥。Vercel 托管公开体验，GitHub 仓库可保持私有；它们的可见性相互独立。

## 发布前准备

1. 将干净源码放到自己有权使用的 GitHub 仓库，保留 `pnpm-lock.yaml`、构建脚本、应用源码和实际图片。
2. 使用 README 指定的 Node.js 与 pnpm 版本，运行 `pnpm install --frozen-lockfile`。
3. 运行类型检查、相关测试以及正式静态构建，确认 HTML、脚本、图片、WASM 和模型均进入最终输出目录。
4. 在 Vercel 导入该仓库，仅授予构建所需的仓库访问权限；不要把本地凭据或环境文件提交进仓库。

## 构建与项目设置

构建命令和输出目录以随源码交付的 `package.json`、`vercel.json` 及下方确认值为准。不要仅以 CLI 退出码判断可部署：输出目录必须包含可访问的首页 HTML，以及运行时需要的模型和图片。

| 设置 | 值 |
| --- | --- |
| Node.js | `24.x` |
| pnpm | `11.19.0`，由 `packageManager` 固定 |
| Root Directory | 仓库根目录 |
| Framework Preset | `Other`；`vercel.json` 中为 `framework: null` |
| Install Command | `npx --yes pnpm@11.19.0 install --frozen-lockfile` |
| Build Command | `node scripts/build-vercel.mjs` |
| Output Directory | `dist-vercel` |
| 业务环境变量 | 无；也不需要额外 Corepack 开关 |

本地执行与 Vercel 等价的构建：

```sh
pnpm run build:vercel
```

脚本先准备模型与 WASM，再通过临时 Vite 入口复用 `TarotExperience`、全局样式与图片兼容层，输出静态站点，并核验资源完整性。临时目录 `.vercel-build/` 在结束时清理。应用与牌义仍使用同一套源码，不需要另维护一份页面。

开发仍用 `pnpm dev`。已有本机平台配置时，原 `pnpm build` 保留原有 Sites/Cloudflare 流程；**不要用它代替 Vercel 静态构建**。全新仓库不包含 `.openai/`，开发配置会使用普通 Vinext，无需补造平台配置文件。

本轮静态构建已核对首页产物和 65 份 public 资源的 SHA 一致性；这不替代部署后的真实浏览器与公开访问验证。

Vercel 的构建设置用于指定安装命令、构建命令和输出目录；参见[官方构建设置说明](https://vercel.com/docs/builds/configure-a-build)。构建阶段需要访问依赖源与 Google 官方模型下载地址；模型 checksum 由仓库脚本验证，浏览器运行时改从本站加载。

## 让朋友直接打开

部署成功后，使用 Vercel 返回的实际 HTTPS 地址。先在未登录 Vercel 的浏览器或隐私窗口打开生产地址，确认不会要求团队成员登录。如果存在访问保护，按项目需要检查 Deployment Protection 的生产环境设置；参见[官方访问保护说明](https://vercel.com/docs/deployment-protection)。公开页面不需要同时公开 GitHub 源码。

实际仓库和已验证公网地址将在发布完成后补入 README；构建成功或获得一个预览链接都不等于已经完成公开访问验收。

## 上线后核对

- 首页能加载 22 张牌并左右往复；点击鼠标/手势入口后自动运动停止。
- 桌面和手机上，钟面、徽章、人物与卡牌保持空隙，操作区不遮主卡。
- 不开摄像头也能完成三张抽牌、结果阅读与 PNG 保存。
- 手势入口经授权后进入等待手掌；查看网络面板，模型与 WASM 请求来自本站 `/mediapipe/`，不应是登录页或 404 页面。
- HTTPS 下检查真人张掌选牌、食指确认、握拳收拢和剪刀手；切换轻量与减少动态后，页面仍能完成流程。
- 查看控制台和资源请求。MediaPipe 初始化提示需结合页面状态判断；应用异常、模型缺失或卡画加载失败不能忽略。

本地视口模拟与自动测试不替代公网设备、摄像头及真人操作验证。

## 干净源码包范围

提交应用源码、公开说明、最终截图、`public/art/` 实际资源和锁文件。`public/mediapipe/` 是构建生成物，由准备脚本重建后进入网站部署输出，不手动提交源码历史。

不要打包 `node_modules/`、`dist/`、`dist-vercel/`、`.vercel-build/`、`output/`、回退 `.bak`、缓存、`.vercel/`、`.openai/`、`.codex/`、`.agents/`、`.env*` 或凭据。旧版图片仍保留，不因整理源码包擅自删除。

公开文档清单是 `README.md`、本文件、`docs/ASSETS.md` 与 `docs/images/` 中的两张最终截图。原本机内部验收日志与运行路径不作为新仓库的说明材料。`.gitignore` 只影响未跟踪文件；若从已有 Git 历史迁移，仍需检查实际待提交清单，避免把已跟踪的缓存或内部记录带入新仓库。
