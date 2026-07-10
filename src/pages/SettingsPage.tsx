import { useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard, PixelButton } from '../components/ui/PixelComponents'
import { TASK_CONFIGS } from '../lib/gameData'
import { updateUser } from '../lib/supabase'
import type { User } from '../types'
import { STARTER_PACK } from '../types'

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
  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as User
          setUser({ ...data, id: user?.id || data.id })
          try { await updateUser(user?.id || data.id, data as unknown as Record<string, unknown>) } catch {}
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
  const handleActivateStarter = async () => {
    if (!user) return
    const updated = {
      ...user,
      beans_small: user.beans_small + STARTER_PACK.beans_small,
      spin_chances: user.spin_chances + STARTER_PACK.spin_chances,
      cards: {
        免早起卡: (user.cards?.['免早起卡'] || 0) + STARTER_PACK.cards.免早起卡,
        休息卡: (user.cards?.['休息卡'] || 0) + STARTER_PACK.cards.休息卡,
        免学休息日: user.cards?.['免学休息日'] || 0,
      },
    }
    setUser(updated)
    try { await updateUser(user.id, updated as unknown as Record<string, unknown>) } catch {}
    showToast('🎁 新手礼包已激活！')
  }

  // 修改昵称
  const handleSaveNickname = async () => {
    if (!user || !nickname.trim()) return
    const updated = { ...user, nickname: nickname.trim() }
    setUser(updated)
    try { await updateUser(user.id, { nickname: nickname.trim() }) } catch {}
    showToast('✅ 昵称已更新！')
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

      {/* 音效 */}
      <PixelCard>
        <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>🔊 音效</h3>
        <PixelButton size="sm" onClick={toggleSound}>
          {soundEnabled ? '🔊 已开启' : '🔇 已关闭'}
        </PixelButton>
      </PixelCard>

      {/* 新手礼包 */}
      <PixelCard gold>
        <h3 style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--gold)' }}>🎁 新手大礼包</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
          +30小豆 · +2次转盘 · +1免早起卡 · +1休息卡
        </p>
        <PixelButton size="sm" variant="primary" onClick={handleActivateStarter}>
          激活礼包
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
