import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard, PixelModal } from '../components/ui/PixelComponents'
import { getRedemptions, upsertTask, updateUser, getTasksInRange, getSpinLogs } from '../lib/supabase'
import { getGameDay } from '../types'
import type { Redemption } from '../types'

interface Props { showToast: (msg: string) => void }

export default function BackpackPage({ showToast }: Props) {
  const { user, setUser, bumpTaskVersion } = useGameStore()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [txLog, setTxLog] = useState<Array<{time:string,text:string,type:string}>>([])
  const [confirmCard, setConfirmCard] = useState<{ key: string; label: string; icon: string; taskTypes: string[] } | null>(null)
  const [using, setUsing] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try { const r = await getRedemptions(user.id); setRedemptions(r) } catch {}
      const logs: Array<{time:string,text:string,type:string}> = []
      try {
        const start = new Date(); start.setDate(start.getDate() - 14)
        const tasks = await getTasksInRange(user.id, start.toISOString().slice(0,10), new Date().toISOString().slice(0,10))
        tasks.forEach(t => {
          const b = t.beans_earned
          if (b > 0) logs.push({time:t.task_date,text:`📋 ${t.task_type} +${b}🫘`,type:'earn'})
          if (b < 0) logs.push({time:t.task_date,text:`📋 ${t.task_type} ${b}🫘`,type:'lose'})
        })
        const spins = await getSpinLogs(user.id)
        spins.forEach((s:any) => logs.push({time:s.created_at.slice(0,10),text:`🎰 ${s.result}`,type:s.result.includes('大豆')?'earn':'spend'}))
        const reds = await getRedemptions(user.id)
        reds.forEach(r => {
          const currency = r.item_type === 'small_bean' ? '🫘' : '🌰'
          logs.push({time:r.created_at.slice(0,10),text:`🛒 ${r.item_name} -${r.price}${currency}`,type:'spend'})
        })
      } catch {}
      logs.sort((a,b) => b.time.localeCompare(a.time))
      setTxLog(logs.slice(0, 60))
    }
    load()
  }, [user])

  const cards = (user?.cards || { 免早起卡: 0, 免学休息日: 0, 免学半日券: 0 }) as unknown as Record<string, number>

  const cardDefs = [
    { key: '免早起卡', label: '免早起', icon: '🛡️', desc: '自动完成今日早鸟打卡', taskTypes: ['early_bird'] },
    { key: '免学休息日', label: '免学日', icon: '🏖️', desc: '自动完成今日全部打卡任务', taskTypes: ['early_bird', 'study_hours', 'module_check', 'healthy_sleep', 'exercise'] },
    { key: '免学半日券', label: '半日券', icon: '🎫', desc: '自动完成学习和模块两项打卡', taskTypes: ['study_hours', 'module_check'] },
  ]

  const handleUseCard = async () => {
    if (!user || !confirmCard || using) return
    setUsing(true)

    const count = cards[confirmCard.key] || 0
    if (count <= 0) { showToast('数量不足！'); setUsing(false); setConfirmCard(null); return }

    const dateStr = getGameDay()

    let totalBeans = 0
    for (const taskType of confirmCard.taskTypes) {
      try {
        await upsertTask(user.id, dateStr, taskType, 'completed', 0)
      } catch {}
    }

    // 计算小豆奖励
    const rewardMap: Record<string, number> = { early_bird: 2, study_hours: 6, module_check: 5, healthy_sleep: 2, exercise: 5 }
    for (const tt of confirmCard.taskTypes) totalBeans += rewardMap[tt] || 0

    // 休息日双倍
    const d = new Date(dateStr)
    if (d.getDay() === parseInt(localStorage.getItem('teacher_game_rest_day') || '0')) totalBeans *= 2

    const newCards = { ...user.cards, [confirmCard.key]: count - 1 } as typeof user.cards

    try {
      await updateUser(user.id, {
        cards: newCards,
        beans_small: user.beans_small + totalBeans,
      })
      setUser({ ...user, cards: newCards, beans_small: user.beans_small + totalBeans })
      bumpTaskVersion()
      showToast(`✅ 已使用${confirmCard.label}！+${totalBeans}小豆`)
    } catch {
      showToast('同步失败，请重试')
    }

    setUsing(false)
    setConfirmCard(null)
  }

  const pendingItems = redemptions.filter(r => r.status !== 'delivered')

  return (
    <div className="page-content">
      <h2 style={{ fontSize: '16px', color: 'var(--gold)', marginBottom: '12px' }}>🎒 背包</h2>

      {/* 特权卡 */}
      <h3 className="section-title">🃏 特权卡（点击使用）</h3>
      <div style={{ display: 'flex', gap: '10px' }}>
        {cardDefs.map(c => (
          <PixelCard key={c.key}>
            <div
              style={{ textAlign: 'center', flex: 1, cursor: cards[c.key] > 0 ? 'pointer' : 'default', opacity: cards[c.key] > 0 ? 1 : 0.4 }}
              onClick={() => {
                if (cards[c.key] > 0) {
                  setConfirmCard({ key: c.key, label: c.label, icon: c.icon, taskTypes: c.taskTypes })
                } else {
                  showToast(`${c.label}数量不足`)
                }
              }}
            >
              <div style={{ fontSize: '32px' }}>{c.icon}</div>
              <h4 style={{ fontSize: '11px', margin: '4px 0' }}>{c.label}</h4>
              <p style={{ fontSize: '18px', color: 'var(--gold)', fontWeight: 'bold' }}>{cards[c.key] || 0}</p>
              <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{c.desc}</p>
            </div>
          </PixelCard>
        ))}
      </div>

      {/* 确认弹窗 */}
      {confirmCard && (
        <PixelModal title={`使用 ${confirmCard.icon} ${confirmCard.label}`} onClose={() => setConfirmCard(null)}>
          <p style={{ fontSize: '14px', margin: '12px 0' }}>确认使用一张<strong>{confirmCard.label}</strong>？</p>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            将自动完成今日对应打卡任务并获得小豆奖励
          </p>
          <div className="modal-actions">
            <button className="pixel-btn" onClick={() => setConfirmCard(null)}>取消</button>
            <button className="pixel-btn primary" onClick={handleUseCard} disabled={using}>{using ? '使用中...' : '确认使用'}</button>
          </div>
        </PixelModal>
      )}

      {/* 收支明细 */}
      <h3 className="section-title" style={{ marginTop: '20px' }}>💰 收支明细</h3>
      <div style={{ display:'flex',gap:'12px',marginBottom:'8px',fontSize:'11px',color:'var(--text-dim)' }}>
        <span>🫘 {user?.beans_small || 0} 小豆</span>
        <span>🌰 {user?.beans_big || 0} 大豆</span>
      </div>
      {txLog.length === 0 ? (
        <p className="empty-state" style={{ padding: '12px 0' }}>暂无记录</p>
      ) : (
        txLog.map((item, i) => (
          <div key={i} style={{
            display:'flex',justifyContent:'space-between',padding:'6px 10px',margin:'1px 0',
            background:'var(--bg-card)',border:'1px solid var(--border)',fontSize:'11px',
          }}>
            <span>{item.text}</span>
            <span style={{color:'var(--text-dim)',fontSize:'10px'}}>{item.time}</span>
          </div>
        ))
      )}

      {/* 待兑现 */}
      <h3 className="section-title" style={{ marginTop: '20px' }}>📦 待兑现</h3>
      {pendingItems.length === 0 ? (
        <p className="empty-state" style={{ padding: '20px 0' }}>暂无待兑现的奖励</p>
      ) : (
        pendingItems.map(r => (
          <PixelCard key={r.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '13px' }}>{r.item_name}</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {r.item_type === 'small_bean' ? '🫘' : '🌰'} {r.price} · {new Date(r.created_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <span style={{ fontSize: '10px', padding: '4px 8px', border: '1px solid var(--gold)', color: 'var(--gold)' }}>待Boss兑现</span>
            </div>
          </PixelCard>
        ))
      )}
    </div>
  )
}
