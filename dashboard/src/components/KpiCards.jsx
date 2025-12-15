import { TrendingUp, TrendingDown, Minus, DollarSign, Package, MapPin } from 'lucide-react';
import { formatCurrency, formatNumber, formatVariation, calculateVariation } from '../utils/format';

export default function KpiCards({ data, previousData }) {
  if (!data) return null;

  const { totals } = data;

  // Calculate year-over-year variation if previous data available
  const valorVariation = previousData
    ? calculateVariation(totals.valor, previousData.totals?.valor)
    : null;
  const producaoVariation = previousData
    ? calculateVariation(totals.producao, previousData.totals?.producao)
    : null;
  const areaVariation = previousData
    ? calculateVariation(totals.area, previousData.totals?.area)
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      <KpiCard
        icon={DollarSign}
        label="Valor Bruto da Produção"
        value={formatCurrency(totals.valor)}
        variation={valorVariation}
        color="green"
        description="Soma do VBP no período selecionado"
      />
      <KpiCard
        icon={Package}
        label="Produção Total"
        value={formatNumber(totals.producao)}
        variation={producaoVariation}
        color="blue"
        description="Quantidade total produzida"
      />
      <KpiCard
        icon={MapPin}
        label="Área Cultivada"
        value={formatNumber(totals.area, 'ha')}
        variation={areaVariation}
        color="yellow"
        description="Área total em hectares"
      />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, variation, color, description }) {
  const colorClasses = {
    green: {
      bg: 'bg-forest-50',
      icon: 'text-forest-600',
      bar: 'from-forest-500 to-forest-600',
    },
    blue: {
      bg: 'bg-water-50',
      icon: 'text-water-600',
      bar: 'from-water-500 to-water-600',
    },
    yellow: {
      bg: 'bg-harvest-50',
      icon: 'text-harvest-600',
      bar: 'from-harvest-500 to-harvest-600',
    },
  };

  const colors = colorClasses[color];
  const variationData = variation !== null ? formatVariation(variation) : null;

  return (
    <div className="stat-card group">
      {/* Colored bar */}
      <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${colors.bar} rounded-l-2xl`} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="kpi-label">{label}</span>
          </div>
          <div className="kpi-value">{value}</div>
          {description && (
            <p className="text-xs text-earth-400 mt-1">{description}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`p-3 ${colors.bg} rounded-xl transition-transform group-hover:scale-110`}>
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </div>

          {variationData && (
            <VariationBadge variation={variationData} />
          )}
        </div>
      </div>
    </div>
  );
}

function VariationBadge({ variation }) {
  const { text, isPositive, isNegative } = variation;

  if (text === '-') return null;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
      ${isPositive ? 'bg-forest-100 text-forest-700' : ''}
      ${isNegative ? 'bg-red-100 text-red-700' : ''}
      ${!isPositive && !isNegative ? 'bg-earth-100 text-earth-600' : ''}`}
    >
      {isPositive && <TrendingUp className="w-3 h-3" />}
      {isNegative && <TrendingDown className="w-3 h-3" />}
      {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
      {text}
    </div>
  );
}
