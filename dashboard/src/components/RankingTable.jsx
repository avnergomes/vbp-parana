import { useState, useMemo } from 'react';
import { Trophy, ChevronUp, ChevronDown, ArrowUpDown, Search } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

export default function RankingTable({
  data,
  type = 'produtos',
  onProdutoClick,
  onCadeiaClick,
  onMunicipioClick,
  selectedProduto,
  selectedCadeia,
  selectedMunicipio,
}) {
  const [sortField, setSortField] = useState('valor');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);

  const items = useMemo(() => {
    if (!data) return [];

    let source;
    let nameField;

    switch (type) {
      case 'produtos':
        source = data.byProduto || [];
        nameField = 'produto_conciso';
        break;
      case 'municipios':
        source = data.byMunicipio || [];
        nameField = 'nome';
        break;
      case 'regionais':
        source = data.byRegional || [];
        nameField = 'regional_idr';
        break;
      default:
        return [];
    }

    // Filter by search
    let filtered = source;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = source.filter(item => {
        const name = item[nameField] || '';
        return name.toLowerCase().includes(searchLower);
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return sorted.slice(0, limit);
  }, [data, type, search, sortField, sortDir, limit]);

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

  const columns = useMemo(() => {
    const base = [
      { key: 'rank', label: '#', sortable: false },
      { key: 'name', label: type === 'produtos' ? 'Produto' : type === 'municipios' ? 'Município' : 'Regional', sortable: false },
      { key: 'valor', label: 'Valor (R$)', sortable: true },
      { key: 'producao', label: 'Produção', sortable: true },
      { key: 'area', label: 'Área (ha)', sortable: true },
    ];

    if (type === 'produtos') {
      base.splice(2, 0, { key: 'cadeia', label: 'Cadeia', sortable: false });
    }

    if (type === 'municipios') {
      base.splice(2, 0, { key: 'regional', label: 'Regional', sortable: false });
    }

    return base;
  }, [type]);

  const getItemName = (item) => {
    switch (type) {
      case 'produtos': return item.produto_conciso;
      case 'municipios': return item.nome || item.municipio_oficial;
      case 'regionais': return item.regional_idr;
      default: return '';
    }
  };

  return (
    <div className="chart-container overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-harvest-100 rounded-lg">
            <Trophy className="w-5 h-5 text-harvest-600" />
          </div>
          <h3 className="section-title">
            Ranking de {type === 'produtos' ? 'Produtos' : type === 'municipios' ? 'Municípios' : 'Regionais'}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 text-sm border border-earth-200 rounded-xl focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500"
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
              const itemName = getItemName(item);
              const isSelected =
                (type === 'produtos' && selectedProduto === itemName) ||
                (type === 'municipios' && selectedMunicipio === itemName);

              const handleRowClick = () => {
                if (type === 'produtos' && onProdutoClick) {
                  onProdutoClick(itemName);
                } else if (type === 'municipios' && onMunicipioClick) {
                  onMunicipioClick(itemName);
                }
              };

              const handleCadeiaClick = (e) => {
                e.stopPropagation();
                if (onCadeiaClick && item.cadeia) {
                  onCadeiaClick(item.cadeia);
                }
              };

              return (
                <tr
                  key={index}
                  onClick={handleRowClick}
                  className={`transition-colors cursor-pointer
                    ${isSelected ? 'bg-primary-100 hover:bg-primary-150' : 'hover:bg-forest-50/50'}
                    ${isSelected ? 'ring-2 ring-inset ring-primary-400' : ''}`}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={index + 1} />
                  </td>
                  <td className={`px-4 py-3 font-medium ${isSelected ? 'text-primary-900' : 'text-earth-900'}`}>
                    {itemName}
                  </td>
                  {type === 'produtos' && (
                    <td className="px-4 py-3">
                      <span
                        onClick={handleCadeiaClick}
                        className={`badge cursor-pointer transition-colors
                          ${selectedCadeia === item.cadeia
                            ? 'bg-primary-200 text-primary-800 ring-2 ring-primary-400'
                            : 'badge-green hover:bg-forest-200'}`}
                      >
                        {item.cadeia}
                      </span>
                    </td>
                  )}
                  {type === 'municipios' && (
                    <td className="px-4 py-3 text-sm text-earth-600">
                      {item.regional}
                    </td>
                  )}
                  <td className={`px-4 py-3 font-semibold ${isSelected ? 'text-primary-700' : 'text-forest-700'}`}>
                    {formatCurrency(item.valor)}
                  </td>
                  <td className="px-4 py-3 text-earth-600">
                    {formatNumber(item.producao)}
                  </td>
                  <td className="px-4 py-3 text-earth-600">
                    {formatNumber(item.area)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="py-12 text-center text-earth-500">
          Nenhum resultado encontrado
        </div>
      )}

      <p className="text-xs text-center text-neutral-500 mt-3">
        Clique em uma linha para filtrar por {type === 'produtos' ? 'produto' : 'municipio'}
        {type === 'produtos' && ' ou clique na cadeia para filtrar por cadeia'}
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
