# 📚 教师编制闯关大挑战

像素 RPG 风格的备考游戏化 Web App。把教师编制备考变成一场闯关冒险，通过完成每日任务获取虚拟货币（小豆🫘/大豆🌰），兑换真实奖励。支持 Boss 后台模式，男友可随时查看进度、发放补贴。

---

## 🎮 功能一览

| 模块 | 说明 |
|------|------|
| 🏠 主页仪表盘 | 角色信息、货币余额、今日进度条、快捷入口 |
| 📋 每日打卡 | 6 项备考任务、日历热力图、周日双倍加成 |
| 🎰 幸运转盘 | Canvas 像素动画转盘、6 种奖品 |
| 🛒 兑换商城 | 小豆区（奶茶/零食/情书…）+ 大豆区（约会/大餐/按摩…） |
| 👑 Boss 后台 | 双击标题或点🔑输入暗号 `JYZB` 进入，查看数据、手动发补贴 |
| ⚙️ 设置 | 修改昵称、数据导出/导入备份、游戏规则速查、新手礼包激活 |

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- 包管理器 npm（Node.js 自带）

### 1. 克隆项目

```bash
git clone https://github.com/Jack414b/teacher-game.git
cd teacher-game
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 `http://localhost:5173` 即可看到游戏界面。

### 4. （可选）配置 Supabase 云同步

不配置也能用，数据存在浏览器本地。配置后数据云端同步，Boss 可跨设备查看。

1. 注册 [Supabase](https://supabase.com) → 创建项目
2. 在 SQL Editor 中执行 `supabase-schema.sql`
3. 创建 `.env` 文件（复制 `.env.example`）：

```env
VITE_SUPABASE_URL=https://你的项目ID.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon key
```

---

## 📱 部署到生产环境

### Cloudflare Pages（推荐，国内可访问）

```bash
# 登录（首次）
npx wrangler login

# 创建项目
npx wrangler pages project create teacher-game

# 构建并部署
npm run build
npx wrangler pages deploy dist --project-name teacher-game
```

部署后在 Cloudflare 后台 → Settings → Environment Variables 添加：

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | 你的 Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase anon key |

### Vercel（备选）

```bash
npx vercel --prod
```

---

## 🎯 游戏规则

### 每日任务

| 任务 | 奖励 | 惩罚 |
|------|------|------|
| 🌅 早鸟打卡（8:00前） | +2 小豆 | -3 小豆 |
| 📖 每日学习（≥6h） | +6 小豆 | <3h：-8 小豆 |
| ✅ 模块打卡 | +5 小豆 | -3 小豆 |
| 😴 健康作息（23:30前） | +2 小豆 | -3 小豆 |
| 🏃 运动健身（30min+） | +5 小豆 +1转盘 | — |
| 📝 周总结（周日） | +10 小豆 +3转盘 | — |

- 周日所有奖励 ×2（休息日，若学习则双倍）
- 持续 3-5h 学习：+2 小豆

### Boss 后台

- **进入方式**：双击页面标题，或点右上角 🔑 图标
- **暗号**：`JYZB`
- **功能**：查看数据总览、手动加减货币、处理兑换订单

### 兑换商城

- 🫘 小豆区：奶茶、蛋糕、零食包、情书、文具等日常补给
- 🌰 大豆区：约会、大餐、休息日、按摩服务等终极奖励

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
├── components/ui/       # 像素风 UI 组件
├── lib/
│   ├── supabase.ts      # 数据库 API 封装
│   └── gameData.ts      # 游戏配置（任务/商城/转盘）
├── stores/              # Zustand 状态管理
├── types/               # TypeScript 类型
├── pages/
│   ├── Dashboard.tsx    # 主页仪表盘
│   ├── TasksPage.tsx    # 每日打卡
│   ├── SpinPage.tsx     # 幸运转盘
│   ├── ShopPage.tsx     # 兑换商城
│   ├── AdminPage.tsx    # Boss 后台
│   └── SettingsPage.tsx # 设置
└── App.tsx              # 路由 + Boss 入口
```

---

## 📄 许可

MIT License — 随意使用和修改。

---

Made with ❤️ by [Jack414b](https://github.com/Jack414b)
