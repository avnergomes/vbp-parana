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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
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
      bg: 'bg-primary-50',
      icon: 'text-primary-600',
      bar: 'from-primary-500 to-primary-600',
    },
    blue: {
      bg: 'bg-secondary-50',
      icon: 'text-secondary-600',
      bar: 'from-secondary-500 to-secondary-600',
    },
    yellow: {
      bg: 'bg-accent-50',
      icon: 'text-accent-600',
      bar: 'from-accent-500 to-accent-600',
    },
  };

  const colors = colorClasses[color];
  const variationData = variation !== null ? formatVariation(variation) : null;

  return (
    <div className="stat-card group">
      {/* Colored bar */}
      <div className={`absolute top-0 left-0 w-1 md:w-1.5 h-full bg-gradient-to-b ${colors.bar} rounded-l-2xl`} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="kpi-label text-[10px] md:text-xs">{label}</span>
          </div>
          <div className="kpi-value text-xl md:text-2xl lg:text-3xl break-all">{value}</div>
          {description && (
            <p className="text-[10px] md:text-xs text-neutral-400 mt-1">{description}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className={`p-2 md:p-3 ${colors.bg} rounded-lg md:rounded-xl transition-transform group-hover:scale-110`}>
            <Icon className={`w-5 h-5 md:w-6 md:h-6 ${colors.icon}`} />
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
    <div className={`flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg text-[10px] md:text-xs font-medium
      ${isPositive ? 'bg-primary-100 text-primary-700' : ''}
      ${isNegative ? 'bg-red-100 text-red-700' : ''}
      ${!isPositive && !isNegative ? 'bg-neutral-100 text-neutral-600' : ''}`}
    >
      {isPositive && <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />}
      {isNegative && <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3" />}
      {!isPositive && !isNegative && <Minus className="w-2.5 h-2.5 md:w-3 md:h-3" />}
      {text}
    </div>
  );
}
