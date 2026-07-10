import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard, RpgProgress } from '../components/ui/PixelComponents'
import { TASK_CONFIGS } from '../lib/gameData'
import { getTodayTasks, upsertTask, updateUser, getCustomRules } from '../lib/supabase'
import type { DailyTask, TaskType, CustomRule } from '../types'

interface Props { showToast: (msg: string) => void }

export default function TasksPage({ showToast }: Props) {
  const { user, setUser } = useGameStore()
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loading, setLoading] = useState(false)
  const [customRules, setCustomRules] = useState<CustomRule[]>([])

  const today = new Date().toISOString().slice(0, 10)
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    if (!user) return
    getTodayTasks(user.id, today).then(setTasks).catch(() => {})
    getCustomRules(user.id).then(setCustomRules).catch(() => {})
  }, [user, today])

  const handleTask = async (taskType: TaskType, status: 'completed' | 'failed' | 'pending') => {
    if (!user || loading) return
    setLoading(true)

    // 如果是取消（pending），需要反向扣除之前的小豆
    const existingTask = tasks.find(t => t.task_type === taskType)
    const isUndo = status === 'pending' && existingTask && existingTask.status !== 'pending'

    let beans = 0
    if (isUndo) {
      // 反向操作：之前得的扣掉，之前扣的加回
      beans = -(existingTask!.beans_earned)
    } else if (status !== 'pending') {
      const config = TASK_CONFIGS.find(t => t.type === taskType)!
      const customRule = customRules.find(r => r.task_type === taskType)
      const reward = customRule?.reward ?? config.reward
      const penalty = customRule?.penalty ?? config.penalty
      beans = status === 'completed' ? reward : penalty
      // 周末双倍
      if (isSunday && status === 'completed' && taskType !== 'weekly_review') beans *= 2
    }

    let detail: Record<string, unknown> | undefined = undefined
    if (taskType === 'study_hours' && status === 'completed') detail = { hours: 6 }

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
                onClick={() => handleTask(config.type, isDone ? 'pending' : 'completed')}
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
