import { useMemo } from 'react'
import * as d3 from 'd3'

const MARGIN = { top: 40, right: 100, bottom: 40, left: 100 }

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
  '#0891b2', '#db2777', '#65a30d', '#c2410c', '#6366f1'
]

function polarToCartesian(angle, radius) {
  return {
    x: radius * Math.cos(angle - Math.PI / 2),
    y: radius * Math.sin(angle - Math.PI / 2)
  }
}

export default function RadarChart({
  data,
  title = "Comparação de Municípios",
  width = 500,
  height = 420
}) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null

    // Get top 5 municipalities (sorted by valor)
    const sorted = [...data].sort((a, b) => b.valor - a.valor)
    const top5 = sorted.slice(0, 5)

    // Normalize data for radar chart
    const maxValor = Math.max(...top5.map(d => d.valor))
    const maxProducao = Math.max(...top5.map(d => d.producao))
    const maxArea = Math.max(...top5.map(d => d.area)) || 1

    // Calculate derived metrics
    const withMetrics = top5.map(d => ({
      ...d,
      valorPerArea: d.area > 0 ? d.valor / d.area : 0,
      producaoPerArea: d.area > 0 ? d.producao / d.area : 0
    }))

    const maxValorPerArea = Math.max(...withMetrics.map(d => d.valorPerArea)) || 1
    const maxProducaoPerArea = Math.max(...withMetrics.map(d => d.producaoPerArea)) || 1

    const variables = [
      { key: 'valor', label: 'Valor (R$)', max: maxValor },
      { key: 'producao', label: 'Producao (t)', max: maxProducao },
      { key: 'area', label: 'Area (ha)', max: maxArea },
      { key: 'valorPerArea', label: 'R$/ha', max: maxValorPerArea },
      { key: 'producaoPerArea', label: 't/ha', max: maxProducaoPerArea }
    ]

    // Support both field name conventions (nome/municipio_oficial/regional_idr)
    const normalized = withMetrics.map((mun, idx) => ({
      name: mun.nome || mun.municipio_oficial || mun.regional_idr || 'N/A',
      regional: mun.regional || mun.meso_idr || '',
      colorIdx: idx,
      values: variables.map(v => ({
        axis: v.label,
        value: v.max > 0 ? mun[v.key] / v.max : 0,
        rawValue: mun[v.key]
      }))
    }))

    return { municipalities: normalized, variables }
  }, [data])

  if (!chartData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-slate-400">
          Sem dados de municípios disponíveis
        </div>
      </div>
    )
  }

  const innerWidth = width - MARGIN.left - MARGIN.right
  const innerHeight = height - MARGIN.top - MARGIN.bottom
  const radius = Math.min(innerWidth, innerHeight) / 2
  const centerX = width / 2
  const centerY = height / 2

  const { municipalities, variables } = chartData
  const angleSlice = (2 * Math.PI) / variables.length

  // Create scales
  const radiusScale = d3.scaleLinear().domain([0, 1]).range([0, radius])

  // Grid levels
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0]

  // Create axis lines and labels
  const axes = variables.map((v, i) => {
    const angle = angleSlice * i
    const lineEnd = polarToCartesian(angle, radius)
    const labelPos = polarToCartesian(angle, radius + 25)
    return { ...v, angle, lineEnd, labelPos, index: i }
  })

  // Create path for each municipality
  const radarLine = d3.lineRadial()
    .radius(d => radiusScale(d.value))
    .angle((d, i) => i * angleSlice)
    .curve(d3.curveLinearClosed)

  const formatValue = (v, axis) => {
    if (axis.includes('R$')) {
      if (v >= 1e9) return `R$${(v/1e9).toFixed(1)}B`
      if (v >= 1e6) return `R$${(v/1e6).toFixed(1)}M`
      return `R$${v.toFixed(0)}`
    }
    if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`
    if (v >= 1e3) return `${(v/1e3).toFixed(1)}K`
    return v.toFixed(1)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>

      <div className="flex flex-col lg:flex-row gap-6">
        <svg width={width} height={height} className="mx-auto">
          <g transform={`translate(${centerX}, ${centerY})`}>
            {/* Grid circles */}
            {levels.map((level, i) => (
              <circle
                key={`grid-${i}`}
                r={radiusScale(level)}
                fill="none"
                stroke="#e2e8f0"
                strokeDasharray="4,4"
              />
            ))}

            {/* Grid level labels */}
            {levels.map((level, i) => (
              <text
                key={`label-${i}`}
                x={4}
                y={-radiusScale(level)}
                fill="#94a3b8"
                fontSize={9}
                alignmentBaseline="middle"
              >
                {(level * 100).toFixed(0)}%
              </text>
            ))}

            {/* Axis lines */}
            {axes.map((axis, i) => (
              <line
                key={`axis-${i}`}
                x1={0}
                y1={0}
                x2={axis.lineEnd.x}
                y2={axis.lineEnd.y}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
            ))}

            {/* Axis labels */}
            {axes.map((axis, i) => (
              <text
                key={`axis-label-${i}`}
                x={axis.labelPos.x}
                y={axis.labelPos.y}
                fill="#475569"
                fontSize={10}
                fontWeight="500"
                textAnchor={
                  Math.abs(axis.labelPos.x) < 10 ? 'middle' :
                  axis.labelPos.x > 0 ? 'start' : 'end'
                }
                alignmentBaseline="middle"
              >
                {axis.label}
              </text>
            ))}

            {/* Municipality radar areas */}
            {municipalities.map((mun, munIdx) => {
              const pathData = radarLine(mun.values)
              const color = COLORS[munIdx % COLORS.length]

              return (
                <g key={mun.name} className="group">
                  <path
                    d={pathData}
                    fill={color}
                    fillOpacity={0.15}
                    stroke={color}
                    strokeWidth={2}
                    className="transition-all group-hover:fill-opacity-30"
                  />
                  {/* Data points */}
                  {mun.values.map((val, i) => {
                    const pos = polarToCartesian(i * angleSlice, radiusScale(val.value))
                    return (
                      <circle
                        key={`${mun.name}-point-${i}`}
                        cx={pos.x}
                        cy={pos.y}
                        r={4}
                        fill={color}
                        stroke="white"
                        strokeWidth={1}
                        className="cursor-pointer"
                      >
                        <title>{`${mun.name}: ${val.axis} = ${formatValue(val.rawValue, val.axis)}`}</title>
                      </circle>
                    )
                  })}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-2 min-w-[160px]">
          <h4 className="text-sm font-semibold text-slate-600 mb-2">Top 5 Municípios</h4>
          {municipalities.map((mun, i) => (
            <div key={mun.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{mun.name}</p>
                <p className="text-xs text-slate-400">{mun.regional}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
