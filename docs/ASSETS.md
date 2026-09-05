# 资源与校验

## 运行图片

彩色牌面与装饰图像由 AI 辅助制作。当前牌面是 22 幅独立的 1024×1536 彩色哥特画作；牌背、十二宫浮雕图集和人物正背面各有独立用途。下面是本轮发布准备时从实际文件计算的干净清单，不依赖内部生成日志。

| 路径 | 用途 |
| --- | --- |
| `public/art/major-arcana-color/<card-id>.webp` | 22 张当前彩色正面，与 `src/data/cards.ts` 一一对应 |
| `public/art/card-back.png` | 统一牌背 |
| `public/art/zodiac-medallions.webp` | 十二枚各不相同的星座浮雕，按独立区域裁切，不是同图换字 |
| `public/art/fate-theatre/goddess.webp`、`goddess-back.webp` | 命运女神正背图像，用于闭合有厚度浅浮雕 |
| `public/art/fate-theatre/angel.webp`、`angel-back.webp` | 左侧天使正背图像 |
| `public/art/fate-theatre/devil.webp`、`devil-back.webp` | 右侧恶魔正背图像 |

旧版 `public/art/major-arcana/` 及其他历史图片保留，不再作为当前彩色牌面使用。它们不是新的功能入口。人物不是完整圆雕模型，不应将浅浮雕的纹理、轮廓和厚度描述成全角度雕塑扫描。

## 手势模型与 WASM

运行资源由 `scripts/prepare-assets.mjs` 自动准备，保存到生成目录 `public/mediapipe/`，不存入源码历史。首次准备需要连接官方模型下载地址，后续文件校验通过时复用本地缓存。

- WASM：从锁定的 `@mediapipe/tasks-vision` **0.10.34** 安装包的 `wasm/` 目录复制。
- 模型：Google MediaPipe Gesture Recognizer，`float16/1/gesture_recognizer.task`。
- [官方模型下载](https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task)
- [官方 Gesture Recognizer 说明](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer)

模型固定 SHA-256：

```text
97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482
```

手动重建与独立验证：

```sh
pnpm prepare:assets
node --input-type=module -e "import{readFileSync}from'node:fs';import{createHash}from'node:crypto';const actual=createHash('sha256').update(readFileSync('public/mediapipe/gesture_recognizer.task')).digest('hex');console.log(actual);if(actual!=='97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482')process.exit(1)"
```

下载失败时检查构建环境是否能访问 Google 官方存储，再重跑准备命令；不要跳过 checksum 或随意替换成未知来源模型。`dev`、`build` 与 Vercel 构建会包含准备步骤。站点部署后，浏览器从同源 `/mediapipe/` 加载资源，不需要在运行时连接外部模型站点，也不向服务器上传摄像头帧。

## 第三方来源与许可

`@mediapipe/tasks-vision` 0.10.34 的包元数据标明 Apache-2.0，MediaPipe 源码的许可见[上游 LICENSE](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE)。模型由 Google 官方发布，其详情及 model card 入口见上面的官方说明。代码包、模型、文档和本项目图像是不同资源；保留各自的许可、版权和归属信息，不将文档页的许可自动套用到所有模型与图片，也不宣称本项目拥有第三方模型。

本仓库未指定开源许可证。依赖按锁文件安装，并保留上游包自带的许可文件。

## 图片 SHA-256 清单

路径相对于仓库根目录，大小单位为字节。图片如有替换，应重新计算本表。

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
| `public/art/major-arcana-color/chariot.webp` | 558318 | `57e553a2dbb9c6347c3faf9cadb580634084f74e9c627c1aa45008a57e78fdaf` |
| `public/art/major-arcana-color/death.webp` | 524480 | `2fe604adbbe74ea2ec4e620af33ef6b4449e28dbaf7dd6c5dbd751c8d9343fb0` |
| `public/art/major-arcana-color/devil.webp` | 479012 | `06797e4d3b4ffcc791aa0bb32bc7b07e48d91be5d93d535ce386579926b5072a` |
| `public/art/major-arcana-color/emperor.webp` | 531660 | `7bb5e6deb465fd03d4429d150396f60eb3a232a8a3bf83a4b10ee27afc3273d2` |
| `public/art/major-arcana-color/empress.webp` | 576494 | `75edfd6bdc87f892010be4456f1a358b9a14ec5c3615936738880fe80e18bad8` |
| `public/art/major-arcana-color/fool.webp` | 511360 | `b5ee7d940738be83b5415e94641f7a0c757af203c0cacb043e59eb93157d1592` |
| `public/art/major-arcana-color/hanged.webp` | 467188 | `4d2f659062ed525339f0f1b546ee757e96a1f70026995262538ddebf68cfa9c2` |
| `public/art/major-arcana-color/hermit.webp` | 476592 | `1102106038ef2583992202b5bff2a6fa00191d8c29f32c2faf1b20dd2c4da0e6` |
| `public/art/major-arcana-color/hierophant.webp` | 609084 | `dc7c9fd075eec29fcac18f14ae696b9fbfbb263374dc15b4b2166690d634e213` |
| `public/art/major-arcana-color/judgement.webp` | 612308 | `f7ecf2f47588e816fbc6ed630ff5ad988a16a3d833683ec3f8e6bd8c71795a2a` |
| `public/art/major-arcana-color/justice.webp` | 485056 | `f1aa8f250dced2281a69d36d2e07e35b4ed6186da918566f04c1249a11e38b51` |
| `public/art/major-arcana-color/lovers.webp` | 535476 | `8317182a156e23b48522bfb471de36fbcc43d3c35b843c9d08e928382fc80b58` |
| `public/art/major-arcana-color/magician.webp` | 579398 | `180c6d7f0949fcffbc65136a6bdf2b97a506b0b0310a81acaf42a23142154d8a` |
| `public/art/major-arcana-color/moon.webp` | 540682 | `ae45eab4d669ec90280ba35351474911f643fd10656720d9e6263f9a8af0e117` |
| `public/art/major-arcana-color/priestess.webp` | 579682 | `18dcdafcd65420be058913525d82309814c1c49da49abaa8ef2601b919a5c4a4` |
| `public/art/major-arcana-color/star.webp` | 578612 | `a7670cfba5fe581642d8444c2a4dbf559c11fe71460f3051c20c61be0c5d27df` |
| `public/art/major-arcana-color/strength.webp` | 516486 | `a25cf5a85004eae51e7cf4fe302344d8a91eeea40544d8a21302bcba800d8327` |
| `public/art/major-arcana-color/sun.webp` | 634446 | `9e19b5f1ff112a1fa4c0bc6fee754fce54c1450b0abfe5c78a491169d81c34c5` |
| `public/art/major-arcana-color/temperance.webp` | 510806 | `0e942add145db3a7a06deef2328e12e18005b38fc9e2ade00329f73acd216227` |
| `public/art/major-arcana-color/tower.webp` | 501764 | `cc610ea21328c5e6f143ff97ecdf76985cdfacb8029ac992dd5642cce5599198` |
| `public/art/major-arcana-color/wheel.webp` | 708306 | `8627d697c871d7686e4aea25b38abb88e0e739fc8a305306fe631cd1a4d7adfb` |
| `public/art/major-arcana-color/world.webp` | 515176 | `45e063a83afa33a9e8dd5905fe565b7d19299d8be61b2071d0cabbefe7024bf9` |
| `public/art/card-back.png` | 3036286 | `7e1d6445f1d73c5a5eef1b240aebff939d4c47835e3861331712ed38a1f5fc77` |
| `public/art/zodiac-medallions.webp` | 678084 | `7e5ca36db9c6a1a8b162d3577b4b7bf12ca2febb29f4226dd333d52a4201e125` |
| `public/art/fate-theatre/angel-back.webp` | 201484 | `ba5d79aff35a21185821010494a3f9cd70f4bcbaaffe8f1bdb44400492fe1cd1` |
| `public/art/fate-theatre/angel.webp` | 276888 | `2d3a240896e0fcefe47002733072ffeff3e88e7adc6de2f1229a912b8f65e667` |
| `public/art/fate-theatre/devil-back.webp` | 180856 | `6c6107d26edc42924cc08e76551e160785479e6775dae4395145229c13e8ebea` |
| `public/art/fate-theatre/devil.webp` | 225006 | `432ece7b0dc33f451deae408b8f15916c2108a16e87ba0f8b0333f7edf3dbee8` |
| `public/art/fate-theatre/goddess-back.webp` | 233584 | `ed9a161008a688b50f7f5e64d54be40a7cfa2fe0ec0d3b7f8d666407d098fdf4` |
| `public/art/fate-theatre/goddess.webp` | 309744 | `0f4d979d68e6444c766f27d77afce69c3da81dcbe41ed441f9eb3b254b891db3` |
