import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 延迟初始化，避免无配置时崩溃
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // 未配置 Supabase，返回 null
  _client = createClient(url, key);
  return _client;
}

// ===== 用户 API =====
export async function getUser(userId: string) {
  const c = getClient();
  if (!c) return null;
  const { data, error } = await c.from('users').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateUser(userId: string, updates: Record<string, unknown>) {
  const c = getClient();
  if (!c) return null;
  const { data, error } = await c.from('users').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

// ===== 打卡记录 API =====
export async function getTodayTasks(userId: string, date: string) {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c.from('daily_tasks').select('*').eq('user_id', userId).eq('task_date', date);
  if (error) throw error;
  return data || [];
}

export async function getTasksInRange(userId: string, start: string, end: string) {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c.from('daily_tasks').select('*')
    .eq('user_id', userId).gte('task_date', start).lte('task_date', end)
    .order('task_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertTask(
  userId: string, taskDate: string, taskType: string,
  status: string, beansEarned: number, detail?: Record<string, unknown>
) {
  const c = getClient();
  if (!c) return { user_id: userId, task_date: taskDate, task_type: taskType, status, beans_earned: beansEarned, detail: detail || null, id: crypto.randomUUID() };
  const { data, error } = await c.from('daily_tasks').upsert(
    { user_id: userId, task_date: taskDate, task_type: taskType, status, beans_earned: beansEarned, detail: detail || null },
    { onConflict: 'user_id,task_date,task_type' }
  ).select().single();
  if (error) throw error;
  return data;
}

// ===== 兑换记录 API =====
export async function createRedemption(userId: string, itemName: string, itemType: string, price: number) {
  const c = getClient();
  if (!c) return { id: crypto.randomUUID(), user_id: userId, item_name: itemName, item_type: itemType, price, status: 'pending' };
  const { data, error } = await c.from('redemptions').insert({ user_id: userId, item_name: itemName, item_type: itemType, price, status: 'pending' }).select().single();
  if (error) throw error;
  return data;
}

export async function getRedemptions(userId: string) {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c.from('redemptions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateRedemptionStatus(id: string, status: string) {
  const c = getClient();
  if (!c) return { id, status };
  const { data, error } = await c.from('redemptions').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ===== 转盘记录 API =====
export async function syncUser(userData: Record<string, unknown>) {
  const c = getClient();
  if (!c) return null;
  const { data, error } = await c.from('users').upsert(userData).select().single();
  if (error) throw error;
  return data;
}

export async function getSpinLogs(userId: string) {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c.from('spin_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function logSpin(userId: string, result: string) {
  const c = getClient();
  if (!c) return { id: crypto.randomUUID(), user_id: userId, result };
  const { data, error } = await c.from('spin_logs').insert({ user_id: userId, result }).select().single();
  if (error) throw error;
  return data;
}

// ===== 自定义规则 API =====
export async function getCustomRules(userId: string) {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c.from('custom_rules').select('*').eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function upsertCustomRule(userId: string, taskType: string, reward: number, penalty: number) {
  const c = getClient();
  if (!c) return { user_id: userId, task_type: taskType, reward, penalty };
  const { data, error } = await c.from('custom_rules').upsert(
    { user_id: userId, task_type: taskType, reward, penalty },
    { onConflict: 'user_id,task_type' }
  ).select().single();
  if (error) throw error;
  return data;
}

// ===== 自定义商城 API =====
export async function getCustomShopItems(userId: string) {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c.from('custom_shop_items').select('*').eq('user_id', userId).eq('active', true).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function getAllCustomShopItems(userId: string) {
  const c = getClient();
  if (!c) return [];
  const { data, error } = await c.from('custom_shop_items').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function upsertCustomShopItem(userId: string, item: { name: string; price: number; currency: string; icon: string; category: string; description: string; active: boolean }) {
  const c = getClient();
  if (!c) return { id: crypto.randomUUID(), user_id: userId, ...item };
  const { data, error } = await c.from('custom_shop_items').insert({ user_id: userId, ...item }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCustomShopItem(id: string, updates: Record<string, unknown>) {
  const c = getClient();
  if (!c) return null;
  const { data, error } = await c.from('custom_shop_items').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCustomShopItem(id: string) {
  const c = getClient();
  if (!c) return null;
  const { error } = await c.from('custom_shop_items').delete().eq('id', id);
  if (error) throw error;
  return true;
}
