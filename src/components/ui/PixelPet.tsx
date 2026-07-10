import { useState, useEffect } from 'react'

const P = 4
// 使用土土.png 原版调色板
const BG  = '#504C54'  // 轮廓深灰
const SK  = '#C09B88'  // 身体皮肤
const CR  = '#FAF7DA'  // 奶油白
const PK  = '#FFEBF4'  // 粉（耳朵内侧）
const RD  = '#D40708'  // 红眼
const T   = ''

// 奶油白兔，粉耳红眼，经典像素风 — 12×14
const R: string[][] = [
  [ T , T , T , BG, BG, T , T , T , BG, BG, T , T ],
  [ T , T , BG, BG, BG, BG, T , BG, BG, BG, BG, T ],
  [ T , T , BG, PK, PK, BG, BG, BG, PK, PK, BG, T ],
  [ T , T , BG, PK, PK, PK, PK, PK, PK, PK, BG, T ],
  [ T , T , T , BG, CR, CR, CR, CR, CR, BG, T , T ],
  [ T , T , BG, BG, CR, CR, CR, CR, CR, BG, BG, T ],
  [ T , BG, BG, SK, CR, RD, CR, RD, CR, SK, BG, BG],
  [ T , BG, SK, CR, CR, CR, CR, CR, CR, CR, SK, BG],
  [ T , BG, SK, CR, PK, CR, CR, CR, PK, CR, SK, BG],
  [ T , BG, SK, CR, CR, CR, CR, CR, CR, CR, SK, BG],
  [ T , T , BG, SK, SK, SK, SK, SK, SK, SK, BG, T ],
  [ T , T , BG, BG, SK, SK, SK, SK, SK, BG, BG, T ],
  [ T , T , T , BG, SK, T , T , T , SK, BG, T , T ],
  [ T , T , T , BG, BG, T , T , T , BG, BG, T , T ],
]

const WID = R[0].length * P

export default function PixelPet() {
  const [x, setX] = useState(10)
  const [dir, setDir] = useState(1)
  const [bob, setBob] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setBob(b => (b + 1) % 2)
      setX(prev => {
        const n = prev + dir * 2
        if (n > 100) { setDir(-1); return 100 }
        if (n < -10) { setDir(1); return -10 }
        return n
      })
    }, 180)
    return () => clearInterval(t)
  }, [dir])

  return (
    <div style={{
      position: 'absolute', bottom: '48px', left: x,
      width: WID, height: R.length * P,
      zIndex: 10, pointerEvents: 'none',
      transform: `scaleX(${dir}) translateY(${bob * 2}px)`,
      transition: 'left 0.18s linear, transform 0.18s',
    }}>
      {R.map((row, y) =>
        row.map((c, x) => c ? (
          <div key={`${y}-${x}`} style={{
            position: 'absolute', left: x * P, top: y * P,
            width: P, height: P, background: c,
          }} />
        ) : null)
      )}
    </div>
  )
}
