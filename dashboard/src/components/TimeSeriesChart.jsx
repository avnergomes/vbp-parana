// ATLAS-A11Y-HEX-SWEPT
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

export default function TimeSeriesChart({ data, metric = 'valor', onAnoClick, selectedAno }) {
  if (!data?.timeSeries?.length) return null;

  const chartData = data.timeSeries.map(item => ({
    ano: item.ano,
    valor: item.valor,
    producao: item.producao,
    area: item.area,
    selected: selectedAno === item.ano,
  }));

  const handleClick = (event) => {
    if (onAnoClick && event?.activePayload?.[0]?.payload?.ano) {
      onAnoClick(event.activePayload[0].payload.ano);
    }
  };

  const metricConfig = {
    valor: {
      color: '#0072B2',
      label: 'Valor (R$)',
      formatter: (v) => formatCurrency(v),
      yAxisId: 'left',
    },
    producao: {
      color: '#3d729c',
      label: 'Produção',
      formatter: (v) => formatNumber(v),
      yAxisId: 'center',
    },
    area: {
      color: '#c89b3c',
      label: 'Área (ha)',
      formatter: (v) => formatNumber(v, 'ha'),
      yAxisId: 'right',
    },
  };

  const config = metricConfig[metric];

  // Função para formatar valores grandes de forma compacta
  const formatCompact = (value) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(0);
  };

  return (
    <div className="chart-container">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-forest-100 rounded-lg">
          <TrendingUp className="w-5 h-5 text-forest-600" />
        </div>
        <h3 className="section-title">Evolução Temporal</h3>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 120, left: 20, bottom: 10 }} onClick={handleClick} style={{ cursor: 'pointer' }}>
            <defs>
              <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0072B2" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0072B2" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProducao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3d729c" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3d729c" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c89b3c" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#c89b3c" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="ano"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            {/* Eixo Y esquerdo - Valor (R$) */}
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fontSize: 11, fill: '#0072B2' }}
              tickLine={false}
              axisLine={{ stroke: '#0072B2', strokeWidth: 2 }}
              tickFormatter={(value) => formatCompact(value)}
              label={{
                value: 'Valor (R$)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: '#0072B2', fontSize: 12 }
              }}
            />
            {/* Eixo Y central - Produção */}
            <YAxis
              yAxisId="center"
              orientation="right"
              tick={{ fontSize: 11, fill: '#3d729c' }}
              tickLine={false}
              axisLine={{ stroke: '#3d729c', strokeWidth: 2 }}
              tickFormatter={(value) => formatCompact(value)}
              label={{
                value: 'Produção',
                angle: 90,
                position: 'insideRight',
                style: { textAnchor: 'middle', fill: '#3d729c', fontSize: 12 }
              }}
            />
            {/* Eixo Y direito - Área */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#c89b3c' }}
              tickLine={false}
              axisLine={{ stroke: '#c89b3c', strokeWidth: 2 }}
              tickFormatter={(value) => formatCompact(value)}
              label={{
                value: 'Área (ha)',
                angle: 90,
                position: 'insideRight',
                style: { textAnchor: 'middle', fill: '#c89b3c', fontSize: 12 }
              }}
              dx={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px',
              }}
              formatter={(value, name) => {
                const cfg = metricConfig[name];
                return [cfg ? cfg.formatter(value) : value, cfg ? cfg.label : name];
              }}
              labelFormatter={(label) => `Ano ${label}`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => metricConfig[value]?.label || value}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="valor"
              stroke="#0072B2"
              strokeWidth={3}
              dot={{ r: 4, fill: '#0072B2', strokeWidth: 2, stroke: 'white' }}
              activeDot={{ r: 6, fill: '#0072B2', strokeWidth: 2, stroke: 'white' }}
            />
            <Line
              yAxisId="center"
              type="monotone"
              dataKey="producao"
              stroke="#3d729c"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3d729c', strokeWidth: 2, stroke: 'white' }}
              activeDot={{ r: 5, fill: '#3d729c', strokeWidth: 2, stroke: 'white' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="area"
              stroke="#c89b3c"
              strokeWidth={2}
              dot={{ r: 3, fill: '#c89b3c', strokeWidth: 2, stroke: 'white' }}
              activeDot={{ r: 5, fill: '#c89b3c', strokeWidth: 2, stroke: 'white' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        <LegendItem color="#0072B2" label="Valor (R$)" axis="Eixo esquerdo" />
        <LegendItem color="#3d729c" label="Produção" axis="Eixo direito 1" />
        <LegendItem color="#c89b3c" label="Área (ha)" axis="Eixo direito 2" />
      </div>
      {selectedAno && (
        <p className="text-xs text-center text-primary-600 mt-2 font-medium">
          Ano selecionado: {selectedAno}
        </p>
      )}
      <p className="text-xs text-center text-neutral-500 mt-1">Clique em um ponto para filtrar por ano</p>
    </div>
  );
}

function LegendItem({ color, label, axis }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm text-earth-600">{label}</span>
      {axis && <span className="text-xs text-earth-400">({axis})</span>}
    </div>
  );
}
