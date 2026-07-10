// 可爱女孩像素头像
const P = 4
const H  = '#4A2C2A'  // 深棕发
const S  = '#FFD5C2'  // 肤色
const PK = '#FFB6C1'  // 粉腮
const E  = '#5B3A29'  // 眼睛
const W  = '#FFF'     // 眼白
const T  = ''

const R = [
  [ T , T , H , H , H , H , H , H , T , T ],
  [ T , H , H , H , H , H , H , H , H , T ],
  [ T , H , S , S , S , S , S , S , H , T ],
  [ T , H , S , W , E , T , W , E , H , T ],
  [ T , H , S , S , S , S , S , S , H , T ],
  [ T , H , S , PK, S , S , PK, S , H , T ],
  [ T , H , S , S , S , S , S , S , H , T ],
  [ T , T , H , S , S , S , S , H , T , T ],
  [ T , T , T , H , H , H , H , T , T , T ],
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
