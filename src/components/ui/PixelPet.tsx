import { useState, useEffect } from 'react'

const P = 4
const G  = '#c0c0c0'  // 灰
const W  = '#fff'      // 白
const PK = '#ffb6c1'   // 粉
const BK = '#333'      // 黑
const T  = ''

// 经典可爱像素兔 — 10x12
const R: string[][] = [
  [ T , T , T , W , W , W , W , T , T , T ],
  [ T , T , W , PK, PK, PK, PK, W , T , T ],
  [ T , T , W , W , W , W , W , W , T , T ],
  [ T , W , W , W , G , G , W , W , W , T ],
  [ W , W , G , G , G , G , G , G , W , W ],
  [ W , G , G , G , G , G , G , G , G , W ],
  [ W , G , G , BK, G , G , BK, G , G , W ],
  [ W , G , G , G , G , G , G , G , G , W ],
  [ W , G , PK, G , G , G , G , PK, G , W ],
  [ T , W , G , G , G , G , G , G , W , T ],
  [ T , W , G , G , T , T , G , G , W , T ],
  [ T , T , W , W , T , T , W , W , T , T ],
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
