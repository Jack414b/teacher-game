import { useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard, PixelButton } from '../components/ui/PixelComponents'
import { TASK_CONFIGS } from '../lib/gameData'
import { updateUser } from '../lib/supabase'
import type { User } from '../types'

interface Props { showToast: (msg: string) => void }

export default function SettingsPage({ showToast }: Props) {
  const { user, setUser, soundEnabled, toggleSound, isBossMode } = useGameStore()
  const [nickname, setNickname] = useState(user?.nickname || 'XX酱')

  // 导出数据
  const handleExport = () => {
    if (!user) return
    const data = JSON.stringify(user, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `teacher-game-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('✅ 数据导出成功！')
  }

  // 导入数据
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as User
          setUser({ ...data, id: user?.id || data.id })
          updateUser(user?.id || data.id, data as unknown as Record<string, unknown>).catch(() => {})
          showToast('✅ 数据恢复成功！')
        } catch {
          showToast('❌ 文件格式错误')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // 激活新手礼包
  // 修改昵称
  const handleSaveNickname = async () => {
    if (!user || !nickname.trim()) return
    const updated = { ...user, nickname: nickname.trim() }
    try {
      await updateUser(user.id, { nickname: nickname.trim() })
      setUser(updated)
      showToast('✅ 昵称已更新！')
    } catch {
      showToast('❌ 同步失败，请检查网络')
    }
  }

  return (
    <div className="page-content">
      <h2 style={{ fontSize: '16px', color: 'var(--gold)', marginBottom: '12px' }}>⚙️ 设置</h2>

      {/* 昵称 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>👤 角色昵称</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            className="pixel-input"
            style={{ margin: 0 }}
            placeholder="输入昵称"
          />
          <PixelButton size="sm" variant="primary" onClick={handleSaveNickname}>
            保存
          </PixelButton>
        </div>
      </PixelCard>

      {/* 休息日 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>🏖️ 每周休息日</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
          选一天作为休息日，当天若学习则奖励双倍
        </p>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {['日', '一', '二', '三', '四', '五', '六'].map((label, idx) => {
            const current = parseInt(localStorage.getItem('teacher_game_rest_day') || '0')
            return (
              <button
                key={idx}
                className={`pixel-btn sm ${current === idx ? 'primary' : ''}`}
                onClick={() => { localStorage.setItem('teacher_game_rest_day', String(idx)); showToast(`✅ 休息日设为周${label}`) }}
                style={{ minWidth: '36px' }}
              >
                周{label}
              </button>
            )
          })}
        </div>
      </PixelCard>

      {/* 音效 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>🔊 音效</h3>
        <PixelButton size="sm" onClick={toggleSound}>
          {soundEnabled ? '🔊 已开启' : '🔇 已关闭'}
        </PixelButton>
      </PixelCard>

      {/* 数据备份 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>💾 数据备份</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
          导出数据文件备份，或导入之前备份的数据恢复进度
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <PixelButton size="sm" onClick={handleExport}>📤 导出备份</PixelButton>
          <PixelButton size="sm" onClick={handleImport}>📥 导入备份</PixelButton>
        </div>
      </PixelCard>

      {/* 规则速查 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>📖 游戏规则</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '11px' }}>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: 'var(--gold)' }}>每日任务</strong>
            {TASK_CONFIGS.map(t => (
              <div key={t.type} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{t.icon} {t.label}：</span>
                <span style={{ color: 'var(--green)' }}>+{t.reward}</span>
                {t.penalty !== 0 && (
                  <span style={{ color: 'var(--red)' }}> / {t.penalty}</span>
                )}
                <br />
                <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{t.description}</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: 'var(--gold)' }}>周日加成</strong>
            <p style={{ color: 'var(--text-dim)', fontSize: '10px' }}>周日所有奖励 ×2（休息日，若学习则双倍）</p>
          </div>
          <div>
            <strong style={{ color: 'var(--gold)' }}>Boss 后台</strong>
            <p style={{ color: 'var(--text-dim)', fontSize: '10px' }}>双击标题或点右上角🔑，输入暗号「JYZB」进入</p>
          </div>
        </div>
      </PixelCard>

      {/* 版本信息 */}
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: '10px' }}>
        <p>教师编制闯关大挑战 v1.0</p>
        <p>Made with ❤️ by Boss | {isBossMode ? '👑 Boss模式' : '📚 备考模式'}</p>
      </div>
    </div>
  )
}
