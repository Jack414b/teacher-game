import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useGameStore } from './stores/gameStore'
import { getUser, syncUser } from './lib/supabase'
import type { User } from './types'
import { STARTER_PACK } from './types'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import SpinPage from './pages/SpinPage'
import ShopPage from './pages/ShopPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import CalendarPage from './pages/CalendarPage'
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

  // 初始化/加载用户
  useEffect(() => {
    const initUser = async () => {
      let userId = localStorage.getItem('teacher_game_user_id')

      if (userId) {
        try {
          const data = await getUser(userId)
          if (data) { setUser(data as User); return }
        } catch { /* 离线模式 */ }
      }

      // 创建新用户
      const localUser: User = {
        id: userId || crypto.randomUUID(),
        nickname: 'XX酱',
        beans_small: STARTER_PACK.beans_small,
        beans_big: 0,
        spin_chances: STARTER_PACK.spin_chances,
        cards: STARTER_PACK.cards as User['cards'],
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('teacher_game_user_id', localUser.id)
      setUser(localUser)

      // 尝试同步到 Supabase
      try { await syncUser(localUser as unknown as Record<string, unknown>) } catch { /* 离线跳过 */ }
    }
    initUser()
  }, [setUser])

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

  const navItems = [
    { path: '/', icon: '🏠', label: '主页' },
    { path: '/tasks', icon: '📋', label: '打卡' },
    { path: '/calendar', icon: '📅', label: '日历' },
    { path: '/spin', icon: '🎰', label: '转盘' },
    { path: '/shop', icon: '🛒', label: '商城' },
    ...(isBossMode ? [{ path: '/admin', icon: '👑', label: '后台' }] : []),
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
        <Route path="/spin" element={<SpinPage showToast={showToast} />} />
        <Route path="/shop" element={<ShopPage showToast={showToast} />} />
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
      </nav>
    </div>
  )
}

export default App
