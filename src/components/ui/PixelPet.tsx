import { useState } from 'react'

// CSS 像素灰兔 "土土" —— 使用 box-shadow 绘制
const PIXEL = 4
const G = '#9e9e9e'   // 灰色
const LG = '#c8c8c8'  // 浅灰
const DG = '#6e6e6e'  // 深灰
const W = '#fafafa'   // 白色
const P = '#f8bbd0'   // 粉色（耳朵内）
const T = 'transparent'

// 12x9 像素兔子
const RABBIT: string[][] = [
//   0   1   2   3   4   5   6   7   8
  [ T , T , G , G , T , G , G , T , T ],  // 0 耳朵
  [ T , G , P , G , G , G , P , G , T ],  // 1
  [ T , G , G , G , G , G , G , G , T ],  // 2 头顶
  [ T , T , G , G , G , G , G , T , T ],  // 3
  [ T , T , W , G , G , G , W , T , T ],  // 4 眼睛行
  [ T , DG, DG, DG, DG, DG, DG, DG, T ],  // 5 身体
  [ LG, LG, LG, LG, LG, LG, LG, LG, LG],  // 6
  [ T , LG, LG, T , T , T , LG, LG, T ],  // 7 脚
]

export default function PixelPet() {
  const [animating, setAnimating] = useState(false)
  const size = RABBIT[0].length * PIXEL

  // 点击时跳一下
  const handleClick = () => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => setAnimating(false), 400)
  }

  return (
    <div
      onClick={handleClick}
      title="土土 - 点击摸摸"
      style={{
        position: 'relative',
        width: size, height: RABBIT.length * PIXEL,
        cursor: 'pointer',
        transform: animating ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        flexShrink: 0,
      }}
    >
      {RABBIT.map((row, y) =>
        row.map((color, x) =>
          color !== T ? (
            <div
              key={`${y}-${x}`}
              style={{
                position: 'absolute',
                left: x * PIXEL, top: y * PIXEL,
                width: PIXEL, height: PIXEL,
                background: color,
              }}
            />
          ) : null
        )
      )}
    </div>
  )
}
