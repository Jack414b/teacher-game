import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard, PixelButton, PixelModal } from '../components/ui/PixelComponents'
import { TASK_CONFIGS, SMALL_BEAN_SHOP, BIG_BEAN_SHOP } from '../lib/gameData'
import {
  updateUser, getRedemptions, updateRedemptionStatus, getTasksInRange,
  getCustomRules, upsertCustomRule, getAllCustomShopItems,
  upsertCustomShopItem, updateCustomShopItem, deleteCustomShopItem,
} from '../lib/supabase'
import type { Redemption, DailyTask, CustomRule, CustomShopItem } from '../types'

interface Props { showToast: (msg: string) => void }

export default function AdminPage({ showToast }: Props) {
  const { user, setUser, setBossMode } = useGameStore()
  const [tab, setTab] = useState<'overview' | 'rules' | 'shop'>('overview')
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [weekStats, setWeekStats] = useState({ completed: 0, total: 0, beans: 0 })
  const [beanAmount, setBeanAmount] = useState('5')

  // 规则编辑
  const [customRules, setCustomRules] = useState<CustomRule[]>([])
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [editReward, setEditReward] = useState('')
  const [editPenalty, setEditPenalty] = useState('')

  // 商城管理
  const [shopItems, setShopItems] = useState<CustomShopItem[]>([])
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', price: '10', currency: 'small_bean' as 'small_bean' | 'big_bean', icon: '🎁', category: '自定义', description: '' })
  const [editingShopItem, setEditingShopItem] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')

  useEffect(() => {
    if (!user) return
    // 加载兑换记录
    getRedemptions(user.id).then(setRedemptions).catch(() => {})
    // 加载本周统计
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now); monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
    getTasksInRange(user.id, monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10))
      .then((tasks: DailyTask[]) => {
        const completed = tasks.filter(t => t.status === 'completed').length
        const beans = tasks.reduce((sum: number, t: DailyTask) => sum + t.beans_earned, 0)
        setWeekStats({ completed, total: tasks.length, beans })
      }).catch(() => {})
    // 加载自定义规则
    getCustomRules(user.id).then(setCustomRules).catch(() => {})
    // 加载全部商城物品
    getAllCustomShopItems(user.id).then(setShopItems).catch(() => {})
  }, [user])

  // === 货币调整 ===
  const handleAdjustBeans = async (type: 'small' | 'big', amount: number) => {
    if (!user) return
    const num = parseInt(beanAmount) || 0
    const actual = amount * num
    try {
      if (type === 'small') {
        const updated = await updateUser(user.id, { beans_small: Math.max(0, user.beans_small + actual) })
        setUser(updated)
      } else {
        const updated = await updateUser(user.id, { beans_big: Math.max(0, user.beans_big + actual) })
        setUser(updated)
      }
      showToast(`✅ ${actual > 0 ? '+' : ''}${actual}${type === 'small' ? '小豆' : '大豆'}`)
    } catch { showToast('操作失败') }
  }

  const handleDeliver = async (id: string) => {
    try {
      await updateRedemptionStatus(id, 'delivered')
      setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status: 'delivered' } : r))
      showToast('✅ 已标记为已兑现')
    } catch { showToast('操作失败') }
  }

  // === 规则编辑 ===
  const getRuleValue = (taskType: string, field: 'reward' | 'penalty') => {
    const custom = customRules.find(r => r.task_type === taskType)
    if (custom) return custom[field]
    const def = TASK_CONFIGS.find(t => t.type === taskType)
    return def ? def[field] : 0
  }

  const startEditRule = (taskType: string) => {
    setEditingRule(taskType)
    setEditReward(String(getRuleValue(taskType, 'reward')))
    setEditPenalty(String(getRuleValue(taskType, 'penalty')))
  }

  const saveRule = async (taskType: string) => {
    if (!user) return
    const reward = parseInt(editReward) || 0
    const penalty = parseInt(editPenalty) || 0
    try {
      await upsertCustomRule(user.id, taskType, reward, penalty)
      setCustomRules(prev => {
        const filtered = prev.filter(r => r.task_type !== taskType)
        return [...filtered, { task_type: taskType as CustomRule['task_type'], reward, penalty }]
      })
      setEditingRule(null)
      showToast('✅ 规则已保存')
    } catch { showToast('保存失败') }
  }

  const resetRule = (taskType: string) => {
    setCustomRules(prev => prev.filter(r => r.task_type !== taskType))
    showToast('✅ 已恢复默认')
  }

  // === 商城管理 ===
  const handleAddItem = async () => {
    if (!user || !newItem.name.trim()) return
    try {
      const item = await upsertCustomShopItem(user.id, {
        name: newItem.name.trim(),
        price: parseInt(newItem.price) || 0,
        currency: newItem.currency,
        icon: newItem.icon,
        category: newItem.category,
        description: newItem.description,
        active: true,
      })
      setShopItems(prev => [...prev, item])
      setShowAddItem(false)
      setNewItem({ name: '', price: '10', currency: 'small_bean', icon: '🎁', category: '自定义', description: '' })
      showToast('✅ 商品已上架')
    } catch { showToast('操作失败') }
  }

  const toggleItem = async (item: CustomShopItem) => {
    try {
      await updateCustomShopItem(item.id!, { active: !item.active })
      setShopItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
      showToast(item.active ? '📴 已下架' : '📦 已上架')
    } catch { showToast('操作失败') }
  }

  const updatePrice = async (item: CustomShopItem) => {
    const newPrice = parseInt(editPrice) || 0
    try {
      await updateCustomShopItem(item.id!, { price: newPrice })
      setShopItems(prev => prev.map(i => i.id === item.id ? { ...i, price: newPrice } : i))
      setEditingShopItem(null)
      showToast('✅ 价格已更新')
    } catch { showToast('操作失败') }
  }

  const deleteItem = async (item: CustomShopItem) => {
    try {
      await deleteCustomShopItem(item.id!)
      setShopItems(prev => prev.filter(i => i.id !== item.id))
      showToast('🗑️ 已删除')
    } catch { showToast('操作失败') }
  }

  const weekRate = weekStats.total > 0 ? Math.round((weekStats.completed / weekStats.total) * 100) : 0

  // 合并默认商品 + 自定义商品（用于预览）
  const defaultItems = [
    ...SMALL_BEAN_SHOP.map(i => ({ ...i, id: i.id, active: true, user_id: '', name: i.name, price: i.price, currency: i.currency, icon: i.icon, category: i.category, description: i.description })),
    ...BIG_BEAN_SHOP.map(i => ({ ...i, id: i.id, active: true, user_id: '', name: i.name, price: i.price, currency: i.currency, icon: i.icon, category: i.category, description: i.description })),
  ]

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', color: 'var(--gold)' }}>👑 Boss 后台</h2>
        <PixelButton variant="danger" size="sm" onClick={() => setBossMode(false)}>退出后台</PixelButton>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {[
          { key: 'overview' as const, label: '📊 总览' },
          { key: 'rules' as const, label: '📋 规则' },
          { key: 'shop' as const, label: '🛒 商城' },
        ].map(t => (
          <button key={t.key}
            className={`pixel-btn sm ${tab === t.key ? 'primary' : ''}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {/* ===== 总览 Tab ===== */}
      {tab === 'overview' && (
        <>
          <div className="admin-grid">
            <div className="admin-stat-card"><div className="stat-value">{user?.beans_small || 0}</div><div className="stat-label">🫘 小豆余额</div></div>
            <div className="admin-stat-card"><div className="stat-value">{user?.beans_big || 0}</div><div className="stat-label">🌰 大豆余额</div></div>
            <div className="admin-stat-card"><div className="stat-value">{weekRate}%</div><div className="stat-label">📊 本周打卡率</div></div>
            <div className="admin-stat-card"><div className="stat-value">{weekStats.beans}</div><div className="stat-label">💰 本周小豆变动</div></div>
          </div>

          <PixelCard>
            <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>🪙 手动调整货币</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input type="number" value={beanAmount} onChange={e => setBeanAmount(e.target.value)}
                className="pixel-input" style={{ width: '80px', margin: 0 }} min="1" />
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>数量</span>
            </div>
            <div className="admin-actions">
              <PixelButton size="sm" variant="success" onClick={() => handleAdjustBeans('small', 1)}>+🫘</PixelButton>
              <PixelButton size="sm" variant="danger" onClick={() => handleAdjustBeans('small', -1)}>-🫘</PixelButton>
              <PixelButton size="sm" variant="success" onClick={() => handleAdjustBeans('big', 1)}>+🌰</PixelButton>
              <PixelButton size="sm" variant="danger" onClick={() => handleAdjustBeans('big', -1)}>-🌰</PixelButton>
            </div>
          </PixelCard>

          <PixelCard>
            <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>📦 兑换订单</h3>
            {redemptions.length === 0 ? (
              <p className="empty-state" style={{ padding: '20px 0' }}>暂无兑换记录</p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {redemptions.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                    <div>
                      <span style={{ marginRight: '8px' }}>{r.item_name}</span>
                      <span style={{ color: 'var(--gold)' }}>{r.item_type === 'small_bean' ? '🫘' : '🌰'} {r.price}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: r.status === 'delivered' ? 'var(--green)' : r.status === 'approved' ? 'var(--gold)' : 'var(--text-dim)' }}>
                        {r.status === 'delivered' ? '已兑现' : r.status === 'approved' ? '已批准' : '待处理'}
                      </span>
                      {r.status !== 'delivered' && (
                        <button className="pixel-btn success" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => handleDeliver(r.id)}>兑现</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PixelCard>
        </>
      )}

      {/* ===== 规则 Tab ===== */}
      {tab === 'rules' && (
        <>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
            💡 修改后的规则会覆盖游戏默认值。点「恢复默认」可还原。
          </p>
          {TASK_CONFIGS.map(config => {
            const isEditing = editingRule === config.type
            const currentReward = getRuleValue(config.type, 'reward')
            const currentPenalty = getRuleValue(config.type, 'penalty')
            const isModified = customRules.some(r => r.task_type === config.type)

            return (
              <PixelCard key={config.type}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <span style={{ fontSize: '28px' }}>{config.icon}</span>
                    <div>
                      <h4 style={{ fontSize: '13px', marginBottom: '2px' }}>{config.label} {isModified && <span style={{ color: 'var(--gold)', fontSize: '10px' }}>[已自定义]</span>}</h4>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px' }}>完成+</span>
                          <input type="number" value={editReward} onChange={e => setEditReward(e.target.value)}
                            style={{ width: '56px', padding: '4px', background: 'var(--bg-dark)', border: '2px solid var(--green)', color: 'var(--green)', textAlign: 'center', fontSize: '12px' }} />
                          {config.penalty !== 0 && (
                            <>
                              <span style={{ fontSize: '11px' }}>失败</span>
                              <input type="number" value={editPenalty} onChange={e => setEditPenalty(e.target.value)}
                                style={{ width: '56px', padding: '4px', background: 'var(--bg-dark)', border: '2px solid var(--red)', color: 'var(--red)', textAlign: 'center', fontSize: '12px' }} />
                            </>
                          )}
                        </div>
                      ) : (
                        <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          <span style={{ color: 'var(--green)' }}>+{currentReward}</span>
                          {config.penalty !== 0 && <span style={{ color: 'var(--red)' }}> / {currentPenalty}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {isEditing ? (
                      <>
                        <PixelButton size="sm" variant="primary" onClick={() => saveRule(config.type)}>💾</PixelButton>
                        <PixelButton size="sm" onClick={() => setEditingRule(null)}>✖</PixelButton>
                      </>
                    ) : (
                      <PixelButton size="sm" onClick={() => startEditRule(config.type)}>✏️</PixelButton>
                    )}
                    {isModified && <PixelButton size="sm" variant="danger" onClick={() => resetRule(config.type)}>↩</PixelButton>}
                  </div>
                </div>
              </PixelCard>
            )
          })}
        </>
      )}

      {/* ===== 商城 Tab ===== */}
      {tab === 'shop' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>💡 自定义商品会出现在玩家商城页。默认商品不可编辑。</p>
            <PixelButton size="sm" variant="primary" onClick={() => setShowAddItem(true)}>+ 上新</PixelButton>
          </div>

          {/* 添加商品弹窗 */}
          {showAddItem && (
            <PixelModal title="🛒 上架新商品" onClose={() => setShowAddItem(false)}>
              <div style={{ textAlign: 'left', fontSize: '12px' }}>
                <label>名称</label>
                <input className="pixel-input" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="商品名称" style={{ margin: '4px 0 8px' }} />
                <label>图标（emoji）</label>
                <input className="pixel-input" value={newItem.icon} onChange={e => setNewItem({ ...newItem, icon: e.target.value })} placeholder="🎁" style={{ margin: '4px 0 8px', width: '80px' }} />
                <label>价格</label>
                <input type="number" className="pixel-input" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} style={{ margin: '4px 0 8px', width: '100px' }} />
                <label>货币类型</label>
                <select className="pixel-input" value={newItem.currency} onChange={e => setNewItem({ ...newItem, currency: e.target.value as 'small_bean' | 'big_bean' })}
                  style={{ margin: '4px 0 8px' }}>
                  <option value="small_bean">🫘 小豆</option>
                  <option value="big_bean">🌰 大豆</option>
                </select>
                <label>分类</label>
                <input className="pixel-input" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} placeholder="分类" style={{ margin: '4px 0 8px' }} />
                <label>描述</label>
                <input className="pixel-input" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="一句话描述" style={{ margin: '4px 0 8px' }} />
              </div>
              <div className="modal-actions">
                <button className="pixel-btn" onClick={() => setShowAddItem(false)}>取消</button>
                <button className="pixel-btn primary" onClick={handleAddItem}>上架</button>
              </div>
            </PixelModal>
          )}

          {/* 自定义商品列表 */}
          <h4 style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '12px' }}>📦 自定义商品</h4>
          {shopItems.filter(i => i.user_id !== '').length === 0 ? (
            <p className="empty-state" style={{ padding: '16px 0' }}>还没有自定义商品</p>
          ) : (
            shopItems.filter(i => i.user_id !== '').map(item => (
              <PixelCard key={item.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '28px' }}>{item.icon}</span>
                    <div>
                      <h4 style={{ fontSize: '13px', opacity: item.active ? 1 : 0.4 }}>{item.name}</h4>
                      {editingShopItem === item.id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                          <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                            style={{ width: '60px', padding: '4px', background: 'var(--bg-dark)', border: '2px solid var(--gold)', color: 'var(--gold)', textAlign: 'center', fontSize: '11px' }} />
                          <PixelButton size="sm" variant="primary" onClick={() => updatePrice(item)}>💾</PixelButton>
                          <PixelButton size="sm" onClick={() => setEditingShopItem(null)}>✖</PixelButton>
                        </div>
                      ) : (
                        <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {item.currency === 'small_bean' ? '🫘' : '🌰'} {item.price}
                          {!item.active && <span style={{ color: 'var(--red)', marginLeft: '6px' }}>[已下架]</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {editingShopItem !== item.id && (
                      <>
                        <PixelButton size="sm" onClick={() => { setEditingShopItem(item.id!); setEditPrice(String(item.price)) }}>💰</PixelButton>
                        <PixelButton size="sm" variant={item.active ? 'danger' : 'success'} onClick={() => toggleItem(item)}>
                          {item.active ? '📴' : '📦'}
                        </PixelButton>
                        <PixelButton size="sm" variant="danger" onClick={() => deleteItem(item)}>🗑️</PixelButton>
                      </>
                    )}
                  </div>
                </div>
              </PixelCard>
            ))
          )}

          {/* 默认商品预览 */}
          <h4 style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '16px' }}>📋 默认商品（不可编辑）</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', opacity: 0.6 }}>
            {defaultItems.map(item => (
              <div key={item.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px', textAlign: 'center', fontSize: '11px' }}>
                <span style={{ fontSize: '20px' }}>{item.icon}</span><br />
                <span>{item.name}</span><br />
                <span style={{ color: 'var(--gold)', fontSize: '10px' }}>{item.currency === 'small_bean' ? '🫘' : '🌰'} {item.price}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
