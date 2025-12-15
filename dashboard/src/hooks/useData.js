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

    // === SÉRIE TEMPORAL COM TODOS OS FILTROS ===
    let timeSeries;

    // Se há filtros de cadeia/subcadeia/produto, recalcular a série temporal a partir dos dados granulares
    if (hasCadeiaFilter || hasSubcadeiaFilter || hasProdutoFilter) {
      // Usar byAnoProduto para recalcular com filtros de produto
      const filtered = detailed.byAnoProduto.filter(item => {
        if (item.a < anoMin || item.a > anoMax) return false;
        if (hasCadeiaFilter && !cadeias.includes(item.c)) return false;
        if (hasSubcadeiaFilter && !subcadeias.includes(item.s)) return false;
        if (hasProdutoFilter && !produtos.includes(item.n)) return false;
        return true;
      });

      // Agrupar por ano
      const byYear = {};
      filtered.forEach(item => {
        if (!byYear[item.a]) {
          byYear[item.a] = { ano: item.a, valor: 0, producao: 0, area: 0 };
        }
        byYear[item.a].valor += item.v;
        byYear[item.a].producao += item.p;
        byYear[item.a].area += item.ar;
      });

      timeSeries = Object.values(byYear).sort((a, b) => a.ano - b.ano);
    } else if (hasGeoFilter) {
      // Se há filtros geográficos, usar byAnoRegional
      const filtered = detailed.byAnoRegional.filter(item => {
        if (item.a < anoMin || item.a > anoMax) return false;
        if (targetRegionaisSet.size > 0 && !targetRegionaisSet.has(item.r)) return false;
        if (targetMesosSet.size > 0 && !targetMesosSet.has(item.m)) return false;
        return true;
      });

      // Agrupar por ano
      const byYear = {};
      filtered.forEach(item => {
        if (!byYear[item.a]) {
          byYear[item.a] = { ano: item.a, valor: 0, producao: 0, area: 0 };
        }
        byYear[item.a].valor += item.v;
        byYear[item.a].producao += item.p;
        byYear[item.a].area += item.ar;
      });

      timeSeries = Object.values(byYear).sort((a, b) => a.ano - b.ano);
    } else {
      // Sem filtros de produto ou geográficos, usar dados pré-agregados
      timeSeries = aggregated.timeSeries.filter(
        item => item.ano >= anoMin && item.ano <= anoMax
      );
    }

    // Calcular totais a partir do timeSeries filtrado
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
    // Primeiro, criar um mapeamento de regional -> mesorregião
    const regionalToMeso = {};
    if (geoMap) {
      Object.entries(geoMap).forEach(([meso, data]) => {
        (data.regionais || []).forEach(regional => {
          regionalToMeso[regional] = meso;
        });
      });
    }

    const filteredMapData = detailed.mapData.filter(item => {
      if (item.a < anoMin || item.a > anoMax) return false;
      if (targetRegionaisSet.size > 0 && !targetRegionaisSet.has(item.r)) return false;
      // Filtrar por mesorregião quando selecionada (mesmo sem regional específico)
      if (targetMesosSet.size > 0 && regionalToMeso[item.r] && !targetMesosSet.has(regionalToMeso[item.r])) return false;
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

    // === AGREGAR DADOS POR MESORREGIÃO ===
    let byMeso;
    if (hasYearFilter || hasGeoFilter) {
      // Calcular a partir de byRegional
      const mesoGrouped = {};
      byRegional.forEach(item => {
        const meso = item.meso_idr;
        if (!mesoGrouped[meso]) {
          mesoGrouped[meso] = { meso_idr: meso, valor: 0, producao: 0, area: 0 };
        }
        mesoGrouped[meso].valor += item.valor;
        mesoGrouped[meso].producao += item.producao;
        mesoGrouped[meso].area += item.area;
      });
      byMeso = Object.values(mesoGrouped).sort((a, b) => b.valor - a.valor);
    } else {
      byMeso = aggregated.byMeso;
    }

    if (targetMesosSet.size > 0) {
      byMeso = byMeso.filter(item => targetMesosSet.has(item.meso_idr));
    }

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

    // === EVOLUÇÃO POR CADEIA ===
    let evolutionCadeia;
    if (hasCadeiaFilter) {
      // Filtrar apenas as cadeias selecionadas
      evolutionCadeia = aggregated.evolutionCadeia.filter(
        item => item.ano >= anoMin && item.ano <= anoMax && cadeias.includes(item.cadeia)
      );
    } else {
      evolutionCadeia = aggregated.evolutionCadeia.filter(
        item => item.ano >= anoMin && item.ano <= anoMax
      );
    }

    // === TOP PRODUTOS POR ANO ===
    let topProdutosAno;
    if (hasCadeiaFilter || hasSubcadeiaFilter || hasProdutoFilter) {
      // Recalcular top produtos dos dados granulares com filtros aplicados
      const filtered = detailed.byAnoProduto.filter(item => {
        if (item.a < anoMin || item.a > anoMax) return false;
        if (hasCadeiaFilter && !cadeias.includes(item.c)) return false;
        if (hasSubcadeiaFilter && !subcadeias.includes(item.s)) return false;
        if (hasProdutoFilter && !produtos.includes(item.n)) return false;
        return true;
      });

      // Agrupar por ano e produto
      const byAnoProduct = {};
      filtered.forEach(item => {
        const key = `${item.a}|${item.n}`;
        if (!byAnoProduct[key]) {
          byAnoProduct[key] = { ano: item.a, produto_conciso: item.n, valor: 0 };
        }
        byAnoProduct[key].valor += item.v;
      });

      // Converter para array e pegar top 10 por ano
      const allProducts = Object.values(byAnoProduct);
      const byYear = {};
      allProducts.forEach(item => {
        if (!byYear[item.ano]) {
          byYear[item.ano] = [];
        }
        byYear[item.ano].push(item);
      });

      topProdutosAno = [];
      Object.keys(byYear).forEach(ano => {
        const sortedByYear = byYear[ano].sort((a, b) => b.valor - a.valor).slice(0, 10);
        topProdutosAno.push(...sortedByYear);
      });
    } else {
      topProdutosAno = aggregated.topProdutosAno.filter(
        item => item.ano >= anoMin && item.ano <= anoMax
      );
    }

    return {
      timeSeries,
      totals,
      byCadeia,
      bySubcadeia,
      byProduto,
      byRegional,
      byMunicipio: Object.values(mapByMunicipio),
      byMeso,
      evolutionCadeia,
      topProdutosAno,
      hierarchy,
    };
  }, [aggregated, detailed, geoMap, filters]);
}
