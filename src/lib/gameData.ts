import type { TaskConfig } from '../types';

export const TASK_CONFIGS: TaskConfig[] = [
  {
    type: 'early_bird',
    label: '早鸟打卡',
    icon: '🌅',
    reward: 2,
    penalty: -3,
    description: '8:00前发送早安消息',
    condition: '8:00前完成',
  },
  {
    type: 'study_hours',
    label: '每日学习',
    icon: '📖',
    reward: 6,
    penalty: -8,
    description: '有效学习≥6h，超1h+1小豆',
    condition: '3-5h：+2小豆 | <3h：-8小豆',
  },
  {
    type: 'module_check',
    label: '模块打卡',
    icon: '✅',
    reward: 5,
    penalty: -3,
    description: '完成当日计划（教综/学科/刷题）',
  },
  {
    type: 'healthy_sleep',
    label: '健康作息',
    icon: '😴',
    reward: 2,
    penalty: -3,
    description: '23:30前睡觉并发送晚安',
  },
  {
    type: 'exercise',
    label: '运动健身',
    icon: '🏃',
    reward: 5,
    penalty: 0,
    description: '运动30min+，+1次转盘',
    condition: '额外+1次转盘机会',
  },
  {
    type: 'weekly_review',
    label: '周总结',
    icon: '📝',
    reward: 10,
    penalty: 0,
    description: '周日复盘，达标率≥80%+3次转盘',
    condition: '额外+3次转盘机会',
  },
];

// 小豆兑换区
export const SMALL_BEAN_SHOP = [
  { id: 's1', name: '奶茶/咖啡一杯', price: 25, currency: 'small_bean' as const, icon: '🧋', description: 'Boss即刻兑现', category: '饮品' },
  { id: 's2', name: '奶茶（大杯）', price: 38, currency: 'small_bean' as const, icon: '🥤', description: '升级大杯，快乐加倍', category: '饮品' },
  { id: 's3', name: '小蛋糕一份', price: 45, currency: 'small_bean' as const, icon: '🍰', description: '甜蜜补给', category: '甜品' },
  { id: 's4', name: '情绪盒子', price: 5, currency: 'small_bean' as const, icon: '🎁', description: '安慰盲盒，随机惊喜', category: '精神补给' },
  { id: 's5', name: '零食大礼包', price: 68, currency: 'small_bean' as const, icon: '🍿', description: '备考能量站', category: '食品' },
  { id: 's6', name: '电影之夜', price: 10, currency: 'small_bean' as const, icon: '🎬', description: '一起看电影', category: '娱乐' },
  { id: 's7', name: '纸质书/文具', price: 38, currency: 'small_bean' as const, icon: '📚', description: '备考装备补给了', category: '学习用品' },
  { id: 's8', name: '免早起券', price: 20, currency: 'small_bean' as const, icon: '🛡️', description: '使用后当日早鸟打卡自动完成', category: '特权' },
];

// 大豆兑换区
export const BIG_BEAN_SHOP = [
  { id: 'b1', name: '甜蜜约会', price: 45, currency: 'big_bean' as const, icon: '💑', description: '专属约会一天', category: '终极奖励' },
  { id: 'b2', name: '惊喜礼物', price: 18, currency: 'big_bean' as const, icon: '🎀', description: 'Boss精心准备的惊喜', category: '终极奖励' },
  { id: 'b3', name: '免学休息日', price: 8, currency: 'big_bean' as const, icon: '🏖️', description: '合法躺平一天', category: '特权' },
  { id: 'b4', name: '一顿大餐', price: 15, currency: 'big_bean' as const, icon: '🍽️', description: '想吃啥吃啥', category: '终极奖励' },
  { id: 'b5', name: '手写情书一封', price: 35, currency: 'big_bean' as const, icon: '💌', description: 'Boss亲笔书写', category: '精神补给' },
];

// 转盘奖池
export const SPIN_PRIZES = [
  { id: 1, label: '免学半日券', icon: '🎫', type: 'card' as const, value: 1, color: '#e74c3c' },
  { id: 2, label: '+5小豆', icon: '🫘', type: 'bean_small' as const, value: 5, color: '#e2b04a' },
  { id: 3, label: '+2小豆', icon: '🫘', type: 'bean_small' as const, value: 2, color: '#6fdc6f' },
  { id: 4, label: '奶茶一杯', icon: '🧋', type: 'physical' as const, value: 0, color: '#e67e22' },
  { id: 5, label: '夸夸语音', icon: '💝', type: 'card' as const, value: 0, color: '#e91e63' },
  { id: 6, label: '再来一次', icon: '🍀', type: 'reroll' as const, value: 0, color: '#3498db' },
];

// Boss 暗号
export const BOSS_PASSWORD = 'JYZB';
