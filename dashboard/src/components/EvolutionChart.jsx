import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend
} from 'recharts';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber, CHART_COLORS, calculateVariation, formatVariation } from '../utils/format';

export default function EvolutionChart({ data, onCadeiaClick, selectedCadeia }) {
  const [view, setView] = useState('stacked');

  if (!data?.evolutionCadeia?.length) return null;

  // Prepare data for stacked area chart
  const stackedData = useMemo(() => {
    const byYear = {};
    const cadeias = new Set();

    data.evolutionCadeia.forEach(item => {
      if (!byYear[item.ano]) {
        byYear[item.ano] = { ano: item.ano };
      }
      byYear[item.ano][item.cadeia] = item.valor;
      cadeias.add(item.cadeia);
    });

    return {
      data: Object.values(byYear).sort((a, b) => a.ano - b.ano),
      cadeias: Array.from(cadeias),
    };
  }, [data.evolutionCadeia]);

  // Calculate YoY variations
  const variations = useMemo(() => {
    if (!data.timeSeries || data.timeSeries.length < 2) return null;

    const sorted = [...data.timeSeries].sort((a, b) => a.ano - b.ano);
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    return {
      valor: calculateVariation(last.valor, prev.valor),
      producao: calculateVariation(last.producao, prev.producao),
      area: calculateVariation(last.area, prev.area),
      anoAtual: last.ano,
      anoAnterior: prev.ano,
    };
  }, [data.timeSeries]);

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <Activity className="w-5 h-5 text-forest-600" />
          </div>
          <h3 className="section-title">Evolução por Cadeia</h3>
        </div>

        <div className="flex bg-earth-100 rounded-xl p-1">
          <button
            onClick={() => setView('stacked')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${view === 'stacked' ? 'bg-white text-forest-700 shadow-sm' : 'text-earth-600 hover:text-earth-800'}`}
          >
            Área Empilhada
          </button>
          <button
            onClick={() => setView('variation')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${view === 'variation' ? 'bg-white text-forest-700 shadow-sm' : 'text-earth-600 hover:text-earth-800'}`}
          >
            Variação Anual
          </button>
        </div>
      </div>

      {view === 'stacked' && (
        <StackedAreaView
          data={stackedData.data}
          cadeias={stackedData.cadeias}
          onCadeiaClick={onCadeiaClick}
          selectedCadeia={selectedCadeia}
        />
      )}

      {view === 'variation' && variations && (
        <VariationView variations={variations} />
      )}
    </div>
  );
}

function StackedAreaView({ data, cadeias, onCadeiaClick, selectedCadeia }) {
  const topCadeias = cadeias.slice(0, 8);

  const handleLegendClick = (e) => {
    if (onCadeiaClick && e?.value) {
      onCadeiaClick(e.value);
    }
  };

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <defs>
            {topCadeias.map((cadeia, idx) => (
              <linearGradient key={cadeia} id={`color${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.rainbow[idx]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={CHART_COLORS.rainbow[idx]} stopOpacity={0.2}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="ano"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => formatNumber(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
            }}
            formatter={(value) => [formatCurrency(value), '']}
            labelFormatter={(label) => `Ano ${label}`}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: '11px', cursor: 'pointer' }}
            onClick={handleLegendClick}
          />
          {topCadeias.map((cadeia, idx) => (
            <Area
              key={cadeia}
              type="monotone"
              dataKey={cadeia}
              stackId="1"
              stroke={CHART_COLORS.rainbow[idx]}
              fill={`url(#color${idx})`}
              fillOpacity={selectedCadeia && selectedCadeia !== cadeia ? 0.3 : 1}
              strokeOpacity={selectedCadeia && selectedCadeia !== cadeia ? 0.3 : 1}
              strokeWidth={selectedCadeia === cadeia ? 3 : 1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      {selectedCadeia && (
        <p className="text-xs text-center text-primary-600 mt-2 font-medium">
          Cadeia selecionada: {selectedCadeia}
        </p>
      )}
      <p className="text-xs text-center text-neutral-500 mt-1">Clique na legenda para filtrar por cadeia</p>
    </div>
  );
}

function VariationView({ variations }) {
  const items = [
    {
      label: 'Valor (R$)',
      variation: variations.valor,
      color: 'forest',
    },
    {
      label: 'Produção',
      variation: variations.producao,
      color: 'water',
    },
    {
      label: 'Área (ha)',
      variation: variations.area,
      color: 'harvest',
    },
  ];

  return (
    <div className="space-y-6 py-4">
      <div className="text-center mb-6">
        <p className="text-sm text-earth-500">
          Variação de <span className="font-semibold">{variations.anoAnterior}</span> para{' '}
          <span className="font-semibold">{variations.anoAtual}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item, idx) => {
          const varData = formatVariation(item.variation);
          return (
            <VariationCard
              key={idx}
              label={item.label}
              variation={varData}
              color={item.color}
            />
          );
        })}
      </div>

      {/* Variation bars */}
      <div className="space-y-4 mt-8">
        {items.map((item, idx) => {
          const percent = item.variation ? item.variation * 100 : 0;
          const isPositive = percent > 0;
          const width = Math.min(Math.abs(percent), 100);

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-earth-600">{item.label}</span>
                <span className={isPositive ? 'text-forest-600' : 'text-red-600'}>
                  {isPositive ? '+' : ''}{percent.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-earth-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPositive ? 'bg-forest-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VariationCard({ label, variation, color }) {
  const colorClasses = {
    forest: 'from-forest-500 to-forest-600',
    water: 'from-water-500 to-water-600',
    harvest: 'from-harvest-500 to-harvest-600',
  };

  return (
    <div className="p-6 bg-gradient-to-br from-earth-50 to-white rounded-xl border border-earth-100">
      <div className="text-sm text-earth-500 mb-2">{label}</div>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]}`}>
          {variation.isPositive ? (
            <TrendingUp className="w-5 h-5 text-white" />
          ) : variation.isNegative ? (
            <TrendingDown className="w-5 h-5 text-white" />
          ) : (
            <Activity className="w-5 h-5 text-white" />
          )}
        </div>
        <span className={`text-2xl font-bold ${
          variation.isPositive ? 'text-forest-600' :
          variation.isNegative ? 'text-red-600' :
          'text-earth-600'
        }`}>
          {variation.text}
        </span>
      </div>
    </div>
  );
}
