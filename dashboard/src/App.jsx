import { useState, useMemo } from 'react';
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

export default function App() {
  const { aggregated, mapData, geoData, produtoMap, geoMap, loading, error } = useData();

  // Filters state
  const [filters, setFilters] = useState({
    anos: [2012, 2024],
    mesos: [],
    regionais: [],
    municipios: [],
    cadeias: [],
    subcadeias: [],
    produtos: [],
  });

  // Active tab
  const [activeTab, setActiveTab] = useState('overview');

  // Initialize filters when data loads
  useMemo(() => {
    if (aggregated?.metadata) {
      setFilters(prev => ({
        ...prev,
        anos: [aggregated.metadata.anoMin, aggregated.metadata.anoMax],
      }));
    }
  }, [aggregated?.metadata]);

  // Filter data
  const filteredData = useFilteredData(aggregated, mapData, filters);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-earth-50 via-white to-forest-50">
        <div className="text-center space-y-4 p-8">
          <div className="text-red-500 text-6xl">!</div>
          <h2 className="text-xl font-bold text-earth-900">Erro ao carregar dados</h2>
          <p className="text-earth-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-forest-600 text-white rounded-xl hover:bg-forest-700 transition-colors"
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

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Filters */}
        <Filters
          metadata={aggregated?.metadata}
          produtoMap={produtoMap}
          geoMap={geoMap}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* KPIs */}
        <KpiCards data={filteredData} />

        {/* Tabs */}
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <TimeSeriesChart data={filteredData} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CadeiaCharts data={filteredData} />
                <RegionalChart data={filteredData} />
              </div>
            </>
          )}

          {activeTab === 'cadeias' && (
            <>
              <CadeiaCharts data={filteredData} />
              <EvolutionChart data={filteredData} />
            </>
          )}

          {activeTab === 'produtos' && (
            <RankingTable data={filteredData} type="produtos" />
          )}

          {activeTab === 'regionais' && (
            <>
              <RegionalChart data={filteredData} />
              <RankingTable data={filteredData} type="municipios" />
            </>
          )}

          {activeTab === 'evolucao' && (
            <>
              <TimeSeriesChart data={filteredData} />
              <EvolutionChart data={filteredData} />
            </>
          )}

          {activeTab === 'mapa' && (
            <MapChart data={filteredData} geoData={geoData} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
