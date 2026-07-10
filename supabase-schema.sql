-- 教师编制闯关大挑战 - Supabase 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL DEFAULT 'XX酱',
  beans_small INTEGER NOT NULL DEFAULT 30,
  beans_big INTEGER NOT NULL DEFAULT 0,
  spin_chances INTEGER NOT NULL DEFAULT 2,
  cards JSONB NOT NULL DEFAULT '{"免早起卡": 1, "休息卡": 1, "免学休息日": 0}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 每日打卡记录表
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_date DATE NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  detail JSONB,
  beans_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_date, task_type)
);

-- 兑换记录表
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 自定义任务规则表（Boss 可调整）
CREATE TABLE IF NOT EXISTS custom_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  reward INTEGER NOT NULL,
  penalty INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_type)
);

-- 自定义商城商品表（Boss 可管理）
CREATE TABLE IF NOT EXISTS custom_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'small_bean',
  icon TEXT NOT NULL DEFAULT '🎁',
  category TEXT NOT NULL DEFAULT '自定义',
  description TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 转盘记录表
CREATE TABLE IF NOT EXISTS spin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_logs_user ON spin_logs(user_id);

-- 开启 RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略（允许所有操作，因为是单用户应用 + Boss 共享）
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on daily_tasks" ON daily_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on redemptions" ON redemptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on spin_logs" ON spin_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on custom_rules" ON custom_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on custom_shop_items" ON custom_shop_items FOR ALL USING (true) WITH CHECK (true);
