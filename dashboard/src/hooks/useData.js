import { useState, useEffect, useMemo } from 'react';

const BASE_PATH = import.meta.env.BASE_URL || '/vbp-parana/';

/**
 * Hook para carregar e gerenciar os dados do dashboard
 */
export function useData() {
  const [aggregated, setAggregated] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [produtoMap, setProdutoMap] = useState(null);
  const [geoMap, setGeoMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [aggRes, detailedRes, geoRes, prodMapRes, geoMapRes] = await Promise.all([
          fetch(`${BASE_PATH}data/aggregated.json`),
          fetch(`${BASE_PATH}data/detailed.json`),
          fetch(`${BASE_PATH}data/municipios.geojson`),
          fetch(`${BASE_PATH}data/produto_map.json`),
          fetch(`${BASE_PATH}data/geo_map.json`),
        ]);

        if (!aggRes.ok || !detailedRes.ok || !geoRes.ok) {
          throw new Error('Erro ao carregar dados');
        }

        const [aggData, detailedData, geoDataJson, prodMapData, geoMapData] = await Promise.all([
          aggRes.json(),
          detailedRes.json(),
          geoRes.json(),
          prodMapRes.json(),
          geoMapRes.json(),
        ]);

        setAggregated(aggData);
        setMapData(detailedData.mapData);
        setGeoData(geoDataJson);
        setProdutoMap(prodMapData);
        setGeoMap(geoMapData);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return {
    aggregated,
    mapData,
    geoData,
    produtoMap,
    geoMap,
    loading,
    error,
  };
}

/**
 * Hook para filtrar dados com base nas seleções
 */
export function useFilteredData(aggregated, mapData, filters) {
  return useMemo(() => {
    if (!aggregated || !mapData) return null;

    const { anos, mesos, regionais, municipios, cadeias, subcadeias, produtos } = filters;
    const [anoMin, anoMax] = anos;

    // Filtrar série temporal
    const timeSeries = aggregated.timeSeries.filter(
      item => item.ano >= anoMin && item.ano <= anoMax
    );

    // Calcular totais
    const totals = timeSeries.reduce(
      (acc, item) => ({
        valor: acc.valor + item.valor,
        producao: acc.producao + item.producao,
        area: acc.area + item.area,
      }),
      { valor: 0, producao: 0, area: 0 }
    );

    // Filtrar dados do mapa
    const filteredMapData = mapData.filter(item => {
      if (item.a < anoMin || item.a > anoMax) return false;
      if (regionais.length > 0 && !regionais.includes(item.r)) return false;
      return true;
    });

    // Agregar dados do mapa por município
    const mapByMunicipio = {};
    filteredMapData.forEach(item => {
      if (!mapByMunicipio[item.c]) {
        mapByMunicipio[item.c] = { cod: item.c, nome: item.m, regional: item.r, valor: 0, producao: 0, area: 0 };
      }
      mapByMunicipio[item.c].valor += item.v;
      mapByMunicipio[item.c].producao += item.p;
      mapByMunicipio[item.c].area += item.ar;
    });

    // Filtrar por cadeia se selecionado
    let byCadeia = aggregated.byCadeia;
    let bySubcadeia = aggregated.bySubcadeia;
    let byProduto = aggregated.byProduto;
    let hierarchy = aggregated.hierarchy;

    if (cadeias.length > 0) {
      byCadeia = byCadeia.filter(item => cadeias.includes(item.cadeia));
      bySubcadeia = bySubcadeia.filter(item => cadeias.includes(item.cadeia));
      byProduto = byProduto.filter(item => cadeias.includes(item.cadeia));
      hierarchy = hierarchy.filter(item => cadeias.includes(item.cadeia));
    }

    if (subcadeias.length > 0) {
      bySubcadeia = bySubcadeia.filter(item => subcadeias.includes(item.subcadeia));
      byProduto = byProduto.filter(item => subcadeias.includes(item.subcadeia));
      hierarchy = hierarchy.filter(item => subcadeias.includes(item.subcadeia));
    }

    if (produtos.length > 0) {
      byProduto = byProduto.filter(item => produtos.includes(item.produto_conciso));
      hierarchy = hierarchy.filter(item => produtos.includes(item.produto_conciso));
    }

    // Filtrar regionais
    let byRegional = aggregated.byRegional;
    let byMunicipio = aggregated.byMunicipio;

    if (regionais.length > 0) {
      byRegional = byRegional.filter(item => regionais.includes(item.regional_idr));
      byMunicipio = byMunicipio.filter(item => regionais.includes(item.regional_idr));
    }

    if (municipios.length > 0) {
      byMunicipio = byMunicipio.filter(item => municipios.includes(item.cod_ibge));
    }

    // Evolução por cadeia filtrada por ano
    const evolutionCadeia = aggregated.evolutionCadeia.filter(
      item => item.ano >= anoMin && item.ano <= anoMax
    );

    // Top produtos por ano
    const topProdutosAno = aggregated.topProdutosAno.filter(
      item => item.ano >= anoMin && item.ano <= anoMax
    );

    return {
      timeSeries,
      totals,
      byCadeia,
      bySubcadeia,
      byProduto,
      byRegional,
      byMunicipio: Object.values(mapByMunicipio),
      byMeso: aggregated.byMeso,
      evolutionCadeia,
      topProdutosAno,
      hierarchy,
    };
  }, [aggregated, mapData, filters]);
}
