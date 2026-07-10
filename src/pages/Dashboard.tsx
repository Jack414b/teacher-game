import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../stores/gameStore'
import { CurrencyDisplay, PixelCard, RpgProgress } from '../components/ui/PixelComponents'
import { TASK_CONFIGS } from '../lib/gameData'
import { getTodayTasks } from '../lib/supabase'
import { useEffect, useState } from 'react'
import type { DailyTask } from '../types'

interface Props { showToast: (msg: string) => void }

export default function Dashboard(_props: Props) {
  const navigate = useNavigate()
  const { user } = useGameStore()
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([])

  useEffect(() => {
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    getTodayTasks(user.id, today).then(setTodayTasks).catch(() => {})
  }, [user])

  const completedCount = todayTasks.filter(t => t.status === 'completed').length
  const totalTasks = TASK_CONFIGS.filter(t => t.type !== 'weekly_review').length
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  if (!user) return <div className="page-content"><p className="empty-state">加载中...</p></div>

  return (
    <div className="page-content">
      {/* 角色信息 */}
      <PixelCard gold>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>🧑‍🏫</div>
          <div>
            <h2 style={{ color: 'var(--gold)', fontSize: '18px', margin: '0 0 4px' }}>
              {user.nickname}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Lv.1 预备教师 · 考编之路
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '10px', color: 'var(--text-dim)' }}>
              <span>🛡️ {user.cards?.['免早起卡'] || 0} 免早起</span>
              <span>💤 {user.cards?.['休息卡'] || 0} 休息</span>
              <span>🏖️ {user.cards?.['免学休息日'] || 0} 免学</span>
            </div>
          </div>
        </div>
      </PixelCard>

      {/* 货币 */}
      <CurrencyDisplay
        smallBeans={user.beans_small}
        bigBeans={user.beans_big}
        spinChances={user.spin_chances}
      />

      {/* 今日进度 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>
          📊 今日闯关进度
        </h3>
        <RpgProgress
          value={progressPct}
          label={`${completedCount}/${totalTasks} 任务完成`}
          variant={progressPct >= 80 ? 'gold' : 'green'}
        />
        <div style={{ marginTop: '12px' }}>
          {TASK_CONFIGS.filter(t => t.type !== 'weekly_review').map(task => {
            const record = todayTasks.find(t => t.task_type === task.type)
            const done = record?.status === 'completed'
            const failed = record?.status === 'failed'
            return (
              <div key={task.type} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 0', fontSize: '12px',
                color: done ? 'var(--green)' : failed ? 'var(--red)' : 'var(--text-dim)',
              }}>
                <span>{done ? '✅' : failed ? '❌' : '⬜'}</span>
                <span>{task.icon}</span>
                <span style={{ flex: 1 }}>{task.label}</span>
                <span style={{ fontSize: '10px' }}>
                  {done ? `+${task.reward}` : failed ? `${task.penalty}` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </PixelCard>

      {/* 本周统计 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '4px' }}>🎯 快速操作</h3>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button className="pixel-btn primary sm" onClick={() => navigate('/tasks')}>
            📋 去打卡
          </button>
          <button className="pixel-btn sm" onClick={() => navigate('/spin')}>
            🎰 去抽奖 ({user.spin_chances}次)
          </button>
          <button className="pixel-btn sm" onClick={() => navigate('/shop')}>
            🛒 去兑换
          </button>
        </div>
      </PixelCard>

      {/* RPG 风格提示 */}
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <p className="pixel-text sm" style={{ color: 'var(--text-dim)', textShadow: 'none' }}>
          💡 提示：双击标题或点右上角🔑进入Boss模式
        </p>
      </div>
    </div>
  )
}
