import { useState, useEffect } from 'react'

// Jellycat风格灰色像素兔 土土 — 18x14 像素
const P = 4 // 像素大小
const G  = '#b0b0b0' // 身体灰
const LG = '#d4d4d4' // 浅灰
const DG = '#8a8a8a' // 深灰
const W  = '#f5f5f5' // 白
const PK = '#f8c8d8' // 粉（耳内/鼻）
const BK = '#555'    // 眼
const T  = ''

// prettier-ignore
const RABBIT: string[][] = [
//   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17
  [ T , T , T , G , G , T , T , T , T , T , T , T , T , G , G , T , T , T ], // 0  左耳尖
  [ T , T , G , PK, G , T , T , T , T , T , T , T , T , G , PK, G , T , T ], // 1  左耳粉
  [ T , T , G , G , G , G , T , T , T , T , T , T , G , G , G , G , T , T ], // 2  左耳根
  [ T , T , T , T , T , G , G , T , T , T , T , G , G , T , T , T , T , T ], // 3  头顶
  [ T , T , T , T , T , T , G , G , G , G , G , G , T , T , T , T , T , T ], // 4  头
  [ T , T , T , T , T , T , LG, LG, LG, LG, LG, LG, T , T , T , T , T , T ], // 5
  [ T , T , T , T , T , DG, W , BK, LG, LG, BK, W , DG, T , T , T , T , T ], // 6  眼
  [ T , T , T , T , T , DG, W , W , LG, LG, W , W , DG, T , T , T , T , T ], // 7  脸颊
  [ T , T , T , T , T , DG, LG, PK, LG, LG, PK, LG, DG, T , T , T , T , T ], // 8  鼻+腮
  [ T , T , T , T , T , T , DG, G , G , G , G , DG, T , T , T , T , T , T ], // 9  身体上
  [ T , T , T , T , T , T , G , G , G , G , G , G , T , T , T , T , T , T ], // 10 身体
  [ T , T , T , T , T , G , W , G , G , G , G , W , G , T , T , T , T , T ], // 11 肚皮
  [ T , T , T , T , G , G , G , T , T , T , T , G , G , G , T , T , T , T ], // 12 腿
  [ T , T , T , T , G , G , T , T , T , T , T , T , G , G , T , T , T , T ], // 13 脚
]

const WIDTH = RABBIT[0].length * P
const HEIGHT = RABBIT.length * P

export default function PixelPet() {
  const [pos, setPos] = useState(0)
  const [dir, setDir] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setPos(p => {
        const next = p + dir * 2
        if (next > 60) { setDir(-1); return 60 }
        if (next < -20) { setDir(1); return -20 }
        return next
      })
    }, 120)
    return () => clearInterval(interval)
  }, [dir])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '52px',
        left: `${pos}px`,
        width: WIDTH, height: HEIGHT,
        transition: 'left 0.1s linear',
        zIndex: 5,
        pointerEvents: 'none',
        transform: `scaleX(${dir})`,
      }}
    >
      {RABBIT.map((row, y) =>
        row.map((color, x) =>
          color ? (
            <div
              key={`${y}-${x}`}
              style={{
                position: 'absolute', left: x * P, top: y * P,
                width: P, height: P, background: color,
              }}
            />
          ) : null
        )
      )}
    </div>
  )
}
