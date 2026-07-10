import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard, PixelButton } from '../components/ui/PixelComponents'
import { updateUser, getRedemptions, updateRedemptionStatus, getTasksInRange } from '../lib/supabase'
import type { Redemption, DailyTask } from '../types'

interface Props { showToast: (msg: string) => void }

export default function AdminPage({ showToast }: Props) {
  const { user, setUser, setBossMode } = useGameStore()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [weekStats, setWeekStats] = useState({ completed: 0, total: 0, beans: 0 })
  const [beanAmount, setBeanAmount] = useState('5')

  useEffect(() => {
    if (!user) return
    // 加载兑换记录
    getRedemptions(user.id).then(setRedemptions).catch(() => {})

    // 加载本周统计
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    getTasksInRange(
      user.id,
      monday.toISOString().slice(0, 10),
      sunday.toISOString().slice(0, 10)
    ).then((tasks: DailyTask[]) => {
      const completed = tasks.filter(t => t.status === 'completed').length
      const beans = tasks.reduce((sum: number, t: DailyTask) => sum + t.beans_earned, 0)
      setWeekStats({ completed, total: tasks.length, beans })
    }).catch(() => {})
  }, [user])

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
    } catch {
      showToast('操作失败')
    }
  }

  const handleDeliver = async (id: string) => {
    try {
      await updateRedemptionStatus(id, 'delivered')
      setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status: 'delivered' } : r))
      showToast('✅ 已标记为已兑现')
    } catch { showToast('操作失败') }
  }

  const weekRate = weekStats.total > 0 ? Math.round((weekStats.completed / weekStats.total) * 100) : 0

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', color: 'var(--gold)' }}>👑 Boss 后台</h2>
        <PixelButton variant="danger" size="sm" onClick={() => setBossMode(false)}>
          退出后台
        </PixelButton>
      </div>

      {/* 数据总览 */}
      <div className="admin-grid">
        <div className="admin-stat-card">
          <div className="stat-value">{user?.beans_small || 0}</div>
          <div className="stat-label">🫘 小豆余额</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-value">{user?.beans_big || 0}</div>
          <div className="stat-label">🌰 大豆余额</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-value">{weekRate}%</div>
          <div className="stat-label">📊 本周打卡率</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-value">{weekStats.beans}</div>
          <div className="stat-label">💰 本周小豆变动</div>
        </div>
      </div>

      {/* 手动调整货币 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>🪙 手动调整货币</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <input
            type="number"
            value={beanAmount}
            onChange={e => setBeanAmount(e.target.value)}
            className="pixel-input"
            style={{ width: '80px', margin: 0 }}
            min="1"
          />
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>数量</span>
        </div>
        <div className="admin-actions">
          <PixelButton size="sm" variant="success" onClick={() => handleAdjustBeans('small', 1)}>+🫘</PixelButton>
          <PixelButton size="sm" variant="danger" onClick={() => handleAdjustBeans('small', -1)}>-🫘</PixelButton>
          <PixelButton size="sm" variant="success" onClick={() => handleAdjustBeans('big', 1)}>+🌰</PixelButton>
          <PixelButton size="sm" variant="danger" onClick={() => handleAdjustBeans('big', -1)}>-🌰</PixelButton>
        </div>
      </PixelCard>

      {/* 兑换订单 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>📦 兑换订单</h3>
        {redemptions.length === 0 ? (
          <p className="empty-state" style={{ padding: '20px 0' }}>暂无兑换记录</p>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {redemptions.map(r => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
                fontSize: '12px',
              }}>
                <div>
                  <span style={{ marginRight: '8px' }}>{r.item_name}</span>
                  <span style={{ color: 'var(--gold)' }}>
                    {r.item_type === 'small_bean' ? '🫘' : '🌰'} {r.price}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '10px',
                    color: r.status === 'delivered' ? 'var(--green)' :
                           r.status === 'approved' ? 'var(--gold)' : 'var(--text-dim)',
                  }}>
                    {r.status === 'delivered' ? '已兑现' : r.status === 'approved' ? '已批准' : '待处理'}
                  </span>
                  {r.status !== 'delivered' && (
                    <button
                      className="pixel-btn success"
                      style={{ padding: '4px 8px', fontSize: '10px' }}
                      onClick={() => handleDeliver(r.id)}
                    >
                      兑现
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PixelCard>

      {/* 本周任务详情 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '4px' }}>📋 本周统计</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          完成任务：{weekStats.completed}/{weekStats.total} · 达标率：{weekRate}%
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          小豆变动：{weekStats.beans >= 0 ? '+' : ''}{weekStats.beans}
        </p>
      </PixelCard>
    </div>
  )
}
