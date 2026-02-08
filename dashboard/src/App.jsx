import { useState, useMemo, useCallback } from 'react';
import { useData, useFilteredData } from './hooks/useData';

// Components
import Header from './components/Header';
import Filters from './components/Filters';
import Tabs from './components/Tabs';
import KpiCards from './components/KpiCards';
import TimeSeriesChart from './components/TimeSeriesChart';
import CadeiaCharts from './components/CadeiaCharts';
import RankingTable from './components/RankingTable';
import MapChart from './components/MapChart';
import EvolutionChart from './components/EvolutionChart';
import RegionalChart from './components/RegionalChart';
import Footer from './components/Footer';
import Loading from './components/Loading';

// ActiveFilters component for displaying clickable filter badges
function ActiveFilters({ filters, onRemove, onClearAll }) {
  const hasFilters = Object.values(filters).some(v => v !== null && v !== '');
  if (!hasFilters) return null;

  const badges = [];
  if (filters.cadeia) badges.push({ key: 'cadeia', label: 'Cadeia', value: filters.cadeia });
  if (filters.subcadeia) badges.push({ key: 'subcadeia', label: 'Subcadeia', value: filters.subcadeia });
  if (filters.produto) badges.push({ key: 'produto', label: 'Produto', value: filters.produto });
  if (filters.regional) badges.push({ key: 'regional', label: 'Regional', value: filters.regional });
  if (filters.municipio) badges.push({ key: 'municipio', label: 'Municipio', value: filters.municipio });
  if (filters.ano) badges.push({ key: 'ano', label: 'Ano', value: filters.ano });

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-primary-50 rounded-xl border border-primary-200">
      <span className="text-sm font-medium text-primary-700">Filtros ativos:</span>
      {badges.map(({ key, label, value }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-primary-300 text-sm font-medium text-primary-800 shadow-sm"
        >
          <span className="text-primary-500">{label}:</span>
          <span>{value}</span>
          <button
            onClick={() => onRemove(key)}
            className="ml-1 text-primary-400 hover:text-primary-600 transition-colors"
            title={`Remover filtro ${label}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="ml-2 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-100 rounded-lg transition-colors"
      >
        Limpar todos
      </button>
    </div>
  );
}

export default function App() {
  const { aggregated, detailed, geoData, produtoMap, geoMap, loading, error } = useData();

  // Dropdown filters state (kept for period and region hierarchy)
  const [filters, setFilters] = useState({
    anos: [2012, 2024],
    mesos: [],
    regionais: [],
    municipios: [],
    cadeias: [],
    subcadeias: [],
    produtos: [],
  });

  // Interactive filters state (click-to-filter)
  const [interactiveFilters, setInteractiveFilters] = useState({
    cadeia: null,
    subcadeia: null,
    produto: null,
    regional: null,
    municipio: null,
    ano: null,
  });

  // Active tab
  const [activeTab, setActiveTab] = useState('overview');

  // Handlers for interactive filters
  const handleCadeiaClick = useCallback((cadeia) => {
    setInteractiveFilters(prev => ({
      ...prev,
      cadeia: prev.cadeia === cadeia ? null : cadeia,
      subcadeia: prev.cadeia === cadeia ? null : prev.subcadeia, // Reset subcadeia when cadeia changes
      produto: prev.cadeia === cadeia ? null : prev.produto, // Reset produto when cadeia changes
    }));
  }, []);

  const handleSubcadeiaClick = useCallback((subcadeia) => {
    setInteractiveFilters(prev => ({
      ...prev,
      subcadeia: prev.subcadeia === subcadeia ? null : subcadeia,
      produto: prev.subcadeia === subcadeia ? null : prev.produto,
    }));
  }, []);

  const handleProdutoClick = useCallback((produto) => {
    setInteractiveFilters(prev => ({
      ...prev,
      produto: prev.produto === produto ? null : produto,
    }));
  }, []);

  const handleRegionalClick = useCallback((regional) => {
    setInteractiveFilters(prev => ({
      ...prev,
      regional: prev.regional === regional ? null : regional,
      municipio: prev.regional === regional ? null : prev.municipio,
    }));
  }, []);

  const handleMunicipioClick = useCallback((municipio) => {
    setInteractiveFilters(prev => ({
      ...prev,
      municipio: prev.municipio === municipio ? null : municipio,
    }));
  }, []);

  const handleAnoClick = useCallback((ano) => {
    setInteractiveFilters(prev => ({
      ...prev,
      ano: prev.ano === ano ? null : ano,
    }));
  }, []);

  const handleRemoveFilter = useCallback((key) => {
    setInteractiveFilters(prev => ({ ...prev, [key]: null }));
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setInteractiveFilters({
      cadeia: null,
      subcadeia: null,
      produto: null,
      regional: null,
      municipio: null,
      ano: null,
    });
  }, []);

  // Merge dropdown filters with interactive filters
  const mergedFilters = useMemo(() => {
    return {
      ...filters,
      cadeias: interactiveFilters.cadeia ? [interactiveFilters.cadeia] : filters.cadeias,
      subcadeias: interactiveFilters.subcadeia ? [interactiveFilters.subcadeia] : filters.subcadeias,
      produtos: interactiveFilters.produto ? [interactiveFilters.produto] : filters.produtos,
      regionais: interactiveFilters.regional ? [interactiveFilters.regional] : filters.regionais,
      municipios: interactiveFilters.municipio ? [interactiveFilters.municipio] : filters.municipios,
      // For ano, we'll override the range if a specific year is clicked
      anos: interactiveFilters.ano ? [interactiveFilters.ano, interactiveFilters.ano] : filters.anos,
    };
  }, [filters, interactiveFilters]);

  // Initialize filters when data loads
  useMemo(() => {
    if (aggregated?.metadata) {
      setFilters(prev => ({
        ...prev,
        anos: [aggregated.metadata.anoMin, aggregated.metadata.anoMax],
      }));
    }
  }, [aggregated?.metadata]);

  // Filter data using merged filters
  const filteredData = useFilteredData(aggregated, detailed, geoMap, mergedFilters);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-accent-50 to-primary-50">
        <div className="text-center space-y-4 p-8">
          <div className="text-red-500 text-6xl">!</div>
          <h2 className="text-xl font-bold text-dark-900">Erro ao carregar dados</h2>
          <p className="text-dark-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8 w-full space-y-4 md:space-y-6">
        {/* Filters - Simplified to period and region only */}
        <Filters
          metadata={aggregated?.metadata}
          produtoMap={produtoMap}
          geoMap={geoMap}
          filters={filters}
          onFiltersChange={setFilters}
          filteredData={filteredData}
          simplified={true}
        />

        {/* Active Filters Badges */}
        <ActiveFilters
          filters={interactiveFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        {/* KPIs */}
        <KpiCards data={filteredData} />

        {/* Tabs */}
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <TimeSeriesChart
                data={filteredData}
                onAnoClick={handleAnoClick}
                selectedAno={interactiveFilters.ano}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CadeiaCharts
                  data={filteredData}
                  onCadeiaClick={handleCadeiaClick}
                  selectedCadeia={interactiveFilters.cadeia}
                />
                <RegionalChart
                  data={filteredData}
                  onRegionalClick={handleRegionalClick}
                  selectedRegional={interactiveFilters.regional}
                />
              </div>
            </>
          )}

          {activeTab === 'cadeias' && (
            <>
              <CadeiaCharts
                data={filteredData}
                onCadeiaClick={handleCadeiaClick}
                selectedCadeia={interactiveFilters.cadeia}
              />
              <EvolutionChart
                data={filteredData}
                onCadeiaClick={handleCadeiaClick}
                selectedCadeia={interactiveFilters.cadeia}
              />
            </>
          )}

          {activeTab === 'produtos' && (
            <RankingTable
              data={filteredData}
              type="produtos"
              onProdutoClick={handleProdutoClick}
              onCadeiaClick={handleCadeiaClick}
              selectedProduto={interactiveFilters.produto}
              selectedCadeia={interactiveFilters.cadeia}
            />
          )}

          {activeTab === 'regionais' && (
            <>
              <RegionalChart
                data={filteredData}
                onRegionalClick={handleRegionalClick}
                selectedRegional={interactiveFilters.regional}
              />
              <RankingTable
                data={filteredData}
                type="municipios"
                onMunicipioClick={handleMunicipioClick}
                selectedMunicipio={interactiveFilters.municipio}
              />
            </>
          )}

          {activeTab === 'evolucao' && (
            <>
              <TimeSeriesChart
                data={filteredData}
                onAnoClick={handleAnoClick}
                selectedAno={interactiveFilters.ano}
              />
              <EvolutionChart
                data={filteredData}
                onCadeiaClick={handleCadeiaClick}
                selectedCadeia={interactiveFilters.cadeia}
              />
            </>
          )}

          {activeTab === 'mapa' && (
            <MapChart
              data={filteredData}
              geoData={geoData}
              onMunicipioClick={handleMunicipioClick}
              selectedMunicipio={interactiveFilters.municipio}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
