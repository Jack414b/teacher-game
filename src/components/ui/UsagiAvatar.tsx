// 乌萨奇像素头像 — ちいかわ小可爱
const P = 5
const Y  = '#FFD966'  // 黄色身体
const DY = '#E8B730'  // 深黄
const PK = '#FFB6C1'  // 粉耳
const W  = '#FFF'     // 白眼
const BK = '#333'     // 黑眼珠
const T  = ''

const R = [
  [ T , T , DY, DY, DY, T , T , T , DY, DY, DY, T , T ],
  [ T , DY, Y , PK, Y , DY, T , DY, Y , PK, Y , DY, T ],
  [ T , DY, Y , Y , Y , Y , DY, Y , Y , Y , Y , DY, T ],
  [ T , DY, DY, Y , Y , Y , Y , Y , Y , Y , DY, DY, T ],
  [ T , Y , Y , Y , Y , Y , Y , Y , Y , Y , Y , Y , T ],
  [ Y , Y , Y , Y , W , BK, Y , Y , W , BK, Y , Y , Y ],
  [ Y , Y , Y , Y , Y , Y , Y , Y , Y , Y , Y , Y , Y ],
  [ Y , Y , Y , Y , PK, Y , Y , Y , Y , PK, Y , Y , Y ],
  [ T , Y , Y , Y , Y , Y , Y , Y , Y , Y , Y , Y , T ],
  [ T , T , Y , Y , Y , Y , Y , Y , Y , Y , Y , T , T ],
  [ T , T , DY, Y , Y , Y , T , Y , Y , Y , DY, T , T ],
  [ T , T , Y , Y , DY, T , T , T , DY, Y , Y , T , T ],
]

export default function UsagiAvatar() {
  const w = R[0].length * P
  const h = R.length * P
  return (
    <div style={{ width: w, height: h, position: 'relative', flexShrink: 0 }}>
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
