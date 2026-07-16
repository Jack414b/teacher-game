import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard, PixelModal } from '../components/ui/PixelComponents'
import { SMALL_BEAN_SHOP, BIG_BEAN_SHOP, SPIN_PRIZES } from '../lib/gameData'
import { updateUser, createRedemption, getCustomShopItems, logSpin } from '../lib/supabase'
import type { ShopItem, CustomShopItem, SpinPrize } from '../types'

const SEGMENTS = SPIN_PRIZES.length
const COLORS = ['#e74c3c', '#e2b04a', '#6fdc6f', '#e67e22', '#e91e63', '#3498db']

interface Props { showToast: (msg: string) => void }

export default function ShopPage({ showToast }: Props) {
  const { user, setUser, useSpinChance } = useGameStore()
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [customItems, setCustomItems] = useState<CustomShopItem[]>([])

  // 转盘
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinPrize | null>(null)
  const [currentAngle, setCurrentAngle] = useState(0)

  useEffect(() => { drawWheel() }, [currentAngle])

  const drawWheel = () => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const size = canvas.width, cx = size / 2, cy = size / 2, radius = size / 2 - 10
    ctx.clearRect(0, 0, size, size)
    const arcAngle = (2 * Math.PI) / SEGMENTS
    for (let i = 0; i < SEGMENTS; i++) {
      const sa = currentAngle + i * arcAngle, ea = sa + arcAngle
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, sa, ea); ctx.closePath()
      ctx.fillStyle = COLORS[i]; ctx.fill(); ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2; ctx.stroke()
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(sa + arcAngle / 2)
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif'
      ctx.fillText(SPIN_PRIZES[i].icon, radius * 0.65, 8)
      ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = '#000'
      ctx.fillText(SPIN_PRIZES[i].label, radius * 0.65, 24)
      ctx.restore()
    }
    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 2 * Math.PI); ctx.fillStyle = '#1a1a2e'; ctx.fill()
    ctx.strokeStyle = '#e2b04a'; ctx.lineWidth = 3; ctx.stroke()
    ctx.fillStyle = '#e2b04a'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('GO', cx, cy + 5)
  }

  const handleSpin = async () => {
    if (!user || spinning || user.spin_chances <= 0) { if (user?.spin_chances === 0) showToast('转盘次数不足！'); return }
    setSpinning(true); setResult(null); useSpinChance()
    try { await updateUser(user.id, { spin_chances: user.spin_chances - 1 }) } catch {}
    // 权重随机
    const totalWeight = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0)
    let rand = Math.random() * totalWeight
    let prize = SPIN_PRIZES[0]
    for (const p of SPIN_PRIZES) { rand -= p.weight; if (rand <= 0) { prize = p; break } }
    const prizeIndex = SPIN_PRIZES.indexOf(prize)
    const segmentAngle = (2 * Math.PI) / SEGMENTS
    const targetAngle = 2 * Math.PI - (prizeIndex * segmentAngle + segmentAngle / 2)
    const spins = 5 * 2 * Math.PI + targetAngle - (currentAngle % (2 * Math.PI))
    const finalAngle = currentAngle + spins
    const startTime = Date.now(), startAngle = currentAngle
    const animate = () => {
      const elapsed = Date.now() - startTime, progress = Math.min(elapsed / 4000, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrentAngle(startAngle + spins * eased)
      if (progress < 1) requestAnimationFrame(animate)
      else { setCurrentAngle(finalAngle); setResult(prize); setSpinning(false); handlePrize(prize) }
    }
    requestAnimationFrame(animate)
    try { await logSpin(user.id, prize.label) } catch {}
  }

  const handlePrize = async (prize: SpinPrize) => {
    if (!user) return
    try {
      switch (prize.type) {
        case 'bean_big':
          await updateUser(user.id, { beans_big: user.beans_big + prize.value })
          setUser({ ...user, beans_big: user.beans_big + prize.value })
          showToast(`🎉 获得 ${prize.value} 大豆！`); break
        case 'bean_small':
          await updateUser(user.id, { beans_small: user.beans_small + prize.value })
          setUser({ ...user, beans_small: user.beans_small + prize.value })
          showToast(`🎉 获得 ${prize.value} 小豆！`); break
        case 'card':
          if (prize.label.includes('早起')) {
            const nc = { ...user.cards, 免早起卡: (user.cards?.['免早起卡'] || 0) + 1 }
            await updateUser(user.id, { cards: nc }); setUser({ ...user, cards: nc })
          }
          showToast(`🎉 获得 ${prize.label}！`); break
        case 'physical':
          try { await createRedemption(user.id, prize.label, 'big_bean', 0) } catch {}
          showToast(`🎉 ${prize.label}！已加入背包待兑现~`); break
        case 'reroll':
          await updateUser(user.id, { spin_chances: user.spin_chances })
          setUser({ ...user, spin_chances: user.spin_chances })
          showToast('🍀 再来一次！'); break
        case 'none':
          showToast('😅 谢谢惠顾~下次加油！'); break
      }
    } catch {}
  }

  useEffect(() => {
    if (!user) return
    getCustomShopItems(user.id).then(setCustomItems).catch(() => {})
  }, [user])

  // 合并默认商品和自定义覆盖
  const overrideMap = new Map<string, CustomShopItem>()
  customItems.forEach(i => overrideMap.set(i.name, i))

  function applyOverrides(defaults: ShopItem[]): ShopItem[] {
    return defaults
      .filter(d => {
        const ov = overrideMap.get(d.name)
        if (ov) { overrideMap.delete(d.name); return ov.active } // 覆盖：按下架状态过滤
        return true
      })
      .map(d => {
        const ov = customItems.find(c => c.name === d.name && c.active)
        if (ov) return { ...d, price: ov.price, id: ov.id! }
        return d
      })
  }

  const smallShopItems: ShopItem[] = [
    ...applyOverrides([...SMALL_BEAN_SHOP]),
    ...customItems
      .filter(i => i.active && !SMALL_BEAN_SHOP.some(d => d.name === i.name) && !BIG_BEAN_SHOP.some(d => d.name === i.name) && i.currency === 'small_bean')
      .map(i => ({ id: i.id!, name: i.name, price: i.price, currency: i.currency, icon: i.icon, description: i.description, category: i.category })),
  ]

  const bigShopItems: ShopItem[] = [
    ...applyOverrides([...BIG_BEAN_SHOP]),
    ...customItems
      .filter(i => i.active && !SMALL_BEAN_SHOP.some(d => d.name === i.name) && !BIG_BEAN_SHOP.some(d => d.name === i.name) && i.currency === 'big_bean')
      .map(i => ({ id: i.id!, name: i.name, price: i.price, currency: i.currency, icon: i.icon, description: i.description, category: i.category })),
  ]

  const handleBuy = async (item: ShopItem) => {
    if (!user) return

    if (item.currency === 'small_bean' && user.beans_small < item.price) {
      showToast('🫘 小豆不足！')
      return
    }
    if (item.currency === 'big_bean' && user.beans_big < item.price) {
      showToast('🌰 大豆不足！')
      return
    }

    setSelectedItem(item)
  }

  const confirmBuy = async () => {
    if (!user || !selectedItem) return
    setConfirming(true)

    try {
      if (selectedItem.currency === 'small_bean') {
        const updated = await updateUser(user.id, { beans_small: user.beans_small - selectedItem.price })
        setUser(updated)
      } else {
        const updated = await updateUser(user.id, { beans_big: user.beans_big - selectedItem.price })
        setUser(updated)
      }

      await createRedemption(user.id, selectedItem.name, selectedItem.currency, selectedItem.price)
      showToast(`✅ 兑换成功！${selectedItem.name}`)
    } catch {
      // 离线模式：直接更新本地
      if (selectedItem.currency === 'small_bean') {
        setUser({ ...user, beans_small: user.beans_small - selectedItem.price })
      } else {
        setUser({ ...user, beans_big: user.beans_big - selectedItem.price })
      }
      showToast(`✅ 兑换成功！${selectedItem.name}`)
    }

    setConfirming(false)
    setSelectedItem(null)
  }

  return (
    <div className="page-content">
      {/* 余额 */}
      <div className="currency-display">
        <div className="currency-item">
          <span className="icon">🫘</span>
          <span className="amount">{user?.beans_small || 0}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>小豆</span>
        </div>
        <div className="currency-item">
          <span className="icon">🌰</span>
          <span className="amount">{user?.beans_big || 0}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>大豆</span>
        </div>
      </div>

      {/* 转盘 */}
      <PixelCard>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--gold)', marginBottom: '4px' }}>🎰 幸运转盘</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
            剩余 <strong style={{ color: 'var(--gold)' }}>{user?.spin_chances || 0}</strong> 次
          </p>
          <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', fontSize: '24px', zIndex: 10 }}>▼</div>
            <canvas ref={canvasRef} width={200} height={200} style={{ width: '100%', height: '100%' }} />
          </div>
          <button className="pixel-btn primary" onClick={handleSpin} disabled={spinning || (user?.spin_chances || 0) <= 0}
            style={{ marginTop: '8px' }}>
            {spinning ? '🎰 转盘中...' : '🎰 开始抽奖!'}
          </button>
        </div>
      </PixelCard>

      {result && (
        <PixelModal title="🎉 恭喜!" onClose={() => setResult(null)}>
          <div style={{ fontSize: '48px', margin: '12px 0' }}>{result.icon}</div>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{result.label}</p>
          <div style={{ marginTop: '16px' }}>
            <button className="pixel-btn primary" onClick={() => setResult(null)}>知道了!</button>
          </div>
        </PixelModal>
      )}

      {/* 小豆兑换区 */}
      <h3 className="section-title">🫘 小豆兑换区（日常补给）</h3>
      <div className="shop-grid">
        {smallShopItems.map(item => (
          <div key={item.id} className="shop-item pixel-border" onClick={() => handleBuy(item)}>
            <div className="item-icon">{item.icon}</div>
            <div className="item-name">{item.name}</div>
            <div className="item-price">🫘 {item.price}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
              {item.category}
              {item.id!.length > 10 && <span style={{ color: 'var(--gold)', marginLeft: '4px' }}>NEW</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 大豆兑换区 */}
      <h3 className="section-title">🌰 大豆兑换区（终极奖励）</h3>
      <div className="shop-grid">
        {bigShopItems.map(item => (
          <div key={item.id} className="shop-item pixel-border" onClick={() => handleBuy(item)}>
            <div className="item-icon">{item.icon}</div>
            <div className="item-name">{item.name}</div>
            <div className="item-price">🌰 {item.price}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
              {item.category}
              {item.id!.length > 10 && <span style={{ color: 'var(--gold)', marginLeft: '4px' }}>NEW</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 购买确认弹窗 */}
      {selectedItem && (
        <PixelModal title="确认兑换" onClose={() => setSelectedItem(null)}>
          <div style={{ fontSize: '48px', margin: '12px 0' }}>{selectedItem.icon}</div>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedItem.name}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            {selectedItem.description}
          </p>
          <p style={{
            fontSize: '16px', color: 'var(--gold)', marginTop: '12px',
            fontWeight: 'bold',
          }}>
            价格：{selectedItem.currency === 'small_bean' ? '🫘' : '🌰'} {selectedItem.price}
          </p>
          {selectedItem.currency === 'small_bean' && (user?.beans_small || 0) < selectedItem.price && (
            <p style={{ color: 'var(--red)', fontSize: '12px' }}>小豆不足！</p>
          )}
          {selectedItem.currency === 'big_bean' && (user?.beans_big || 0) < selectedItem.price && (
            <p style={{ color: 'var(--red)', fontSize: '12px' }}>大豆不足！</p>
          )}
          <div className="modal-actions">
            <button className="pixel-btn" onClick={() => setSelectedItem(null)}>取消</button>
            <button
              className="pixel-btn primary"
              onClick={confirmBuy}
              disabled={confirming ||
                (selectedItem.currency === 'small_bean' && (user?.beans_small || 0) < selectedItem.price) ||
                (selectedItem.currency === 'big_bean' && (user?.beans_big || 0) < selectedItem.price)}
            >
              {confirming ? '兑换中...' : '确认兑换'}
            </button>
          </div>
        </PixelModal>
      )}
    </div>
  )
}
