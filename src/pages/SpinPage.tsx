import { useRef, useState, useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelButton, PixelModal } from '../components/ui/PixelComponents'
import { SPIN_PRIZES } from '../lib/gameData'
import { updateUser, logSpin } from '../lib/supabase'
import type { SpinPrize } from '../types'

interface Props { showToast: (msg: string) => void }

const COLORS = ['#e74c3c', '#e2b04a', '#6fdc6f', '#e67e22', '#e91e63', '#3498db']
const SEGMENTS = SPIN_PRIZES.length

export default function SpinPage({ showToast }: Props) {
  const { user, setUser, useSpinChance } = useGameStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinPrize | null>(null)
  const [currentAngle, setCurrentAngle] = useState(0)

  // 绘制转盘
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const size = canvas.width
    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 10

    ctx.clearRect(0, 0, size, size)

    const arcAngle = (2 * Math.PI) / SEGMENTS
    for (let i = 0; i < SEGMENTS; i++) {
      const startAngle = currentAngle + i * arcAngle
      const endAngle = startAngle + arcAngle

      // 扇形
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = COLORS[i]
      ctx.fill()
      ctx.strokeStyle = '#1a1a2e'
      ctx.lineWidth = 3
      ctx.stroke()

      // 文字
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(startAngle + arcAngle / 2)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 28px sans-serif'
      ctx.fillText(SPIN_PRIZES[i].icon, radius * 0.65, 10)
      ctx.font = 'bold 10px sans-serif'
      ctx.fillStyle = '#000'
      ctx.fillText(SPIN_PRIZES[i].label, radius * 0.65, 28)
      ctx.restore()
    }

    // 中心圆
    ctx.beginPath()
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI)
    ctx.fillStyle = '#1a1a2e'
    ctx.fill()
    ctx.strokeStyle = '#e2b04a'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#e2b04a'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GO', cx, cy + 6)
  }, [currentAngle])

  const handleSpin = async () => {
    if (!user || spinning) return
    if (user.spin_chances <= 0) {
      showToast('转盘次数不足！')
      return
    }

    setSpinning(true)
    setResult(null)
    useSpinChance()

    // 随机结果
    const prizeIndex = Math.floor(Math.random() * SEGMENTS)
    const prize = SPIN_PRIZES[prizeIndex]

    // 计算旋转角度：多圈 + 落在对应的扇区
    const segmentAngle = (2 * Math.PI) / SEGMENTS
    const targetAngle = 2 * Math.PI - (prizeIndex * segmentAngle + segmentAngle / 2)
    const spins = 5 * 2 * Math.PI + targetAngle - (currentAngle % (2 * Math.PI))
    const finalAngle = currentAngle + spins

    // 动画旋转
    const duration = 4000
    const startTime = Date.now()
    const startAngle = currentAngle

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrentAngle(startAngle + spins * eased)
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCurrentAngle(finalAngle)
        setResult(prize)
        setSpinning(false)

        // 处理奖励
        handlePrize(prize)
      }
    }
    requestAnimationFrame(animate)

    // 记录
    try { await logSpin(user.id, prize.label) } catch {}
  }

  const handlePrize = async (prize: SpinPrize) => {
    if (!user) return
    try {
      switch (prize.type) {
        case 'bean_small':
          await updateUser(user.id, { beans_small: user.beans_small + prize.value })
          setUser({ ...user, beans_small: user.beans_small + prize.value })
          showToast(`🎉 获得 ${prize.value} 小豆！`)
          break
        case 'card':
          if (prize.label === '免学半日券') {
            const newCards = { ...user.cards, 免学休息日: (user.cards?.['免学休息日'] || 0) + 1 }
            await updateUser(user.id, { cards: newCards })
            setUser({ ...user, cards: newCards })
          }
          showToast(`🎉 获得 ${prize.label}！`)
          break
        case 'physical':
          showToast(`🎉 ${prize.label}！请找Boss兑现~`)
          break
        case 'reroll':
          showToast('🍀 再来一次！')
          // +1 转盘次数
          await updateUser(user.id, { spin_chances: user.spin_chances + 1 })
          setUser({ ...user, spin_chances: user.spin_chances + 1 })
          break
      }
    } catch { /* 离线模式 */ }
  }

  return (
    <div className="page-content">
      <div className="spin-container">
        <h3 style={{ textAlign: 'center', fontSize: '14px', color: 'var(--gold)' }}>
          🎰 幸运转盘
        </h3>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
          剩余次数：<strong style={{ color: 'var(--gold)' }}>{user?.spin_chances || 0}</strong>
        </p>

        <div className="spin-canvas-wrapper" style={{ position: 'relative', width: '300px', height: '300px', margin: '0 auto' }}>
          <div className="spin-pointer">▼</div>
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        <PixelButton
          variant="primary"
          onClick={handleSpin}
          disabled={spinning || (user?.spin_chances || 0) <= 0}
        >
          {spinning ? '🎰 转盘中...' : '🎰 开始抽奖!'}
        </PixelButton>
      </div>

      {/* 奖池说明 */}
      <div style={{ marginTop: '16px' }}>
        <h3 className="section-title">🎁 奖池一览</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {SPIN_PRIZES.map(prize => (
            <div key={prize.id} style={{
              background: 'var(--bg-card)', border: '2px solid var(--border)',
              padding: '10px', display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px',
            }}>
              <span style={{ fontSize: '24px' }}>{prize.icon}</span>
              <span>{prize.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 结果弹窗 */}
      {result && (
        <PixelModal title="🎉 恭喜!" onClose={() => setResult(null)}>
          <div style={{ fontSize: '48px', margin: '16px 0' }}>{result.icon}</div>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{result.label}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
            {result.type === 'physical' ? '请联系Boss兑现奖品~' :
             result.type === 'reroll' ? '自动增加一次转盘机会!' :
             '奖励已自动发放!'}
          </p>
          <div style={{ marginTop: '16px' }}>
            <button className="pixel-btn primary" onClick={() => setResult(null)}>
              知道了!
            </button>
          </div>
        </PixelModal>
      )}
    </div>
  )
}
