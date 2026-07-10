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
  const [showCalendar, setShowCalendar] = useState(false)
  const [monthTasks, setMonthTasks] = useState<DailyTask[]>([])
  const [customRules, setCustomRules] = useState<CustomRule[]>([])

  const today = new Date().toISOString().slice(0, 10)
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    if (!user) return
    getTodayTasks(user.id, today).then(setTasks).catch(() => {})
    getCustomRules(user.id).then(setCustomRules).catch(() => {})
  }, [user, today])

  useEffect(() => {
    if (!showCalendar || !user) return
    const start = new Date()
    start.setDate(start.getDate() - 30)
    getTasksInRange(user.id, start.toISOString().slice(0, 10), today)
      .then(setMonthTasks)
      .catch(() => {})
  }, [showCalendar, user, today])

  const handleTask = async (taskType: TaskType, status: 'completed' | 'failed') => {
    if (!user || loading) return
    setLoading(true)

    const config = TASK_CONFIGS.find(t => t.type === taskType)!
    const customRule = customRules.find(r => r.task_type === taskType)
    const reward = customRule?.reward ?? config.reward
    const penalty = customRule?.penalty ?? config.penalty
    let beans = status === 'completed' ? reward : penalty

    // 周末双倍
    if (isSunday && status === 'completed' && taskType !== 'weekly_review') {
      beans *= 2
    }

    // 学习时长特殊处理：已完成时检查是否超过6小时
    let detail: Record<string, unknown> | undefined = undefined
    if (taskType === 'study_hours' && status === 'completed') {
      detail = { hours: 6 }
    }

    try {
      const record = await upsertTask(user.id, today, taskType, status, beans, detail)
      setTasks(prev => {
        const filtered = prev.filter(t => t.task_type !== taskType)
        return [...filtered, record]
      })

      // 更新用户货币
      const updatedUser = await updateUser(user.id, {
        beans_small: user.beans_small + beans,
        spin_chances: taskType === 'exercise' && status === 'completed'
          ? user.spin_chances + 1
          : user.spin_chances,
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

  // 日历热力图数据
  const getHeatLevel = (date: string) => {
    const dayTasks = monthTasks.filter(t => t.task_date === date)
    const done = dayTasks.filter(t => t.status === 'completed').length
    if (done === 0) return 0
    if (done <= 1) return 1
    if (done <= 2) return 2
    if (done <= 3) return 3
    if (done <= 4) return 4
    return 5
  }

  // 生成过去30天格子
  const heatCells = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 29 + i)
    const dateStr = d.toISOString().slice(0, 10)
    return { date: dateStr, level: getHeatLevel(dateStr), day: d.getDate() }
  })

  return (
    <div className="page-content">
      {/* 今日进度 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>
          📊 今日完成度 {isSunday ? '(周日双倍加成!)' : ''}
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
                {config.condition && (
                  <p style={{ color: 'var(--gold)', fontSize: '10px' }}>{config.condition}</p>
                )}
              </div>
            </div>
            <div className="task-actions">
              <button
                className={`status-btn ${isDone ? 'active-done' : ''}`}
                onClick={() => handleTask(config.type, 'completed')}
                disabled={loading}
                title="完成"
              >✅</button>
              {config.penalty !== 0 && (
                <button
                  className={`status-btn ${isFailed ? 'active-fail' : ''}`}
                  onClick={() => handleTask(config.type, 'failed')}
                  disabled={loading}
                  title="未完成"
                >❌</button>
              )}
            </div>
          </div>
        )
      })}

      {/* 日历热力图 */}
      <div style={{ marginTop: '16px' }}>
        <button
          className="pixel-btn sm full"
          onClick={() => setShowCalendar(!showCalendar)}
        >
          {showCalendar ? '收起' : '📅 查看打卡日历'}
        </button>
        {showCalendar && (
          <PixelCard>
            <h4 style={{ fontSize: '12px', marginBottom: '8px' }}>过去30天打卡记录</h4>
            <div className="heatmap-grid">
              {heatCells.map((cell, i) => (
                <div
                  key={i}
                  className={`heatmap-cell lv${cell.level}`}
                  title={`${cell.date}: ${cell.level}项完成`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-dim)', marginTop: '6px' }}>
              <span>少</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[0,1,2,3,4,5].map(lv => (
                  <div key={lv} className={`heatmap-cell lv${lv}`} />
                ))}
              </div>
              <span>多</span>
            </div>
          </PixelCard>
        )}
      </div>
    </div>
  )
}
