import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard, RpgProgress } from '../components/ui/PixelComponents'
import { TASK_CONFIGS } from '../lib/gameData'
import { getTodayTasks, getTasksInRange, upsertTask, updateUser, getCustomRules } from '../lib/supabase'
import type { DailyTask, TaskType, CustomRule } from '../types'

interface Props { showToast: (msg: string) => void }

export default function TasksPage({ showToast }: Props) {
  const { user, setUser } = useGameStore()
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(false)
  const [customRules, setCustomRules] = useState<CustomRule[]>([])
  const [studyHours, setStudyHours] = useState(6)
  const [editingStudy, setEditingStudy] = useState(false)

  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const restDay = parseInt(localStorage.getItem('teacher_game_rest_day') || '0') // 默认周日
  const isRestDay = new Date().getDay() === restDay

  useEffect(() => {
    if (!user) return
    getTodayTasks(user.id, today).then(setTasks).catch(() => {})
    getCustomRules(user.id).then(setCustomRules).catch(() => {})

    // 自动失败：昨天及之前未完成的任务
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    getTasksInRange(user.id, '2026-01-01', yesterday.toISOString().slice(0, 10)).then(oldTasks => {
      const pending = oldTasks.filter(t => t.status === 'pending')
      if (pending.length === 0) return
      let totalPenalty = 0
      Promise.all(pending.map(async t => {
        const config = TASK_CONFIGS.find(c => c.type === t.task_type)
        const penalty = config?.penalty || 0
        if (penalty < 0) {
          totalPenalty += penalty
          await upsertTask(user.id, t.task_date, t.task_type, 'failed', penalty)
        }
      })).then(() => {
        if (totalPenalty < 0) {
          updateUser(user.id, { beans_small: user.beans_small + totalPenalty }).then(u => {
            if (u) setUser(u)
          })
        }
      }).catch(() => {})
    }).catch(() => {})
  }, [user, today])

  const handleTask = async (taskType: TaskType, status: 'completed' | 'failed' | 'pending') => {
    if (!user || loading) return
    setLoading(true)

    // 如果是取消（pending），需要反向扣除之前的小豆
    const existingTask = tasks.find(t => t.task_type === taskType)
    const isUndo = status === 'pending' && existingTask && existingTask.status !== 'pending'

    let beans = 0
    let detail: Record<string, unknown> | undefined = undefined

    if (isUndo) {
      beans = -(existingTask!.beans_earned)
    } else if (status === 'completed' && taskType === 'study_hours') {
      // 学习时长：根据小时数计算
      const h = studyHours
      detail = { hours: h }
      if (h >= 6) beans = h
      else if (h >= 3) beans = 2
      else beans = -8
      if (isRestDay) beans *= 2
    } else if (status === 'failed' && taskType === 'study_hours') {
      beans = -8
    } else if (status !== 'pending') {
      const config = TASK_CONFIGS.find(t => t.type === taskType)!
      const customRule = customRules.find(r => r.task_type === taskType)
      const reward = customRule?.reward ?? config.reward
      const penalty = customRule?.penalty ?? config.penalty
      beans = status === 'completed' ? reward : penalty
      if (isRestDay && status === 'completed' && taskType !== 'weekly_review') beans *= 2
    }

    try {
      const record = await upsertTask(user.id, today, taskType, status, beans, detail)
      setTasks(prev => {
        const filtered = prev.filter(t => t.task_type !== taskType)
        return [...filtered, record]
      })

      // 更新用户货币
      const xpGain = beans > 0 ? beans : 0
      // 计算转盘变化
      let spinDelta = 0
      if (taskType === 'weekly_review' && status === 'completed') spinDelta = 1
      if (taskType === 'weekly_review' && isUndo && existingTask?.status === 'completed') spinDelta = -1

      const updatedUser = await updateUser(user.id, {
        beans_small: user.beans_small + beans,
        xp: user.xp + xpGain,
        spin_chances: user.spin_chances + spinDelta,
      })
      setUser(updatedUser)
      showToast(status === 'completed' ? `✅ +${beans}小豆！` : `❌ ${beans}小豆`)
    } catch {
      showToast('操作失败，请重试')
    }
    setLoading(false)
  }

  const getTaskStatus = (taskType: TaskType): DailyTask | undefined =>
    tasks.find(t => t.task_type === taskType)

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalTasks = TASK_CONFIGS.filter(t => t.type !== 'weekly_review').length
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  return (
    <div className="page-content">
      {/* 今日进度 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>
          📊 今日完成度 {isRestDay ? '(休息日双倍加成!)' : ''}
        </h3>
        <RpgProgress
          value={progressPct}
          label={`${completedCount}/${totalTasks}`}
          variant={progressPct >= 80 ? 'gold' : 'green'}
        />
      </PixelCard>

      {/* 任务列表 */}
      <h3 className="section-title">📋 每日任务</h3>
      {TASK_CONFIGS.map(config => {
        const record = getTaskStatus(config.type)
        const isDone = record?.status === 'completed'
        const isFailed = record?.status === 'failed'

        return (
          <div key={config.type} className={`task-item ${isDone ? 'completed' : isFailed ? 'failed' : ''}`}>
            <div className="task-info">
              <span className="task-icon">{config.icon}</span>
              <div className="task-detail">
                <h4>{config.label}</h4>
                <p>{config.description}</p>
                {config.type === 'study_hours' && isDone && (
                  <p style={{ color: 'var(--gold-light)', fontSize: '10px' }}>今日学了 {(record?.detail as Record<string,number> | null)?.hours || 6}h</p>
                )}
                {config.type === 'study_hours' && editingStudy && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                    <input type="number" value={studyHours} min={0} max={16}
                      onChange={e => setStudyHours(parseInt(e.target.value) || 0)}
                      style={{ width: '48px', padding: '4px', background: 'var(--bg-dark)', border: '2px solid var(--gold)', color: 'var(--gold)', textAlign: 'center', fontSize: '12px' }} />
                    <span style={{ fontSize: '11px' }}>小时</span>
                    <button className="pixel-btn primary sm" style={{ padding: '4px 8px' }} onClick={() => { handleTask(config.type, 'completed'); setEditingStudy(false) }} disabled={loading}>确认</button>
                    <button className="pixel-btn sm" style={{ padding: '4px 8px' }} onClick={() => setEditingStudy(false)}>取消</button>
                  </div>
                )}
                {config.condition && (
                  <p style={{ color: 'var(--gold)', fontSize: '10px' }}>{config.condition}</p>
                )}
              </div>
            </div>
            <div className="task-actions">
              <button
                className={`status-btn ${isDone ? 'active-done' : ''}`}
                onClick={() => {
                  if (config.type === 'study_hours' && !isDone) {
                    setEditingStudy(true); setStudyHours(6)
                  } else {
                    handleTask(config.type, isDone ? 'pending' : 'completed')
                  }
                }}
                disabled={loading}
                title={isDone ? '点击取消' : '完成'}
              >✅</button>
              {config.penalty !== 0 && (
                <button
                  className={`status-btn ${isFailed ? 'active-fail' : ''}`}
                  onClick={() => handleTask(config.type, isFailed ? 'pending' : 'failed')}
                  disabled={loading}
                  title={isFailed ? '点击取消' : '未完成'}
                >❌</button>
              )}
            </div>
          </div>
        )
      })}

    </div>
  )
}
