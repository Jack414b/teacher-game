import { useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelModal } from '../components/ui/PixelComponents'
import { SMALL_BEAN_SHOP, BIG_BEAN_SHOP } from '../lib/gameData'
import { updateUser, createRedemption } from '../lib/supabase'
import type { ShopItem } from '../types'

interface Props { showToast: (msg: string) => void }

export default function ShopPage({ showToast }: Props) {
  const { user, setUser } = useGameStore()
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)
  const [confirming, setConfirming] = useState(false)

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

      {/* 小豆兑换区 */}
      <h3 className="section-title">🫘 小豆兑换区（日常补给）</h3>
      <div className="shop-grid">
        {SMALL_BEAN_SHOP.map(item => (
          <div key={item.id} className="shop-item pixel-border" onClick={() => handleBuy(item)}>
            <div className="item-icon">{item.icon}</div>
            <div className="item-name">{item.name}</div>
            <div className="item-price">🫘 {item.price}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>{item.category}</div>
          </div>
        ))}
      </div>

      {/* 大豆兑换区 */}
      <h3 className="section-title">🌰 大豆兑换区（终极奖励）</h3>
      <div className="shop-grid">
        {BIG_BEAN_SHOP.map(item => (
          <div key={item.id} className="shop-item pixel-border" onClick={() => handleBuy(item)}>
            <div className="item-icon">{item.icon}</div>
            <div className="item-name">{item.name}</div>
            <div className="item-price">🌰 {item.price}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>{item.category}</div>
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
