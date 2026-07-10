# 📚 教师编制闯关大挑战

像素 RPG 风格的备考游戏化 Web App，灵感来自星露谷物语。通过完成每日备考任务获取虚拟货币（小豆🫘/大豆🌰），兑换真实奖励。支持 Boss 后台模式，男友可随时查看进度、管理商城、调整规则。

唯一玩家账号设计，所有设备自动同步同一份数据。

---

## 🎮 功能一览

| 模块 | 说明 |
|------|------|
| 🏠 主页仪表盘 | 经验等级、头衔系统、货币余额、今日进度、特权卡展示 |
| 📋 每日打卡 | 6 项备考任务可取消、学习时长时间输入、过期任务自动失败 |
| 📅 月历 | 标准月视图，点击日期查看当天任务详情，颜色显示完成率 |
| 🛒 商城 | 内置转盘抽奖、小豆/大豆双货币兑换、自定义商品支持 |
| 🎒 背包 | 特权卡一键使用（自动完成对应打卡+得豆）、待兑现奖励 |
| 👑 Boss 后台 | 总览/活动记录/规则编辑/商城管理，可调整货币和特权卡 |
| ⚙️ 设置 | 自选每周休息日、改昵称、数据导出导入备份 |
| 🐰 像素宠物 | 灰兔「土土」在导航栏自动行走 |

---

## 🎯 游戏规则

### 每日任务

| 任务 | 奖励 | 惩罚 |
|------|------|------|
| 🌅 早鸟打卡 | +2 小豆 | -3 小豆 |
| 📖 每日学习（≥6h） | 每小时 +1 小豆 | <3h：-8 小豆 |
| ✅ 模块打卡 | +5 小豆 | -3 小豆 |
| 😴 健康作息 | +2 小豆 | -3 小豆 |
| 🏃 运动健身 | +5 小豆 | — |
| 📝 周总结（休息日） | +10 小豆 +1 次转盘 | — |

- 休息日双倍加成（设置页自选周几）
- 学习 3-5h：+2 小豆
- 过期未打卡任务自动失败并扣豆

### 转盘奖池

| 奖项 | 概率 |
|------|:--:|
| 🛡️ 免早起券 | 25% |
| 🍀 再来一次 | 25% |
| 😅 谢谢惠顾 | 25% |
| 🌰 +3 大豆 | 15% |
| 🌰 +10 大豆 | 5% |
| 🍽️ 一顿大餐 | 5% |

### 等级系统

- 经验值 = 每日净增小豆数（每天结算一次）
- 满级 100 级，约 2 个月可达
- 每 20 级换头衔：预备教师 → 初级教师 → 中级教师 → 高级教师 → 精英教师

### 特权卡

| 卡片 | 效果 |
|------|------|
| 🛡️ 免早起券 | 自动完成今日早鸟打卡 |
| 🏖️ 免学休息日 | 自动完成今日全部 5 项打卡 |
| 🎫 免学半日券 | 自动完成学习+模块两项打卡 |

来源：小豆商城购买 / 转盘抽奖

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- npm（Node.js 自带）

### 本地运行

```bash
git clone https://github.com/Jack414b/teacher-game.git
cd teacher-game
npm install
npm run dev
```

打开 `http://localhost:5173`

### 配置 Supabase（云同步）

不配置也能用，数据存浏览器本地。配置后多设备自动同步。

1. 注册 [Supabase](https://supabase.com) → 创建项目
2. SQL Editor 中执行 `supabase-schema.sql`（含所有建表语句）
3. 创建 `.env` 文件：

```env
VITE_SUPABASE_URL=https://你的项目ID.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon key
```

4. 重启 `npm run dev`

### 部署到 Cloudflare Pages

```bash
npx wrangler login
npx wrangler pages project create teacher-game
npm run build
npx wrangler pages deploy dist --project-name teacher-game
```

部署后在 Cloudflare 后台配 Environment Variables（同上）。

### Boss 后台

- 进入：点右上角 🔑 或双击标题 → 输入暗号 `JYZB`
- Boss 导航栏：主页、后台、日历、商城、设置
- 后台功能：总览/活动记录/规则编辑/商城管理/卡片调整

---

## 🛠️ 技术栈

| 层 | 技术 |
|---|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 状态管理 | Zustand |
| 路由 | React Router v6 |
| 云数据库 | Supabase |
| 部署 | Cloudflare Pages |
| 风格 | 像素 RPG（纯 CSS） |

---

## 📁 项目结构

```
src/
├── components/ui/
│   ├── PixelComponents.tsx   # 像素风 UI 组件库
│   ├── PixelPet.tsx          # 像素宠物兔子「土土」
│   └── UsagiAvatar.tsx       # 主页头像
├── lib/
│   ├── supabase.ts           # 数据库 API 封装
│   └── gameData.ts           # 游戏配置（任务/商城/转盘/等级）
├── stores/gameStore.ts       # Zustand 全局状态
├── types/index.ts            # TypeScript 类型定义
├── pages/
│   ├── Dashboard.tsx         # 主页仪表盘
│   ├── TasksPage.tsx         # 每日打卡
│   ├── CalendarPage.tsx      # 月历视图
│   ├── ShopPage.tsx          # 商城 + 转盘
│   ├── BackpackPage.tsx      # 背包（特权卡 + 待兑现）
│   ├── AdminPage.tsx         # Boss 后台
│   └── SettingsPage.tsx      # 设置
└── App.tsx                   # 路由 + 入口
```

---

## 📄 许可

MIT License

---

Made with ❤️ by [Jack414b](https://github.com/Jack414b) | 哈基慧考编加油 🍀
