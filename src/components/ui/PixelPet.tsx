import { useState, useEffect } from 'react'

const P = 4

// 从图片提取的精确颜色
const OUT  = '#1A1A1A'   // 轮廓黑
const HEAD = '#9B888E'   // 头部灰紫
const FACE = '#FAFAF8'   // 嘴部白
const PINK = '#F4DAD3'   // 耳朵内侧粉 / 腮红
const EYE  = '#140101'   // 黑眼
const T    = ''           // 透明

// 基于图片逐像素重建 — 16行×13列
const R: string[][] = [
  [ T , T , T , T, OUT, OUT , T , OUT , OUT, T, T , T , T],  
  [ T , T , T , OUT, PINK, OUT , T , OUT , PINK, OUT, T , T , T ],  
  [ T , T , OUT , PINK, PINK, OUT , T , OUT, PINK, PINK, OUT , T , T],  
  [ T , T , OUT , PINK, PINK, OUT , T , OUT, PINK, PINK, OUT , T , T],  
  [ T , T , OUT , PINK, PINK, OUT , T , OUT, PINK, PINK, OUT , T , T],  
  [ T , T , OUT , PINK, PINK, OUT , T , OUT, PINK, PINK, OUT , T , T],   
  [ T , T , OUT , PINK, HEAD, OUT , T , OUT, HEAD, PINK, OUT , T , T],  
  [ T , T , T , OUT, HEAD, HEAD , OUT , HEAD, HEAD, OUT, T , T , T], 
  [ T , T , OUT , HEAD, HEAD, HEAD , HEAD , HEAD, HEAD, HEAD, OUT , T , T], 
  [ T , OUT , HEAD , HEAD, HEAD, HEAD , HEAD , HEAD, HEAD, HEAD, HEAD , OUT , T], 
  [ T , OUT , HEAD , HEAD, HEAD, HEAD , HEAD , HEAD, HEAD, HEAD, HEAD , OUT , T], 
  [ OUT , HEAD , HEAD , EYE, HEAD, HEAD , HEAD , HEAD, HEAD, EYE, HEAD , HEAD , OUT], 
  [ OUT , HEAD , HEAD , EYE, FACE, FACE , OUT , FACE, FACE, EYE, HEAD , HEAD , OUT],
  [ OUT , HEAD , FACE , FACE, FACE, FACE , FACE , FACE, FACE, FACE, FACE , HEAD , OUT], 
  [ T , OUT , FACE , FACE, FACE, FACE , FACE , FACE, FACE, FACE, FACE , OUT , T], 
  [ T , T , OUT , OUT, OUT, OUT , OUT , OUT, OUT, OUT, OUT , T , T], 
]

const WID = R[0].length * P
const HEI = R.length * P

export default function PixelRabbit() {
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
      width: WID, height: HEI,
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
