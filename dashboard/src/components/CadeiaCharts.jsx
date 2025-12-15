import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Treemap, Cell, PieChart, Pie
} from 'recharts';
import { Layers, GitBranch } from 'lucide-react';
import { formatCurrency, formatNumber, CHART_COLORS } from '../utils/format';

export default function CadeiaCharts({ data }) {
  const [view, setView] = useState('bar');

  if (!data?.byCadeia?.length) return null;

  const chartData = data.byCadeia.slice(0, 15).map((item, idx) => ({
    name: item.cadeia,
    valor: item.valor,
    producao: item.producao,
    area: item.area,
    fill: CHART_COLORS.rainbow[idx % CHART_COLORS.rainbow.length],
  }));

  // Data for treemap
  const treemapData = useMemo(() => {
    if (!data.hierarchy) return [];

    const grouped = {};
    data.hierarchy.forEach(item => {
      if (!grouped[item.cadeia]) {
        grouped[item.cadeia] = {
          name: item.cadeia,
          children: [],
        };
      }
      grouped[item.cadeia].children.push({
        name: item.produto_conciso,
        size: item.valor,
        subcadeia: item.subcadeia,
      });
    });

    return Object.values(grouped).map((cadeia, idx) => ({
      ...cadeia,
      color: CHART_COLORS.rainbow[idx % CHART_COLORS.rainbow.length],
    }));
  }, [data.hierarchy]);

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <Layers className="w-5 h-5 text-forest-600" />
          </div>
          <h3 className="section-title">Cadeias Produtivas</h3>
        </div>

        <div className="flex bg-earth-100 rounded-xl p-1">
          <button
            onClick={() => setView('bar')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${view === 'bar' ? 'bg-white text-forest-700 shadow-sm' : 'text-earth-600 hover:text-earth-800'}`}
          >
            Barras
          </button>
          <button
            onClick={() => setView('treemap')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${view === 'treemap' ? 'bg-white text-forest-700 shadow-sm' : 'text-earth-600 hover:text-earth-800'}`}
          >
            Treemap
          </button>
          <button
            onClick={() => setView('pie')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${view === 'pie' ? 'bg-white text-forest-700 shadow-sm' : 'text-earth-600 hover:text-earth-800'}`}
          >
            Pizza
          </button>
        </div>
      </div>

      {view === 'bar' && <BarChartView data={chartData} />}
      {view === 'treemap' && <TreemapView data={treemapData} />}
      {view === 'pie' && <PieChartView data={chartData} />}
    </div>
  );
}

function BarChartView({ data }) {
  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
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
            width={110}
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
          <Bar
            dataKey="valor"
            radius={[0, 6, 6, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TreemapView({ data }) {
  const COLORS = CHART_COLORS.rainbow;

  const CustomContent = ({ x, y, width, height, name, depth, color }) => {
    if (width < 40 || height < 30) return null;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={4}
          fill={depth === 1 ? color : `${color}99`}
          stroke="white"
          strokeWidth={2}
        />
        {width > 60 && height > 35 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={depth === 1 ? 12 : 10}
            fontWeight={depth === 1 ? 600 : 400}
          >
            {name?.length > 15 ? `${name.slice(0, 15)}...` : name}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="white"
          content={<CustomContent />}
        >
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
            }}
            formatter={(value, name, props) => {
              return [formatCurrency(value), props.payload?.name || 'Valor'];
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartView({ data }) {
  const total = data.reduce((sum, item) => sum + item.valor, 0);

  return (
    <div className="h-96 flex items-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="valor"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            innerRadius={60}
            paddingAngle={2}
            label={({ name, percent }) =>
              percent > 0.05 ? `${name.slice(0, 12)}${name.length > 12 ? '...' : ''} (${(percent * 100).toFixed(0)}%)` : ''
            }
            labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
            }}
            formatter={(value, name) => [
              formatCurrency(value),
              name
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
