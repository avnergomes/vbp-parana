import { useMemo, useState } from 'react'
import * as d3 from 'd3'

// Colorblind-friendly palette for cadeias
const CADEIA_COLORS = {
  'Lavoura': '#0072B2',
  'Avicultura': '#D55E00',
  'Bovinocultura': '#CC79A7',
  'Suinocultura': '#E69F00',
  'Florestal': '#009E73',
  'Fruticultura': '#56B4E9',
  'Olericultura': '#F0E442',
  'Aquicultura & Pesca': '#0072B2',
  'Cerealicultura': '#999999',
  'Apicultura': '#D55E00',
}

// Default color for cadeias not in the palette
const DEFAULT_COLOR = '#64748b'

export default function SunburstChart({
  data,
  title = "Hierarquia de Valor: Cadeia > Subcadeia > Produto",
  width = 600,
  height = 600,
  onCadeiaClick,
  onSubcadeiaClick,
  onProdutoClick,
}) {
  const [selectedPath, setSelectedPath] = useState(null)
  const [hoveredArc, setHoveredArc] = useState(null)

  const chartData = useMemo(() => {
    if (!data?.hierarchy || data.hierarchy.length === 0) return null

    // Build hierarchy structure
    const root = { name: 'VBP', children: [] }
    const cadeiaMap = {}

    data.hierarchy.forEach(item => {
      const { cadeia, subcadeia, produto_conciso, valor } = item
      if (valor <= 0) return

      // Create cadeia level
      if (!cadeiaMap[cadeia]) {
        cadeiaMap[cadeia] = { name: cadeia, children: [], subcadeiaMap: {} }
        root.children.push(cadeiaMap[cadeia])
      }

      // Create subcadeia level
      if (!cadeiaMap[cadeia].subcadeiaMap[subcadeia]) {
        cadeiaMap[cadeia].subcadeiaMap[subcadeia] = {
          name: subcadeia,
          cadeia: cadeia,
          children: []
        }
        cadeiaMap[cadeia].children.push(cadeiaMap[cadeia].subcadeiaMap[subcadeia])
      }

      // Add produto level
      cadeiaMap[cadeia].subcadeiaMap[subcadeia].children.push({
        name: produto_conciso,
        cadeia: cadeia,
        subcadeia: subcadeia,
        value: valor,
      })
    })

    // Create d3 hierarchy
    const hierarchy = d3.hierarchy(root)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value)

    // Create partition layout
    const partition = d3.partition()
      .size([2 * Math.PI, (Math.min(width, height) / 2) - 20])

    return partition(hierarchy)
  }, [data, width, height])

  if (!chartData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-dark-700 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-dark-400">
          Sem dados hierarquicos disponiveis
        </div>
      </div>
    )
  }

  const centerX = width / 2
  const centerY = height / 2

  // Arc generator
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => d.y0)
    .outerRadius(d => d.y1)

  // Get color for a node based on its cadeia
  const getColor = (d) => {
    if (d.depth === 0) return '#f8fafc' // Root

    const cadeia = d.depth === 1 ? d.data.name : d.data.cadeia || d.parent?.data.name
    const baseColor = CADEIA_COLORS[cadeia] || DEFAULT_COLOR

    if (d.depth === 1) return baseColor
    if (d.depth === 2) return d3.color(baseColor).brighter(0.3).toString()
    return d3.color(baseColor).brighter(0.6).toString()
  }

  // Format value
  const formatValue = (v) => {
    if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`
    return `R$ ${v.toFixed(0)}`
  }

  // Handle click
  const handleClick = (d) => {
    if (d.depth === 0) return

    const path = d.ancestors().reverse().slice(1).map(a => a.data.name).join(' > ')
    setSelectedPath(path === selectedPath ? null : path)

    if (d.depth === 1 && onCadeiaClick) {
      onCadeiaClick(d.data.name)
    } else if (d.depth === 2 && onSubcadeiaClick) {
      onSubcadeiaClick(d.data.name)
    } else if (d.depth === 3 && onProdutoClick) {
      onProdutoClick(d.data.name)
    }
  }

  // Get all descendants except root
  const descendants = chartData.descendants().filter(d => d.depth > 0)

  // Calculate label visibility (only show for arcs with enough angle)
  const shouldShowLabel = (d) => {
    const angle = d.x1 - d.x0
    return d.depth === 1 && angle > 0.1
  }

  // Calculate label position
  const getLabelTransform = (d) => {
    const angle = ((d.x0 + d.x1) / 2) * 180 / Math.PI - 90
    const radius = (d.y0 + d.y1) / 2
    return `rotate(${angle}) translate(${radius},0) rotate(${angle > 90 ? 180 : 0})`
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-dark-700 mb-4">{title}</h3>

      <div className="flex flex-col lg:flex-row gap-6">
        <svg width={width} height={height} className="mx-auto">
          <g transform={`translate(${centerX}, ${centerY})`}>
            {/* Center circle with total */}
            <circle r={chartData.y0 + 40} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={1} />
            <text textAnchor="middle" dy="-0.5em" className="fill-dark-600 text-sm font-medium">
              Total
            </text>
            <text textAnchor="middle" dy="1em" className="fill-dark-800 text-lg font-bold">
              {formatValue(chartData.value)}
            </text>

            {/* Arcs */}
            {descendants.map((d, i) => {
              const isHovered = hoveredArc === i
              const path = d.ancestors().reverse().slice(1).map(a => a.data.name).join(' > ')
              const isSelected = selectedPath && path.startsWith(selectedPath)

              return (
                <g key={i}>
                  <path
                    d={arc(d)}
                    fill={getColor(d)}
                    stroke="white"
                    strokeWidth={d.depth === 1 ? 2 : 1}
                    opacity={isSelected ? 1 : (selectedPath ? 0.3 : (isHovered ? 1 : 0.85))}
                    className="cursor-pointer transition-opacity duration-200"
                    onClick={() => handleClick(d)}
                    onMouseEnter={() => setHoveredArc(i)}
                    onMouseLeave={() => setHoveredArc(null)}
                  >
                    <title>
                      {d.ancestors().reverse().slice(1).map(a => a.data.name).join(' > ')}
                      {'\n'}Valor: {formatValue(d.value)}
                      {'\n'}({((d.value / chartData.value) * 100).toFixed(1)}% do total)
                    </title>
                  </path>

                  {/* Labels for first level (cadeias) */}
                  {shouldShowLabel(d) && (
                    <text
                      transform={getLabelTransform(d)}
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={10}
                      fontWeight={500}
                      fill="#334155"
                      pointerEvents="none"
                    >
                      {d.data.name.length > 12 ? d.data.name.slice(0, 10) + '...' : d.data.name}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>

        {/* Legend and details */}
        <div className="flex flex-col gap-4 min-w-[200px]">
          <div>
            <h4 className="text-sm font-semibold text-dark-600 mb-2">Principais Cadeias</h4>
            <div className="space-y-1">
              {chartData.children
                ?.sort((a, b) => b.value - a.value)
                .slice(0, 8)
                .map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 px-2 py-1 rounded"
                    onClick={() => handleClick(d)}
                  >
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getColor(d) }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-dark-700 truncate block">
                        {d.data.name}
                      </span>
                    </div>
                    <span className="text-xs text-dark-500 font-mono">
                      {((d.value / chartData.value) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Selected path info */}
          {selectedPath && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-dark-600 mb-2">Selecionado</h4>
              <p className="text-xs text-dark-500">{selectedPath}</p>
              <button
                onClick={() => setSelectedPath(null)}
                className="mt-2 text-xs text-primary-600 hover:text-primary-700"
              >
                Limpar selecao
              </button>
            </div>
          )}

          {/* Hover info */}
          {hoveredArc !== null && descendants[hoveredArc] && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-dark-600 mb-2">Detalhes</h4>
              <p className="text-xs text-dark-700 font-medium">
                {descendants[hoveredArc].data.name}
              </p>
              <p className="text-sm font-mono text-dark-800 mt-1">
                {formatValue(descendants[hoveredArc].value)}
              </p>
              <p className="text-xs text-dark-500">
                {((descendants[hoveredArc].value / chartData.value) * 100).toFixed(2)}% do total
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb levels explanation */}
      <div className="mt-4 pt-4 border-t flex items-center gap-6 text-xs text-dark-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-primary-500 rounded" />
          <span>1o nivel: Cadeia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-primary-300 rounded" />
          <span>2o nivel: Subcadeia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-primary-200 rounded" />
          <span>3o nivel: Produto</span>
        </div>
      </div>
    </div>
  )
}
