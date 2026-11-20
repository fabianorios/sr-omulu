type MandalaOrixasProps = {
  className?: string
  /** Soft watermark mode for small screens */
  watermark?: boolean
}

const STROKE = '#8C7A5B'
const FILL_SOFT = 'rgba(140, 122, 91, 0.08)'

type Orixa = {
  name: string
  angle: number
  symbol: 'opaxoro' | 'xaxara' | 'espada' | 'ofa' | 'oxe' | 'eruexim' | 'abebe-ondas' | 'ibiri' | 'abebe-espelho'
}

/** Nine Orixás clockwise from 12h — names only, no duplicates. */
const ORIXAS: Orixa[] = [
  { name: 'Oxalá', angle: 0, symbol: 'opaxoro' },
  { name: 'Omulu', angle: 40, symbol: 'xaxara' },
  { name: 'Ogum', angle: 80, symbol: 'espada' },
  { name: 'Oxóssi', angle: 120, symbol: 'ofa' },
  { name: 'Xangô', angle: 160, symbol: 'oxe' },
  { name: 'Iansã', angle: 200, symbol: 'eruexim' },
  { name: 'Iemanjá', angle: 240, symbol: 'abebe-ondas' },
  { name: 'Nanã Buruquê', angle: 280, symbol: 'ibiri' },
  { name: 'Oxum', angle: 320, symbol: 'abebe-espelho' },
]

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function SymbolMark({
  type,
  x,
  y,
  size = 14,
}: {
  type: Orixa['symbol']
  x: number
  y: number
  size?: number
}) {
  const s = size
  const common = {
    fill: 'none' as const,
    stroke: STROKE,
    strokeWidth: 1.15,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (type) {
    case 'opaxoro':
      // Opaxorô — staff with double crozier
      return (
        <g transform={`translate(${x}, ${y})`}>
          <line x1={0} y1={-s * 0.55} x2={0} y2={s * 0.55} {...common} />
          <path
            d={`M ${-s * 0.28} ${-s * 0.35} Q 0 ${-s * 0.55} ${s * 0.28} ${-s * 0.35}`}
            {...common}
          />
          <path
            d={`M ${-s * 0.22} ${-s * 0.1} Q 0 ${-s * 0.28} ${s * 0.22} ${-s * 0.1}`}
            {...common}
          />
          <circle cx={0} cy={s * 0.55} r={1.4} fill={STROKE} stroke="none" />
        </g>
      )
    case 'xaxara':
      // Palha / Xaxará — straw whisk
      return (
        <g transform={`translate(${x}, ${y})`}>
          <line x1={0} y1={-s * 0.15} x2={0} y2={s * 0.55} {...common} />
          {[ -0.35, -0.18, 0, 0.18, 0.35 ].map((dx) => (
            <line
              key={dx}
              x1={0}
              y1={-s * 0.1}
              x2={dx * s}
              y2={-s * 0.55}
              {...common}
              strokeWidth={1}
            />
          ))}
          <ellipse cx={0} cy={-s * 0.08} rx={s * 0.18} ry={s * 0.1} {...common} />
        </g>
      )
    case 'espada':
      // Espada / escudo
      return (
        <g transform={`translate(${x}, ${y})`}>
          <path
            d={`M 0 ${-s * 0.55} L ${s * 0.12} ${-s * 0.15} L ${s * 0.12} ${s * 0.25} L 0 ${s * 0.4} L ${-s * 0.12} ${s * 0.25} L ${-s * 0.12} ${-s * 0.15} Z`}
            {...common}
          />
          <line x1={-s * 0.22} y1={s * 0.08} x2={s * 0.22} y2={s * 0.08} {...common} />
          <path
            d={`M ${s * 0.28} ${-s * 0.2} L ${s * 0.48} ${-s * 0.35} L ${s * 0.55} ${-s * 0.05} L ${s * 0.35} ${s * 0.1} Z`}
            {...common}
          />
        </g>
      )
    case 'ofa':
      // Ofá — bow
      return (
        <g transform={`translate(${x}, ${y})`}>
          <path
            d={`M ${-s * 0.35} ${-s * 0.5} Q ${s * 0.45} 0 ${-s * 0.35} ${s * 0.5}`}
            {...common}
          />
          <line x1={-s * 0.35} y1={-s * 0.5} x2={-s * 0.35} y2={s * 0.5} {...common} />
          <line x1={-s * 0.3} y1={0} x2={s * 0.4} y2={0} {...common} />
          <path d={`M ${s * 0.4} 0 L ${s * 0.28} ${-s * 0.08} M ${s * 0.4} 0 L ${s * 0.28} ${s * 0.08}`} {...common} />
        </g>
      )
    case 'oxe':
      // Oxê — double axe
      return (
        <g transform={`translate(${x}, ${y})`}>
          <line x1={0} y1={-s * 0.15} x2={0} y2={s * 0.55} {...common} />
          <path
            d={`M 0 ${-s * 0.15} C ${-s * 0.5} ${-s * 0.45} ${-s * 0.45} ${s * 0.15} 0 ${s * 0.05} C ${s * 0.45} ${s * 0.15} ${s * 0.5} ${-s * 0.45} 0 ${-s * 0.15}`}
            {...common}
          />
        </g>
      )
    case 'eruexim':
      // Eruexim / ventos — fan with wind lines
      return (
        <g transform={`translate(${x}, ${y})`}>
          <path
            d={`M 0 ${s * 0.45} Q ${-s * 0.5} ${-s * 0.1} 0 ${-s * 0.5} Q ${s * 0.5} ${-s * 0.1} 0 ${s * 0.45}`}
            {...common}
          />
          <line x1={0} y1={s * 0.45} x2={0} y2={-s * 0.15} {...common} />
          <path d={`M ${s * 0.35} ${-s * 0.35} Q ${s * 0.55} ${-s * 0.2} ${s * 0.45} 0`} {...common} strokeWidth={0.9} />
          <path d={`M ${s * 0.28} ${-s * 0.15} Q ${s * 0.48} 0 ${s * 0.35} ${s * 0.15}`} {...common} strokeWidth={0.9} />
        </g>
      )
    case 'abebe-ondas':
      // Abebé / ondas
      return (
        <g transform={`translate(${x}, ${y})`}>
          <circle cx={0} cy={-s * 0.12} r={s * 0.32} {...common} />
          <line x1={0} y1={s * 0.2} x2={0} y2={s * 0.5} {...common} />
          <path
            d={`M ${-s * 0.4} ${s * 0.28} Q ${-s * 0.2} ${s * 0.12} 0 ${s * 0.28} Q ${s * 0.2} ${s * 0.44} ${s * 0.4} ${s * 0.28}`}
            {...common}
            strokeWidth={0.95}
          />
        </g>
      )
    case 'ibiri':
      // Ibiri — twisted staff / snake motif
      return (
        <g transform={`translate(${x}, ${y})`}>
          <path
            d={`M ${-s * 0.08} ${s * 0.55} Q ${s * 0.25} ${s * 0.25} ${-s * 0.08} ${-s * 0.05} Q ${-s * 0.35} ${-s * 0.3} ${-s * 0.05} ${-s * 0.55}`}
            {...common}
          />
          <path
            d={`M ${s * 0.08} ${s * 0.55} Q ${-s * 0.25} ${s * 0.25} ${s * 0.08} ${-s * 0.05} Q ${s * 0.35} ${-s * 0.3} ${s * 0.05} ${-s * 0.55}`}
            {...common}
          />
          <circle cx={0} cy={-s * 0.55} r={1.6} fill={STROKE} stroke="none" />
        </g>
      )
    case 'abebe-espelho':
      // Abebé / espelho
      return (
        <g transform={`translate(${x}, ${y})`}>
          <circle cx={0} cy={-s * 0.15} r={s * 0.35} {...common} />
          <circle cx={0} cy={-s * 0.15} r={s * 0.2} {...common} strokeWidth={0.9} />
          <line x1={0} y1={s * 0.2} x2={0} y2={s * 0.52} {...common} />
          <line x1={-s * 0.12} y1={s * 0.35} x2={s * 0.12} y2={s * 0.35} {...common} />
        </g>
      )
  }
}

function lotusPetalPath(cx: number, cy: number, innerR: number, outerR: number, angle: number, halfSpread = 10) {
  const tip = polar(cx, cy, outerR, angle)
  const left = polar(cx, cy, innerR, angle - halfSpread)
  const right = polar(cx, cy, innerR, angle + halfSpread)
  const midL = polar(cx, cy, (innerR + outerR) / 2, angle - halfSpread * 0.55)
  const midR = polar(cx, cy, (innerR + outerR) / 2, angle + halfSpread * 0.55)
  return `M ${left.x} ${left.y} Q ${midL.x} ${midL.y} ${tip.x} ${tip.y} Q ${midR.x} ${midR.y} ${right.x} ${right.y}`
}

export function MandalaOrixas({ className = '', watermark = false }: MandalaOrixasProps) {
  const size = 640
  const cx = size / 2
  const cy = size / 2
  const ringMedallion = 248
  const medallionR = 42

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Mandala dos nove Orixás"
      className={className}
      style={watermark ? { opacity: 0.12 } : undefined}
    >
      <defs>
        <radialGradient id="mandalaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(140,122,91,0.12)" />
          <stop offset="70%" stopColor="rgba(140,122,91,0.03)" />
          <stop offset="100%" stopColor="rgba(140,122,91,0)" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={300} fill="url(#mandalaGlow)" />

      {/* Concentric rings */}
      {[72, 118, 168, 218, 292].map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={STROKE}
          strokeWidth={r === 292 ? 1.4 : 1}
          opacity={r === 292 ? 0.85 : 0.55}
        />
      ))}

      {/* Inner lotus petals */}
      {Array.from({ length: 18 }, (_, i) => {
        const angle = i * 20
        return (
          <path
            key={`inner-${i}`}
            d={lotusPetalPath(cx, cy, 78, 155, angle, 8)}
            fill={FILL_SOFT}
            stroke={STROKE}
            strokeWidth={0.85}
            opacity={0.7}
          />
        )
      })}

      {/* Outer lotus petals between medallions */}
      {Array.from({ length: 18 }, (_, i) => {
        const angle = i * 20 + 10
        return (
          <path
            key={`outer-${i}`}
            d={lotusPetalPath(cx, cy, 175, 230, angle, 7)}
            fill="none"
            stroke={STROKE}
            strokeWidth={0.8}
            opacity={0.45}
          />
        )
      })}

      {/* Geometric spokes */}
      {Array.from({ length: 9 }, (_, i) => {
        const angle = i * 40
        const a = polar(cx, cy, 72, angle)
        const b = polar(cx, cy, 210, angle)
        return (
          <line
            key={`spoke-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={STROKE}
            strokeWidth={0.7}
            opacity={0.4}
          />
        )
      })}

      {/* Center seal */}
      <circle cx={cx} cy={cy} r={36} fill={FILL_SOFT} stroke={STROKE} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={22} fill="none" stroke={STROKE} strokeWidth={0.9} opacity={0.7} />
      <circle cx={cx} cy={cy} r={8} fill="none" stroke={STROKE} strokeWidth={1.1} />
      {Array.from({ length: 8 }, (_, i) => {
        const p = polar(cx, cy, 14, i * 45)
        return (
          <circle key={`star-${i}`} cx={p.x} cy={p.y} r={1.2} fill={STROKE} />
        )
      })}

      {/* Nine medallions — labels radially outside so they clear stroke geometry */}
      {ORIXAS.map((orixa) => {
        const c = polar(cx, cy, ringMedallion, orixa.angle)
        const label = polar(cx, cy, ringMedallion + medallionR + 14, orixa.angle)
        const isLong = orixa.name.length > 10

        return (
          <g key={orixa.name}>
            <circle
              cx={c.x}
              cy={c.y}
              r={medallionR}
              fill="#FAF8F2"
              stroke={STROKE}
              strokeWidth={1.35}
            />
            <circle
              cx={c.x}
              cy={c.y}
              r={medallionR - 6}
              fill="none"
              stroke={STROKE}
              strokeWidth={0.7}
              opacity={0.55}
              strokeDasharray="2.5 2.2"
            />
            <SymbolMark type={orixa.symbol} x={c.x} y={c.y - 2} size={16} />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={STROKE}
              fontFamily="'Playfair Display', 'Cormorant Garamond', Georgia, serif"
              fontSize={isLong ? 11 : 12.5}
              fontWeight={600}
              letterSpacing="0.02em"
            >
              {orixa.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
