import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Globe } from 'lucide-react';
import { formatCurrency, formatNumber, CHART_COLORS } from '../utils/format';

export default function RegionalChart({ data }) {
  if (!data?.byRegional?.length) return null;

  const chartData = useMemo(() => {
    return data.byRegional.slice(0, 22).map((item, idx) => ({
      name: item.regional_idr,
      valor: item.valor,
      producao: item.producao,
      area: item.area,
      fill: CHART_COLORS.rainbow[idx % CHART_COLORS.rainbow.length],
    }));
  }, [data.byRegional]);

  const total = chartData.reduce((sum, item) => sum + item.valor, 0);

  return (
    <div className="chart-container">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-earth-100 rounded-lg">
          <Globe className="w-5 h-5 text-earth-600" />
        </div>
        <h3 className="section-title">Produção por Regional IDR</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(value) => formatNumber(value)}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: '#374151' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                width={95}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px',
                }}
                formatter={(value) => [formatCurrency(value), 'Valor']}
              />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary cards */}
        <div className="space-y-3 overflow-y-auto max-h-96 scrollbar-thin pr-2">
          {chartData.map((item, idx) => {
            const percent = (item.valor / total * 100).toFixed(1);
            return (
              <div
                key={item.name}
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-earth-50 to-white rounded-xl border border-earth-100 hover:border-forest-200 transition-colors"
              >
                <div
                  className="w-2 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.fill }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-earth-900 truncate">{item.name}</div>
                  <div className="text-sm text-earth-500">
                    {formatCurrency(item.valor)} ({percent}%)
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-earth-400">Área</div>
                  <div className="text-sm font-medium text-earth-700">
                    {formatNumber(item.area)} ha
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
