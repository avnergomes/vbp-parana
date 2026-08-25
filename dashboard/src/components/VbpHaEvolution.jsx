import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber, CHART_COLORS } from '../utils/format';

const TOP_N = 8;

/**
 * Evolução do VBP por hectare (linhas por regional ou por município).
 *
 * Cada linha é VBP do ano ÷ ÁREA TERRITORIAL TOTAL da entidade (base IBGE
 * 2022, campo areaIbge; regionais = soma dos seus municípios), sobre o
 * recorte filtrado (cadeia/subcadeia/produto/geo/período). Não usa a área
 * cultivada declarada no VBP. Mostra as TOP_N entidades pelo VBP/ha
 * acumulado do período; a entidade selecionada via filtro interativo entra
 * sempre, mesmo fora do top.
 */
export default function VbpHaEvolution({
  data,
  onRegionalClick,
  onMunicipioClick,
  selectedRegional,
  selectedMunicipio,
  isLoading = false,
}) {
  const [view, setView] = useState('regionais');
  const isMunicipios = view === 'municipios';

  // Resumo do recorte: VBP/ha do ANO MAIS RECENTE disponível (valor do ano ÷
  // soma das áreas territoriais IBGE das entidades presentes). Não acumula
  // valor de vários anos sobre o mesmo território.
  const summary = useMemo(() => {
    const src = data?.evolutionMunicipio || data?.evolutionRegional;
    if (!src?.length) return null;
    const lastAno = Math.max(...src.map(item => item.ano));
    let valor = 0;
    let areaIbge = 0;
    src.forEach(item => {
      if (item.ano !== lastAno) return;
      valor += item.valor;
      areaIbge += item.areaIbge || 0;
    });
    return areaIbge > 0 ? { ano: lastAno, vbpHa: valor / areaIbge } : null;
  }, [data?.evolutionMunicipio, data?.evolutionRegional]);

  const { chartData, entities } = useMemo(() => {
    const source = isMunicipios ? data?.evolutionMunicipio : data?.evolutionRegional;
    if (!source?.length) return { chartData: [], entities: [] };

    const nameOf = (item) => (isMunicipios ? item.nome : item.regional_idr);

    // Ranquear entidades pelo VBP/ha acumulado do período (valor total ÷
    // área territorial IBGE, constante — equivale a ranquear pela média anual).
    const totals = {};
    source.forEach(item => {
      const name = nameOf(item);
      if (!totals[name]) totals[name] = { valor: 0, areaIbge: item.areaIbge || 0 };
      totals[name].valor += item.valor;
    });

    const ranked = Object.entries(totals)
      .filter(([, t]) => t.areaIbge > 0)
      .map(([name, t]) => ({ name, vbpHa: t.valor / t.areaIbge }))
      .sort((a, b) => b.vbpHa - a.vbpHa);

    const selected = isMunicipios ? selectedMunicipio : selectedRegional;
    let top = ranked.slice(0, TOP_N).map(e => e.name);
    if (selected && totals[selected] && !top.includes(selected)) {
      top = [...top.slice(0, TOP_N - 1), selected];
    }
    const topSet = new Set(top);

    // Pivot: uma linha por ano, uma coluna (VBP/ha) por entidade do top.
    const byYear = {};
    source.forEach(item => {
      const name = nameOf(item);
      if (!topSet.has(name) || !(item.areaIbge > 0)) return;
      if (!byYear[item.ano]) byYear[item.ano] = { ano: item.ano };
      byYear[item.ano][name] = Math.round(item.valor / item.areaIbge);
    });

    return {
      chartData: Object.values(byYear).sort((a, b) => a.ano - b.ano),
      entities: top,
    };
  }, [data?.evolutionRegional, data?.evolutionMunicipio, isMunicipios, selectedRegional, selectedMunicipio]);

  const selected = isMunicipios ? selectedMunicipio : selectedRegional;

  const handleLegendClick = (e) => {
    if (!e?.value) return;
    if (isMunicipios && onMunicipioClick) {
      onMunicipioClick(e.value);
    } else if (!isMunicipios && onRegionalClick) {
      onRegionalClick(e.value);
    }
  };

  return (
    <div className="chart-container">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-forest-600" />
          </div>
          <div>
            <h3 className="section-title">Evolução do VBP por Hectare</h3>
            {summary !== null && (
              <p className="text-sm text-earth-500">
                VBP/ha do recorte: <span className="font-semibold text-forest-700">{formatCurrency(summary.vbpHa)}/ha · {summary.ano}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex bg-earth-100 rounded-xl p-1">
          <button
            onClick={() => setView('regionais')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${view === 'regionais' ? 'bg-white text-forest-700 shadow-sm' : 'text-earth-600 hover:text-earth-800'}`}
          >
            Regionais
          </button>
          <button
            onClick={() => setView('municipios')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${view === 'municipios' ? 'bg-white text-forest-700 shadow-sm' : 'text-earth-600 hover:text-earth-800'}`}
          >
            Municípios
          </button>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
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
                formatter={(value) => [`${formatCurrency(value)}/ha`, '']}
                labelFormatter={(label) => `Ano ${label}`}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: '11px', cursor: 'pointer' }}
                onClick={handleLegendClick}
              />
              {entities.map((name, idx) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_COLORS.rainbow[idx % CHART_COLORS.rainbow.length]}
                  strokeWidth={selected === name ? 3.5 : 2}
                  strokeOpacity={selected && selected !== name ? 0.3 : 1}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-96 flex items-center justify-center text-earth-500">
          {isLoading ? (
            <span className="inline-flex items-center gap-2" role="status">
              <span
                className="w-4 h-4 border-2 border-earth-400 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              Carregando dados detalhados...
            </span>
          ) : (
            <span className="text-center px-6">
              Sem dados para exibir
            </span>
          )}
        </div>
      )}

      {selected && (
        <p className="text-xs text-center text-primary-600 mt-2 font-medium">
          {isMunicipios ? 'Município selecionado' : 'Regional selecionada'}: {selected}
        </p>
      )}
      {/* Textos literais (sem interpolar TOP_N): o runtime i18n casa nós de
          texto exatos e a interpolação dividiria o nó. */}
      <p className="text-xs text-center text-neutral-500 mt-1">
        Top 8 por VBP/ha acumulado no período. Clique na legenda para filtrar.
      </p>
      <p className="text-xs text-center text-neutral-500 mt-1">
        VBP/ha calculado sobre a área territorial total (base IBGE), não sobre a área cultivada.
      </p>
    </div>
  );
}
