import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { getTasksInRange } from '../lib/supabase'
import { TASK_CONFIGS } from '../lib/gameData'
import type { DailyTask } from '../types'

interface Props { showToast: (msg: string) => void }

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

// 获取本地时间日期字符串 YYYY-MM-DD
function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarPage(_props: Props) {
  const { user } = useGameStore()
  const [monthTasks, setMonthTasks] = useState<DailyTask[]>([])
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = localDate(new Date())

  // 计算加载范围
  const loadStart = new Date(year, month, 1)
  loadStart.setDate(loadStart.getDate() - ((firstDay.getDay() + 6) % 7))
  const loadEnd = new Date(year, month + 1, 0)
  if (loadEnd.getDay() !== 0) {
    loadEnd.setDate(loadEnd.getDate() + (7 - loadEnd.getDay()))
  }

  useEffect(() => {
    if (!user) return
    getTasksInRange(user.id, localDate(loadStart), localDate(loadEnd))
      .then(setMonthTasks).catch(() => {})
  }, [user, year, month])

  const getDayStats = (dateStr: string) => {
    const tasks = monthTasks.filter(t => t.task_date === dateStr)
    const completed = tasks.filter(t => t.status === 'completed').length
    return { completed, total: tasks.length }
  }

  const getColorLevel = (dateStr: string) => {
    const { completed, total } = getDayStats(dateStr)
    if (total === 0) return 0
    const rate = completed / total
    if (rate >= 1) return 4
    if (rate >= 0.7) return 3
    if (rate >= 0.4) return 2
    return 1
  }

  const cells: Array<{ date: string; day: number; isCurrentMonth: boolean; isToday: boolean }> = []
  const startDayOfWeek = (firstDay.getDay() + 6) % 7
  for (let i = 0; i < startDayOfWeek; i++) {
    const d = new Date(year, month, 1 - startDayOfWeek + i)
    cells.push({ date: localDate(d), day: d.getDate(), isCurrentMonth: false, isToday: localDate(d) === today })
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = localDate(new Date(year, month, d))
    cells.push({ date: dateStr, day: d, isCurrentMonth: true, isToday: dateStr === today })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const dateStr = localDate(new Date(year, month + 1, d))
      cells.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === today })
    }
  }

  const selectedTasks = selectedDate ? monthTasks.filter(t => t.task_date === selectedDate) : []

  const levelColors = ['var(--bg-card)', '#3d1a1a', '#5d3a1a', '#3d5d1a', 'var(--green)']

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 8px' }}>
        <button className="pixel-btn sm" onClick={() => setViewDate(new Date(year, month - 1, 1))}>◀</button>
        <h3 style={{ fontSize: '15px', color: 'var(--gold)' }}>{year}年{month + 1}月</h3>
        <button className="pixel-btn sm" onClick={() => setViewDate(new Date(year, month + 1, 1))}>▶</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', padding: '6px 0', fontWeight: 'bold' }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((cell, i) => {
          const level = getColorLevel(cell.date)
          const { completed, total } = getDayStats(cell.date)
          return (
            <div key={i} onClick={() => cell.isCurrentMonth && setSelectedDate(cell.date)}
              style={{
                aspectRatio: '1', cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                background: level > 0 ? levelColors[level] : 'var(--bg-card)',
                border: cell.isToday ? '2px solid var(--gold)' : selectedDate === cell.date ? '2px solid var(--gold-light)' : '2px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                opacity: cell.isCurrentMonth ? 1 : 0.3,
              }}>
              <span style={{ fontSize: '14px', fontWeight: cell.isToday ? 'bold' : 'normal', color: cell.isToday ? 'var(--gold)' : level > 2 ? '#fff' : 'var(--text)' }}>{cell.day}</span>
              {total > 0 && <span style={{ fontSize: '8px', color: level > 2 ? 'rgba(255,255,255,0.7)' : 'var(--text-dim)' }}>{completed}/{total}</span>}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginTop: '12px', fontSize: '10px', color: 'var(--text-dim)' }}>
        <span>完成率：</span>
        {[{ label: '0%', color: 'var(--bg-card)', border: true }, { label: '1-39%', color: '#3d1a1a' }, { label: '40-69%', color: '#5d3a1a' }, { label: '70-99%', color: '#3d5d1a' }, { label: '100%', color: 'var(--green)' }].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '14px', height: '14px', background: item.color, border: item.border ? '2px solid var(--border)' : 'none' }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {selectedDate && selectedTasks.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--gold)', marginBottom: '8px' }}>📋 {selectedDate}</h4>
          {TASK_CONFIGS.map(config => {
            const task = selectedTasks.find(t => t.task_type === config.type)
            return (
              <div key={config.type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', margin: '4px 0', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '12px' }}>
                <span>{config.icon}</span>
                <span style={{ flex: 1 }}>{config.label}</span>
                <span style={{ color: task?.status === 'completed' ? 'var(--green)' : task?.status === 'failed' ? 'var(--red)' : 'var(--text-dim)', fontWeight: 'bold' }}>
                  {task?.status === 'completed' ? '✅' : task?.status === 'failed' ? '❌' : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {selectedDate && selectedTasks.length === 0 && (
        <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>📅 当天无打卡记录</p>
      )}
    </div>
  )
}
