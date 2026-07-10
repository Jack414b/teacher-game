// ===== 用户 =====
export interface User {
  id: string;
  nickname: string;
  beans_small: number;
  beans_big: number;
  spin_chances: number;
  cards: UserCards;
  created_at: string;
}

export interface UserCards {
  免早起卡: number;
  休息卡: number;
  免学休息日: number;
}

// ===== 每日任务 =====
export type TaskType =
  | 'early_bird'     // 早鸟打卡 8:00前
  | 'study_hours'    // 学习时长 ≥6h
  | 'module_check'   // 模块打卡
  | 'healthy_sleep'  // 23:30前睡觉
  | 'exercise'       // 运动30min+
  | 'weekly_review'; // 周日复盘

export type TaskStatus = 'completed' | 'failed' | 'pending';

export interface DailyTask {
  id: string;
  user_id: string;
  task_date: string; // YYYY-MM-DD
  task_type: TaskType;
  status: TaskStatus;
  detail: Record<string, unknown> | null;
  beans_earned: number;
  created_at: string;
}

// ===== 任务配置 =====
export interface TaskConfig {
  type: TaskType;
  label: string;
  icon: string;
  reward: number;
  penalty: number;
  description: string;
  condition?: string; // 额外奖励条件
}

// ===== 商城物品 =====
export type ShopCurrency = 'small_bean' | 'big_bean';

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  currency: ShopCurrency;
  icon: string;
  description: string;
  category: string;
}

// ===== 兑换记录 =====
export interface Redemption {
  id: string;
  user_id: string;
  item_name: string;
  item_type: ShopCurrency;
  price: number;
  status: 'pending' | 'approved' | 'delivered';
  created_at: string;
}

// ===== 转盘 =====
export interface SpinPrize {
  id: number;
  label: string;
  icon: string;
  type: 'bean_small' | 'bean_big' | 'card' | 'physical' | 'reroll';
  value: number;
  color: string;
}

export interface SpinLog {
  id: string;
  user_id: string;
  result: string;
  created_at: string;
}

// ===== Boss 后台 =====
export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  beansEarned: number;
  beansLost: number;
}

// ===== 新手礼包 =====
export const STARTER_PACK = {
  beans_small: 30,
  spin_chances: 2,
  cards: { 免早起卡: 1, 休息卡: 1, 免学休息日: 0 },
} as const;
