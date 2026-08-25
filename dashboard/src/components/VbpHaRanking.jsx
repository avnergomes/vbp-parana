import { useState, useMemo } from 'react';
import { Sprout, ChevronUp, ChevronDown, ArrowUpDown, Search } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

/**
 * Ranking ANUAL de VBP por hectare (municípios ou regionais).
 *
 * Metodologia: VBP/ha = VBP do ano selecionado ÷ ÁREA TERRITORIAL TOTAL
 * (base IBGE 2022; regionais = soma dos seus municípios). O denominador é o
 * território, constante, e não a área cultivada declarada no VBP — a área
 * declarada não cobre todos os produtos (pecuária etc. não informa área).
 * Seletor de ano local; padrão = ano mais recente do recorte.
 *
 * Fonte: evolutionMunicipio / evolutionRegional (ano × entidade com areaIbge,
 * já com todos os filtros cruzados aplicados pelo useFilteredData).
 */
export default function VbpHaRanking({
  data,
  type = 'municipios',
  onMunicipioClick,
  onRegionalClick,
  selectedMunicipio,
  selectedRegional,
  isLoading = false,
}) {
  const [sortField, setSortField] = useState('vbpHa');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const [ano, setAno] = useState(null); // null = ano mais recente disponível

  const isMunicipios = type === 'municipios';

  const source = isMunicipios ? data?.evolutionMunicipio : data?.evolutionRegional;

  const years = useMemo(() => {
    if (!source?.length) return [];
    return Array.from(new Set(source.map(item => item.ano))).sort((a, b) => b - a);
  }, [source]);

  // Se o ano escolhido saiu do recorte (ex.: filtro de período mudou),
  // cai no mais recente disponível.
  const effectiveAno = ano !== null && years.includes(ano) ? ano : years[0];

  const items = useMemo(() => {
    if (!source?.length || effectiveAno == null) return [];

    const ranked = source
      .filter(item => item.ano === effectiveAno)
      .map(item => ({
        nome: isMunicipios ? item.nome : item.regional_idr,
        regional: isMunicipios ? item.regional : null,
        valor: item.valor,
        areaIbge: item.areaIbge,
        vbpHa: item.areaIbge > 0 ? item.valor / item.areaIbge : null,
      }))
      .filter(item => item.nome && item.vbpHa !== null);

    let filtered = ranked;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = ranked.filter(item => item.nome.toLowerCase().includes(searchLower));
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return sorted.slice(0, limit);
  }, [source, effectiveAno, isMunicipios, search, sortField, sortDir, limit]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-earth-400" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-4 h-4 text-forest-600" />
      : <ChevronUp className="w-4 h-4 text-forest-600" />;
  };

  const columns = [
    { key: 'rank', label: '#', sortable: false },
    { key: 'nome', label: isMunicipios ? 'Município' : 'Regional', sortable: false },
    ...(isMunicipios ? [{ key: 'regional', label: 'Regional', sortable: false }] : []),
    { key: 'vbpHa', label: 'VBP/ha (R$)', sortable: true },
    { key: 'valor', label: 'Valor (R$)', sortable: true },
    { key: 'areaIbge', label: 'Área territorial (ha)', sortable: true },
  ];

  const handleRowClick = (item) => {
    if (isMunicipios && onMunicipioClick) {
      onMunicipioClick(item.nome);
    } else if (!isMunicipios && onRegionalClick) {
      onRegionalClick(item.nome);
    }
  };

  return (
    <div className="chart-container overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <Sprout className="w-5 h-5 text-forest-600" />
          </div>
          <h3 className="section-title">
            {isMunicipios ? 'Ranking VBP/ha por Município' : 'Ranking VBP/ha por Regional'}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={effectiveAno ?? ''}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="filter-select w-auto"
            aria-label="Ano do ranking"
            disabled={years.length === 0}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 text-base border border-earth-200 rounded-xl focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 min-h-[44px]"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="filter-select w-auto"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className="border-b border-earth-200">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-earth-600 uppercase tracking-wider
                    ${col.sortable ? 'cursor-pointer hover:bg-earth-50' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon field={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100">
            {items.map((item, index) => {
              const isSelected = isMunicipios
                ? selectedMunicipio === item.nome
                : selectedRegional === item.nome;

              return (
                <tr
                  key={item.nome}
                  onClick={() => handleRowClick(item)}
                  className={`transition-colors cursor-pointer
                    ${isSelected ? 'bg-primary-100 hover:bg-primary-150 ring-2 ring-inset ring-primary-400' : 'hover:bg-forest-50/50'}`}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={index + 1} />
                  </td>
                  <td className={`px-4 py-3 font-medium ${isSelected ? 'text-primary-900' : 'text-earth-900'}`}>
                    {item.nome}
                  </td>
                  {isMunicipios && (
                    <td className="px-4 py-3 text-sm text-earth-600">
                      {item.regional}
                    </td>
                  )}
                  <td className={`px-4 py-3 font-semibold ${isSelected ? 'text-primary-700' : 'text-forest-700'}`}>
                    {formatCurrency(item.vbpHa)}/ha
                  </td>
                  <td className="px-4 py-3 text-earth-600">
                    {formatCurrency(item.valor)}
                  </td>
                  <td className="px-4 py-3 text-earth-600">
                    {formatNumber(item.areaIbge)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="py-12 text-center text-earth-500">
          {isLoading ? (
            <span className="inline-flex items-center gap-2" role="status">
              <span
                className="w-4 h-4 border-2 border-earth-400 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              Carregando dados detalhados...
            </span>
          ) : (
            'Sem dados para exibir'
          )}
        </div>
      )}

      <p className="text-xs text-center text-neutral-500 mt-3">
        VBP/ha = VBP do ano selecionado ÷ área territorial total do município (base IBGE), não a área cultivada. Clique em uma linha para filtrar.
      </p>
    </div>
  );
}

function RankBadge({ rank }) {
  const colors = {
    1: 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900',
    2: 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700',
    3: 'bg-gradient-to-br from-amber-600 to-amber-700 text-amber-100',
  };

  if (rank <= 3) {
    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shadow-sm ${colors[rank]}`}>
        {rank}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-7 h-7 text-sm text-earth-500">
      {rank}
    </span>
  );
}
