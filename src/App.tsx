import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useGameStore } from './stores/gameStore'
import { getUser, syncUser, getTasksInRange, upsertTask, updateUser } from './lib/supabase'
import type { User } from './types'
import { STARTER_PACK } from './types'
import { TASK_CONFIGS } from './lib/gameData'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import ShopPage from './pages/ShopPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import CalendarPage from './pages/CalendarPage'
import BackpackPage from './pages/BackpackPage'
import PixelPet from './components/ui/PixelPet'
import './App.css'

function App() {
  const { setUser, isBossMode, setBossMode } = useGameStore()
  const [toast, setToast] = useState<string | null>(null)
  const [showBossEntry, setShowBossEntry] = useState(false)
  const [bossPassword, setBossPassword] = useState('')
  const [bossError, setBossError] = useState(false)
  const [titleClicks, setTitleClicks] = useState(0)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // 唯一玩家账号：所有设备共用同一个ID
  const MAIN_USER_ID = '00000000-0000-0000-0000-000000000001'

  useEffect(() => {
    const initUser = async () => {
      // 先从 Supabase 加载
      try {
        const data = await getUser(MAIN_USER_ID)
        if (data) { setUser(data as User); return }
      } catch {}

      // 云端不存在则创建
      const newUser: User = {
        id: MAIN_USER_ID,
        nickname: '哈基慧',
        beans_small: STARTER_PACK.beans_small,
        beans_big: 0,
        spin_chances: STARTER_PACK.spin_chances,
        xp: 0,
        cards: STARTER_PACK.cards as User['cards'],
        created_at: new Date().toISOString(),
      }
      try { await syncUser(newUser as unknown as Record<string, unknown>) } catch {}
      setUser(newUser)
    }
    initUser()
  }, [setUser])

  // 过期任务自动失败（App启动执行，XP结算在TasksPage统一处理）
  useEffect(() => {
    const uid = localStorage.getItem('teacher_game_user_id') || '00000000-0000-0000-0000-000000000001'
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    getTasksInRange(uid, '2026-01-01', yesterday.toISOString().slice(0,10)).then(tasks => {
      const pending = tasks.filter(t => t.status === 'pending')
      let totalPenalty = 0
      Promise.all(pending.map(async t => {
        const cfg = TASK_CONFIGS.find(c => c.type === t.task_type)
        const penalty = cfg?.penalty || 0
        if (penalty < 0) { totalPenalty += penalty; await upsertTask(uid, t.task_date, t.task_type, 'failed', penalty) }
      })).then(() => {
        if (totalPenalty < 0) updateUser(uid, { beans_small: (useGameStore.getState().user?.beans_small||0) + totalPenalty }).catch(() => {})
      }).catch(() => {})
    }).catch(() => {})
  }, [])

  // Boss 入口：双击标题或点🔑按钮
  const handleTitleDoubleClick = () => {
    const newClicks = titleClicks + 1
    setTitleClicks(newClicks)
    if (newClicks >= 2) { setShowBossEntry(true); setTitleClicks(0) }
    setTimeout(() => setTitleClicks(0), 800)
  }
  const handleBossLogin = () => {
    if (bossPassword === 'JYZB') {
      setBossMode(true); setShowBossEntry(false); setBossPassword(''); setBossError(false)
      showToast('👑 Boss 模式启动！')
    } else { setBossError(true) }
  }

  const location = useLocation()
  const navigate = useNavigate()

  const navItems = isBossMode ? [
    { path: '/', icon: '🏠', label: '主页' },
    { path: '/admin', icon: '👑', label: '后台' },
    { path: '/calendar', icon: '📅', label: '日历' },
    { path: '/shop', icon: '🛒', label: '商城' },
    { path: '/settings', icon: '⚙️', label: '设置' },
  ] : [
    { path: '/', icon: '🏠', label: '主页' },
    { path: '/tasks', icon: '📋', label: '打卡' },
    { path: '/calendar', icon: '📅', label: '日历' },
    { path: '/shop', icon: '🛒', label: '商城' },
    { path: '/backpack', icon: '🎒', label: '背包' },
    { path: '/settings', icon: '⚙️', label: '设置' },
  ]

  return (
    <div className="app-container">
      {toast && <div className="pixel-toast pixel-pop-in">{toast}</div>}

      {showBossEntry && (
        <div className="pixel-modal-overlay" onClick={() => setShowBossEntry(false)}>
          <div className="pixel-modal pixel-pop-in" onClick={e => e.stopPropagation()}>
            <h2>🔐 请输入暗号</h2>
            <input type="password" value={bossPassword}
              onChange={e => { setBossPassword(e.target.value); setBossError(false) }}
              placeholder="暗号是..."
              style={{ width:'100%',padding:'12px',margin:'12px 0',background:'var(--bg-dark)',border:'3px solid var(--border)',color:'var(--text)',fontSize:'16px',textAlign:'center' }}
              autoFocus onKeyDown={e => e.key === 'Enter' && handleBossLogin()} />
            {bossError && <p style={{ color:'var(--red)',fontSize:'12px' }}>暗号错误！</p>}
            <div className="modal-actions">
              <button className="pixel-btn" onClick={() => setShowBossEntry(false)}>取消</button>
              <button className="pixel-btn primary" onClick={handleBossLogin}>确认</button>
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        {!isBossMode && (
          <button
            onClick={() => setShowBossEntry(true)}
            style={{
              position:'absolute',top:'8px',right:'8px',
              background:'transparent',border:'none',fontSize:'18px',
              cursor:'pointer',opacity:0.5,padding:'4px',
            }}
            title="Boss入口"
          >🔑</button>
        )}
        <h1 onClick={handleTitleDoubleClick}>
          {isBossMode ? '👑 Boss 模式' : '📚 教师编制\n闯关大挑战'}
        </h1>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard showToast={showToast} />} />
        <Route path="/tasks" element={<TasksPage showToast={showToast} />} />
        <Route path="/calendar" element={<CalendarPage showToast={showToast} />} />
        <Route path="/shop" element={<ShopPage showToast={showToast} />} />
        <Route path="/backpack" element={<BackpackPage showToast={showToast} />} />
        {isBossMode && <Route path="/admin" element={<AdminPage showToast={showToast} />} />}
        <Route path="/settings" element={<SettingsPage showToast={showToast} />} />
      </Routes>

      <nav className="app-nav">
        {navItems.map(item => (
          <button key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <PixelPet />
      </nav>
    </div>
  )
}

export default App
