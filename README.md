# Clothes Choosing

一个以衣柜为中心的日常穿搭助手。用户可以上传衣服照片或文字描述，让视觉模型生成可编辑的标签；应用结合实时天气、当天场合和喜欢的穿搭风格，从现有衣柜中生成 2-3 套推荐。

当前版本以“先穿好已有衣服”为核心，不包含购买推荐。

## 当前功能

- 通过照片或描述添加衣服
- 视觉模型自动生成衣服名称、类别、颜色、季节、天气、场合和风格标签
- 所有自动标签都可以在保存前手动修改
- 上传喜欢的穿搭图片，提取个人风格标签
- 手动选择当天场合：上课、通勤、约会、运动、休闲、正式或旅行
- 使用 Open-Meteo 获取实时天气
- 支持手动城市名或浏览器当前位置
- 先按标签和天气规则筛选，再调用模型复排候选穿搭
- 输出最多 3 套衣柜内搭配，并显示推荐理由和天气提醒
- IndexedDB 本地持久化和 JSON 导入/导出
- 可选 Supabase 邮箱 Magic Link 登录和跨浏览器同步
- 模型不可用时自动退回到规则和文本标签结果

## 技术栈

- 前端：React 19、TypeScript、Vite 6
- 本地后端：Node.js、Express
- 云端函数：Vercel Functions
- 本地存储：IndexedDB
- 云同步：Supabase Auth、Postgres/Data API、`@supabase/supabase-js`
- 天气：Open-Meteo Geocoding API 和 Forecast API
- AI：OpenAI Responses API 兼容接口，默认模型名为 `gpt-5.4`
- 测试：Vitest、jsdom
- 包管理：npm

## 本地运行

需要安装 Node.js，建议使用当前 LTS 版本。

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)。`npm run dev` 会同时启动：

- Vite 前端：`http://localhost:5173`
- Express API：`http://localhost:8787`

Vite 会把本地的 `/api` 请求代理到 Express。

## 环境变量

不要把真实密钥提交到仓库。`.env` 和 `.env.local` 已被 `.gitignore` 忽略。

| 变量 | 必需 | 用途 |
| --- | --- | --- |
| `PORT` | 否 | 本地 Express 端口，默认 `8787` |
| `WEATHER_DEFAULT_LOCATION` | 否 | 没有传入位置时的天气默认城市 |
| `MODEL_PROVIDER` | 否 | 模型提供商标识，目前仅用于配置说明 |
| `MODEL_BASE_URL` | AI 功能需要 | OpenAI Responses API 兼容地址，不包含尾部 `/v1/responses` |
| `MODEL_API_KEY` | AI 功能需要 | 仅在服务端使用的模型 API Key |
| `MODEL_NAME` | 否 | 模型名，默认 `gpt-5.4` |
| `VITE_SUPABASE_URL` | 云同步需要 | Supabase 项目 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 云同步需要 | 浏览器可使用的 Supabase publishable key |
| `VITE_SUPABASE_ANON_KEY` | 兼容 | 旧项目的 anon key，代码会在没有 publishable key 时使用 |

示例：

```dotenv
PORT=8787
WEATHER_DEFAULT_LOCATION=Berkeley

MODEL_PROVIDER=crs
MODEL_BASE_URL=https://example.com/openai
MODEL_NAME=gpt-5.4
MODEL_API_KEY=

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
```

前端只能使用 publishable/anon key，绝不能把 Supabase secret 或 `service_role` key 放进 `VITE_*` 变量。

## 使用流程

1. 在 `Wardrobe` 上传衣服照片或填写描述。
2. 点击 `Auto tag`，检查并修改模型生成的标签，然后保存。
3. 在 `Style Likes` 上传喜欢的穿搭，提取并保存风格标签。
4. 在 `Settings` 填写城市，或点击 `Use current location` 授权浏览器定位。
5. 在 `Today` 选择场合，获取天气并点击 `Recommend`。
6. 应用会保存当天的推荐记录。

要生成基础搭配，衣柜至少要有一件天气合适的 `top`、`bottom` 和 `shoes`。

## 云同步

Supabase 配置完成后，可以在 `Settings` 中：

1. 输入邮箱并发送登录链接。
2. 从邮件中的 Magic Link 返回应用。
3. 点击 `Sync now`，或让登录事件自动将本地数据同步到云端。

当前代码使用以下数据表：

- `clothes_wardrobe_items`
- `clothes_liked_outfits`
- `clothes_recommendation_records`
- `clothes_user_settings`

这些表必须启用 RLS，并按 `user_id = auth.uid()` 限制每位登录用户只能访问自己的记录。当前仓库还没有 Supabase migration 文件，因此从零搭建新项目时需要先补齐数据库迁移。

## API

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/health` | 检查服务、模型配置和天气提供商 |
| `GET` | `/api/weather?location=Berkeley` | 按城市查询天气 |
| `GET` | `/api/weather?lat=37.87&lon=-122.26` | 按浏览器坐标查询天气 |
| `POST` | `/api/model/tag-clothing` | 从衣服图片/描述生成标签 |
| `POST` | `/api/model/extract-style` | 从喜欢的穿搭中提取风格 |
| `POST` | `/api/model/rank-outfits` | 对规则引擎生成的候选搭配复排 |

## 测试与构建

```powershell
npm test
npm run build
npm run preview
```

当前自动测试覆盖天气过滤、偏好匹配和最多 3 套衣柜内推荐。

## Vercel 部署

仓库包含 `vercel.json`，Vercel 会使用 npm 安装依赖、运行 `npm run build`，并发布 `dist`。`api/` 下的文件会作为 Vercel Functions 提供后端接口。

在 Vercel 项目中配置与本地相同的环境变量后重新部署。模型密钥只配置为服务端环境变量，不要添加 `VITE_` 前缀。

## 当前限制

- 最终模型复排目前只收到候选 ID、规则分数、理由和上下文，尚未收到候选衣服图片，因此还不是完整的视觉复选。
- `seasonTags`、`formalityLevel`、颜色协调、配饰和连衣裙尚未真正进入组合算法。
- 图片以 Data URL 保存在记录内，适合原型，不适合大量高清图片。
- Supabase schema 尚未版本化到仓库，云同步需要外部数据库已经完成建表和 RLS。
- 暂无 Calendar、Pinterest、Telegram 和购买推荐。

更完整的架构、完成度和下一步建议见 [技术报告](docs/technical-report.md)。

