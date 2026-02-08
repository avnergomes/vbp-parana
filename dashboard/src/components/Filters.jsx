import { useState, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp, X, RotateCcw, Download } from 'lucide-react';

export default function Filters({
  metadata,
  produtoMap,
  geoMap,
  filters,
  onFiltersChange,
  filteredData,
  simplified = false
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!metadata) return null;

  const { anos, mesos, regionais, municipios, cadeias, subcadeias, produtos } = filters;
  const [anoMin, anoMax] = anos;

  // Derived filter options based on selections (only needed for non-simplified mode)
  const availableSubcadeias = useMemo(() => {
    if (simplified) return [];
    if (!produtoMap || cadeias.length === 0) return metadata.filters?.subcadeias || [];
    const subs = new Set();
    cadeias.forEach(cadeia => {
      if (produtoMap[cadeia]) {
        produtoMap[cadeia].subcadeias.forEach(s => subs.add(s));
      }
    });
    return Array.from(subs).sort();
  }, [produtoMap, cadeias, metadata, simplified]);

  const availableProdutos = useMemo(() => {
    if (simplified) return [];
    if (!produtoMap) return metadata.filters?.produtos || [];
    if (cadeias.length === 0 && subcadeias.length === 0) {
      return metadata.filters?.produtos || [];
    }
    const prods = new Set();
    const targetCadeias = cadeias.length > 0 ? cadeias : Object.keys(produtoMap);
    targetCadeias.forEach(cadeia => {
      if (produtoMap[cadeia]) {
        const targetSubs = subcadeias.length > 0
          ? subcadeias.filter(s => produtoMap[cadeia].subcadeias.includes(s))
          : produtoMap[cadeia].subcadeias;
        targetSubs.forEach(sub => {
          if (produtoMap[cadeia].produtos[sub]) {
            produtoMap[cadeia].produtos[sub].forEach(p => prods.add(p));
          }
        });
      }
    });
    return Array.from(prods).sort();
  }, [produtoMap, cadeias, subcadeias, metadata, simplified]);

  const availableRegionais = useMemo(() => {
    if (!geoMap || mesos.length === 0) return metadata.filters?.regionais || [];
    const regs = new Set();
    mesos.forEach(meso => {
      if (geoMap[meso]) {
        geoMap[meso].regionais.forEach(r => regs.add(r));
      }
    });
    return Array.from(regs).sort();
  }, [geoMap, mesos, metadata]);

  const availableMunicipios = useMemo(() => {
    if (!geoMap) return [];

    // Se há regionais selecionadas, mostrar municípios dessas regionais
    if (regionais.length > 0) {
      const munis = new Set();
      Object.entries(geoMap).forEach(([meso, data]) => {
        Object.entries(data.municipios || {}).forEach(([regional, munList]) => {
          if (regionais.includes(regional)) {
            munList.forEach(mun => munis.add(mun.municipio_oficial));
          }
        });
      });
      return Array.from(munis).sort();
    }

    // Se há mesos selecionadas, mostrar todos municípios dessas mesos
    if (mesos.length > 0) {
      const munis = new Set();
      mesos.forEach(meso => {
        if (geoMap[meso]) {
          Object.values(geoMap[meso].municipios || {}).forEach(munList => {
            munList.forEach(mun => munis.add(mun.municipio_oficial));
          });
        }
      });
      return Array.from(munis).sort();
    }

    // Senão, mostrar todos - metadata.filters.municipios é array de objetos
    if (!metadata.filters?.municipios) return [];
    return metadata.filters.municipios.map(m => m.municipio_oficial).sort();
  }, [geoMap, mesos, regionais, metadata]);

  const handleReset = () => {
    onFiltersChange({
      anos: [metadata.anoMin, metadata.anoMax],
      mesos: [],
      regionais: [],
      municipios: [],
      cadeias: [],
      subcadeias: [],
      produtos: [],
    });
  };

  const handleExportCSV = () => {
    if (!filteredData) return;

    // Preparar dados para exportação
    const { byMunicipio, byProduto, byRegional, timeSeries, totals } = filteredData;

    // Criar CSV com múltiplas seções
    let csvContent = '';

    // Seção 1: Totais
    csvContent += 'TOTAIS\n';
    csvContent += 'Métrica,Valor\n';
    csvContent += `Valor Total (R$),${totals.valor.toLocaleString('pt-BR')}\n`;
    csvContent += `Produção Total,${totals.producao.toLocaleString('pt-BR')}\n`;
    csvContent += `Área Total (ha),${totals.area.toLocaleString('pt-BR')}\n`;
    csvContent += '\n';

    // Seção 2: Série Temporal
    csvContent += 'SÉRIE TEMPORAL\n';
    csvContent += 'Ano,Valor (R$),Produção,Área (ha)\n';
    timeSeries.forEach(row => {
      csvContent += `${row.ano},${row.valor},${row.producao},${row.area}\n`;
    });
    csvContent += '\n';

    // Seção 3: Por Produto
    csvContent += 'POR PRODUTO\n';
    csvContent += 'Produto,Cadeia,Subcadeia,Valor (R$),Produção,Área (ha)\n';
    byProduto.forEach(row => {
      csvContent += `"${row.produto_conciso}","${row.cadeia}","${row.subcadeia}",${row.valor},${row.producao},${row.area}\n`;
    });
    csvContent += '\n';

    // Seção 4: Por Regional
    csvContent += 'POR REGIONAL\n';
    csvContent += 'Regional,Mesorregião,Valor (R$),Produção,Área (ha)\n';
    byRegional.forEach(row => {
      csvContent += `"${row.regional_idr}","${row.meso_idr}",${row.valor},${row.producao},${row.area}\n`;
    });
    csvContent += '\n';

    // Seção 5: Por Município
    csvContent += 'POR MUNICÍPIO\n';
    csvContent += 'Município,Código IBGE,Regional,Valor (R$),Produção,Área (ha)\n';
    byMunicipio.forEach(row => {
      csvContent += `"${row.nome}","${row.cod}","${row.regional}",${row.valor},${row.producao},${row.area}\n`;
    });

    // Criar blob e download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Nome do arquivo com data e filtros aplicados
    const date = new Date().toISOString().split('T')[0];
    const filterSuffix = hasActiveFilters ? '_filtrado' : '_completo';
    link.setAttribute('href', url);
    link.setAttribute('download', `vbp_parana_${date}${filterSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = simplified
    ? (mesos.length > 0 ||
       regionais.length > 0 ||
       municipios.length > 0 ||
       anoMin !== metadata.anoMin ||
       anoMax !== metadata.anoMax)
    : (mesos.length > 0 ||
       regionais.length > 0 ||
       municipios.length > 0 ||
       cadeias.length > 0 ||
       subcadeias.length > 0 ||
       produtos.length > 0 ||
       anoMin !== metadata.anoMin ||
       anoMax !== metadata.anoMax);

  return (
    <div className="card p-4 md:p-6 relative z-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <Filter className="w-5 h-5 text-forest-600" />
          </div>
          <h2 className="text-lg font-display font-bold text-earth-900">Filtros</h2>
          {hasActiveFilters && (
            <span className="badge badge-green">Ativos</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-forest-600 hover:bg-forest-700
                       rounded-lg transition-colors"
            title="Exportar dados filtrados em CSV"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-earth-600 hover:text-forest-600
                         hover:bg-forest-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Limpar
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-earth-100 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-earth-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-earth-500" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${simplified ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-4`}>
          {/* Year Range */}
          <div className={simplified ? '' : 'lg:col-span-2'}>
            <label className="filter-label">Período</label>
            <div className="flex items-center gap-3">
              <select
                value={anoMin}
                onChange={(e) => onFiltersChange({ ...filters, anos: [parseInt(e.target.value), anoMax] })}
                className="filter-select flex-1"
              >
                {metadata.anos?.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
              <span className="text-earth-400 font-medium">até</span>
              <select
                value={anoMax}
                onChange={(e) => onFiltersChange({ ...filters, anos: [anoMin, parseInt(e.target.value)] })}
                className="filter-select flex-1"
              >
                {metadata.anos?.filter(a => a >= anoMin).map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mesorregião */}
          <div>
            <label className="filter-label">Mesorregião</label>
            <MultiSelect
              options={metadata.filters?.mesos || []}
              selected={mesos}
              onChange={(val) => onFiltersChange({ ...filters, mesos: val, regionais: [], municipios: [] })}
              placeholder="Todas"
            />
          </div>

          {/* Regional */}
          <div>
            <label className="filter-label">Regional IDR</label>
            <MultiSelect
              options={availableRegionais}
              selected={regionais}
              onChange={(val) => onFiltersChange({ ...filters, regionais: val, municipios: [] })}
              placeholder="Todas"
            />
          </div>

          {/* Município */}
          <div>
            <label className="filter-label">Município</label>
            <MultiSelect
              options={availableMunicipios}
              selected={municipios}
              onChange={(val) => onFiltersChange({ ...filters, municipios: val })}
              placeholder="Todos"
            />
          </div>

          {/* Product filters - only show when not simplified */}
          {!simplified && (
            <>
              {/* Cadeia */}
              <div>
                <label className="filter-label">Cadeia Produtiva</label>
                <MultiSelect
                  options={metadata.filters?.cadeias || []}
                  selected={cadeias}
                  onChange={(val) => onFiltersChange({ ...filters, cadeias: val, subcadeias: [], produtos: [] })}
                  placeholder="Todas"
                />
              </div>

              {/* Subcadeia */}
              <div>
                <label className="filter-label">Subcadeia</label>
                <MultiSelect
                  options={availableSubcadeias}
                  selected={subcadeias}
                  onChange={(val) => onFiltersChange({ ...filters, subcadeias: val, produtos: [] })}
                  placeholder="Todas"
                />
              </div>

              {/* Produto */}
              <div className="lg:col-span-2">
                <label className="filter-label">Produto</label>
                <MultiSelect
                  options={availableProdutos}
                  selected={produtos}
                  onChange={(val) => onFiltersChange({ ...filters, produtos: val })}
                  placeholder="Todos"
                />
              </div>
            </>
          )}
        </div>
      )}

      {simplified && isExpanded && (
        <p className="text-xs text-neutral-500 mt-3 text-center">
          Clique nos graficos para filtrar por cadeia, produto ou municipio
        </p>
      )}
    </div>
  );
}

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt =>
      opt.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selecionados`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="filter-select text-left w-full"
      >
        <span className={selected.length === 0 ? 'text-earth-400' : 'text-earth-900'}>
          {displayText}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-earth-200 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-earth-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-3 py-2 text-sm border border-earth-200 rounded-lg focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Options */}
            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-earth-400">Nenhum resultado</div>
              ) : (
                filteredOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-forest-50 flex items-center gap-2
                      ${selected.includes(opt) ? 'bg-forest-50 text-forest-700' : 'text-earth-700'}`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center
                      ${selected.includes(opt)
                        ? 'bg-forest-500 border-forest-500'
                        : 'border-earth-300'}`}
                    >
                      {selected.includes(opt) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {opt}
                  </button>
                ))
              )}
            </div>

            {/* Actions */}
            {selected.length > 0 && (
              <div className="p-2 border-t border-earth-100">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="w-full px-3 py-1.5 text-sm text-earth-600 hover:text-forest-600 hover:bg-forest-50 rounded-lg transition-colors"
                >
                  Limpar seleção
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
