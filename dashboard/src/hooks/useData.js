import { useState, useEffect, useMemo } from 'react';

const BASE_PATH = import.meta.env.BASE_URL || '/vbp-parana/';

/**
 * Hook para carregar e gerenciar os dados do dashboard
 */
export function useData() {
  const [aggregated, setAggregated] = useState(null);
  const [detailed, setDetailed] = useState(null);
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
        setDetailed(detailedData);
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
    detailed,
    geoData,
    produtoMap,
    geoMap,
    loading,
    error,
  };
}

/**
 * Hook para filtrar dados com base nas seleções
 * Usa dados granulares para recalcular agregações quando filtros são aplicados
 */
export function useFilteredData(aggregated, detailed, geoMap, filters) {
  return useMemo(() => {
    if (!aggregated || !detailed) return null;

    const { anos, mesos, regionais, municipios, cadeias, subcadeias, produtos } = filters;
    const [anoMin, anoMax] = anos;
    const metadata = aggregated.metadata;

    // Determinar se há filtros ativos (além do período completo)
    const hasYearFilter = anoMin !== metadata.anoMin || anoMax !== metadata.anoMax;
    const hasGeoFilter = mesos.length > 0 || regionais.length > 0;
    const hasCadeiaFilter = cadeias.length > 0;
    const hasSubcadeiaFilter = subcadeias.length > 0;
    const hasProdutoFilter = produtos.length > 0;

    // Calcular regionais alvo
    const regionaisFromMesos = mesos.length > 0 && geoMap
      ? mesos.flatMap(meso => geoMap[meso]?.regionais || [])
      : [];

    const targetRegionais = regionais.length > 0
      ? regionais
      : regionaisFromMesos;

    const targetRegionaisSet = new Set(targetRegionais);
    const targetMesosSet = new Set(mesos);

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

    // === AGREGAR DADOS POR CADEIA ===
    let byCadeia;
    if (hasYearFilter) {
      // Usar dados granulares por ano-cadeia
      const filtered = detailed.byAnoCadeia.filter(item =>
        item.a >= anoMin && item.a <= anoMax
      );
      const grouped = {};
      filtered.forEach(item => {
        if (!grouped[item.c]) {
          grouped[item.c] = { cadeia: item.c, valor: 0, producao: 0, area: 0 };
        }
        grouped[item.c].valor += item.v;
        grouped[item.c].producao += item.p;
        grouped[item.c].area += item.ar;
      });
      byCadeia = Object.values(grouped).sort((a, b) => b.valor - a.valor);
    } else {
      byCadeia = aggregated.byCadeia;
    }

    // Filtrar por cadeia selecionada
    if (hasCadeiaFilter) {
      byCadeia = byCadeia.filter(item => cadeias.includes(item.cadeia));
    }

    // === AGREGAR DADOS POR SUBCADEIA ===
    let bySubcadeia;
    if (hasYearFilter) {
      const filtered = detailed.byAnoSubcadeia.filter(item =>
        item.a >= anoMin && item.a <= anoMax
      );
      const grouped = {};
      filtered.forEach(item => {
        const key = `${item.c}|${item.s}`;
        if (!grouped[key]) {
          grouped[key] = { cadeia: item.c, subcadeia: item.s, valor: 0, producao: 0, area: 0 };
        }
        grouped[key].valor += item.v;
        grouped[key].producao += item.p;
        grouped[key].area += item.ar;
      });
      bySubcadeia = Object.values(grouped).sort((a, b) => b.valor - a.valor);
    } else {
      bySubcadeia = aggregated.bySubcadeia;
    }

    if (hasCadeiaFilter) {
      bySubcadeia = bySubcadeia.filter(item => cadeias.includes(item.cadeia));
    }
    if (hasSubcadeiaFilter) {
      bySubcadeia = bySubcadeia.filter(item => subcadeias.includes(item.subcadeia));
    }

    // === AGREGAR DADOS POR PRODUTO ===
    let byProduto;
    if (hasYearFilter) {
      const filtered = detailed.byAnoProduto.filter(item =>
        item.a >= anoMin && item.a <= anoMax
      );
      const grouped = {};
      filtered.forEach(item => {
        const key = item.n;
        if (!grouped[key]) {
          grouped[key] = { produto_conciso: item.n, cadeia: item.c, subcadeia: item.s, valor: 0, producao: 0, area: 0 };
        }
        grouped[key].valor += item.v;
        grouped[key].producao += item.p;
        grouped[key].area += item.ar;
      });
      byProduto = Object.values(grouped).sort((a, b) => b.valor - a.valor);
    } else {
      byProduto = aggregated.byProduto;
    }

    if (hasCadeiaFilter) {
      byProduto = byProduto.filter(item => cadeias.includes(item.cadeia));
    }
    if (hasSubcadeiaFilter) {
      byProduto = byProduto.filter(item => subcadeias.includes(item.subcadeia));
    }
    if (hasProdutoFilter) {
      byProduto = byProduto.filter(item => produtos.includes(item.produto_conciso));
    }

    // === AGREGAR DADOS POR REGIONAL ===
    let byRegional;
    if (hasYearFilter) {
      const filtered = detailed.byAnoRegional.filter(item =>
        item.a >= anoMin && item.a <= anoMax
      );
      const grouped = {};
      filtered.forEach(item => {
        if (!grouped[item.r]) {
          grouped[item.r] = { regional_idr: item.r, meso_idr: item.m, valor: 0, producao: 0, area: 0 };
        }
        grouped[item.r].valor += item.v;
        grouped[item.r].producao += item.p;
        grouped[item.r].area += item.ar;
      });
      byRegional = Object.values(grouped).sort((a, b) => b.valor - a.valor);
    } else {
      byRegional = aggregated.byRegional;
    }

    if (targetRegionaisSet.size > 0) {
      byRegional = byRegional.filter(item => targetRegionaisSet.has(item.regional_idr));
    }
    if (targetMesosSet.size > 0) {
      byRegional = byRegional.filter(item => targetMesosSet.has(item.meso_idr));
    }

    // === AGREGAR DADOS POR MUNICÍPIO (do mapData) ===
    const filteredMapData = detailed.mapData.filter(item => {
      if (item.a < anoMin || item.a > anoMax) return false;
      if (targetRegionaisSet.size > 0 && !targetRegionaisSet.has(item.r)) return false;
      return true;
    });

    const mapByMunicipio = {};
    filteredMapData.forEach(item => {
      if (!mapByMunicipio[item.c]) {
        mapByMunicipio[item.c] = { cod: item.c, nome: item.m, regional: item.r, valor: 0, producao: 0, area: 0 };
      }
      mapByMunicipio[item.c].valor += item.v;
      mapByMunicipio[item.c].producao += item.p;
      mapByMunicipio[item.c].area += item.ar;
    });

    // === HIERARCHY para treemap ===
    let hierarchy;
    if (hasYearFilter) {
      // Recalcular hierarchy dos dados granulares
      const filtered = detailed.byAnoProduto.filter(item =>
        item.a >= anoMin && item.a <= anoMax
      );
      const grouped = {};
      filtered.forEach(item => {
        const key = `${item.c}|${item.s}|${item.n}`;
        if (!grouped[key]) {
          grouped[key] = { cadeia: item.c, subcadeia: item.s, produto_conciso: item.n, valor: 0, producao: 0, area: 0 };
        }
        grouped[key].valor += item.v;
        grouped[key].producao += item.p;
        grouped[key].area += item.ar;
      });
      hierarchy = Object.values(grouped);
    } else {
      hierarchy = aggregated.hierarchy;
    }

    if (hasCadeiaFilter) {
      hierarchy = hierarchy.filter(item => cadeias.includes(item.cadeia));
    }
    if (hasSubcadeiaFilter) {
      hierarchy = hierarchy.filter(item => subcadeias.includes(item.subcadeia));
    }
    if (hasProdutoFilter) {
      hierarchy = hierarchy.filter(item => produtos.includes(item.produto_conciso));
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
  }, [aggregated, detailed, geoMap, filters]);
}
