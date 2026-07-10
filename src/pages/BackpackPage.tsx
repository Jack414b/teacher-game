import { useEffect, useState } from 'react'
import { useGameStore } from '../stores/gameStore'
import { PixelCard } from '../components/ui/PixelComponents'
import { getRedemptions } from '../lib/supabase'
import type { Redemption } from '../types'

interface Props { showToast: (msg: string) => void }

export default function BackpackPage(_props: Props) {
  const { user } = useGameStore()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])

  useEffect(() => {
    if (!user) return
    getRedemptions(user.id).then(setRedemptions).catch(() => {})
  }, [user])

  const cards = user?.cards || { 免早起卡: 0, 休息卡: 0, 免学休息日: 0 }
  const pendingItems = redemptions.filter(r => r.status !== 'delivered')

  return (
    <div className="page-content">
      <h2 style={{ fontSize: '16px', color: 'var(--gold)', marginBottom: '12px' }}>🎒 背包</h2>

      {/* 特权卡 */}
      <h3 className="section-title">🃏 特权卡</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <PixelCard>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px' }}>🛡️</div>
            <h4 style={{ fontSize: '13px', margin: '4px 0' }}>免早起券</h4>
            <p style={{ fontSize: '20px', color: 'var(--gold)', fontWeight: 'bold' }}>{cards['免早起卡'] || 0}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>使用后当日早鸟打卡自动完成</p>
          </div>
        </PixelCard>
        <PixelCard>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px' }}>💤</div>
            <h4 style={{ fontSize: '13px', margin: '4px 0' }}>休息卡</h4>
            <p style={{ fontSize: '20px', color: 'var(--gold)', fontWeight: 'bold' }}>{cards['休息卡'] || 0}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>休息日全天免打卡</p>
          </div>
        </PixelCard>
        <PixelCard>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px' }}>🏖️</div>
            <h4 style={{ fontSize: '13px', margin: '4px 0' }}>免学休息日</h4>
            <p style={{ fontSize: '20px', color: 'var(--gold)', fontWeight: 'bold' }}>{cards['免学休息日'] || 0}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>转盘大奖，合法躺平一天</p>
          </div>
        </PixelCard>
        <PixelCard>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px' }}>🎫</div>
            <h4 style={{ fontSize: '13px', margin: '4px 0' }}>免学半日券</h4>
            <p style={{ fontSize: '20px', color: 'var(--gold)', fontWeight: 'bold' }}>{(cards as Record<string, number>)['免学半日券'] || 0}</p>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>转盘大奖，休息半天</p>
          </div>
        </PixelCard>
      </div>

      {/* 待兑现 */}
      <h3 className="section-title" style={{ marginTop: '20px' }}>📦 待兑现</h3>
      {pendingItems.length === 0 ? (
        <p className="empty-state" style={{ padding: '20px 0' }}>暂无待兑现的奖励</p>
      ) : (
        pendingItems.map(r => (
          <PixelCard key={r.id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '13px' }}>{r.item_name}</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {r.item_type === 'small_bean' ? '🫘' : '🌰'} {r.price} · {new Date(r.created_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <span style={{
                fontSize: '10px', padding: '4px 8px',
                background: r.status === 'approved' ? 'var(--bg-card)' : 'var(--bg-card)',
                border: '1px solid var(--gold)',
                color: 'var(--gold)',
              }}>
                待Boss兑现
              </span>
            </div>
          </PixelCard>
        ))
      )}

      {/* 提示 */}
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: 'var(--text-dim)' }}>
        💡 特权卡在小豆商城「免早起券」购买，或转盘抽奖获取<br />
        兑换的实物奖励由 Boss 确认兑现
      </div>
    </div>
  )
}
