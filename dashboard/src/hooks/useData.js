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
 * Usa dataset cruzado (byAnoProdutoRegional) para aplicar TODOS os filtros em TODOS os visuais
 */
export function useFilteredData(aggregated, detailed, geoMap, filters) {
  return useMemo(() => {
    if (!aggregated || !detailed) return null;

    const { anos, mesos, regionais, municipios, cadeias, subcadeias, produtos } = filters;
    const [anoMin, anoMax] = anos;
    const metadata = aggregated.metadata;

    // Determinar se há filtros ativos
    const hasYearFilter = anoMin !== metadata.anoMin || anoMax !== metadata.anoMax;
    const hasGeoFilter = mesos.length > 0 || regionais.length > 0 || municipios.length > 0;
    const hasCadeiaFilter = cadeias.length > 0;
    const hasSubcadeiaFilter = subcadeias.length > 0;
    const hasProdutoFilter = produtos.length > 0;
    const hasProdutoFilterAny = hasCadeiaFilter || hasSubcadeiaFilter || hasProdutoFilter;
    const hasAnyFilter = hasYearFilter || hasGeoFilter || hasProdutoFilterAny;

    // Calcular regionais alvo
    const regionaisFromMesos = mesos.length > 0 && geoMap
      ? mesos.flatMap(meso => geoMap[meso]?.regionais || [])
      : [];

    const targetRegionais = regionais.length > 0
      ? regionais
      : regionaisFromMesos;

    const targetRegionaisSet = new Set(targetRegionais);
    const targetMesosSet = new Set(mesos);

    // Criar mapeamento de regional -> mesorregião
    const regionalToMeso = {};
    if (geoMap) {
      Object.entries(geoMap).forEach(([meso, data]) => {
        (data.regionais || []).forEach(regional => {
          regionalToMeso[regional] = meso;
        });
      });
    }

    // Criar mapeamento de município -> regional (para filtro de município)
    const municipioToRegional = {};
    if (geoMap) {
      Object.entries(geoMap).forEach(([meso, data]) => {
        Object.entries(data.municipios || {}).forEach(([regional, munList]) => {
          munList.forEach(mun => {
            municipioToRegional[mun.municipio_oficial] = regional;
          });
        });
      });
    }

    // Se há filtro de municípios, derivar regionais deles
    const targetMunicipiosSet = new Set(municipios);
    let effectiveTargetRegionais = targetRegionais;
    if (municipios.length > 0) {
      const regionaisFromMunicipios = municipios
        .map(mun => municipioToRegional[mun])
        .filter(r => r); // Remove nulls
      effectiveTargetRegionais = regionaisFromMunicipios;
    }
    const effectiveTargetRegionaisSet = new Set(effectiveTargetRegionais);

    // === FILTRAR DATASET CRUZADO ===
    // Quando há filtro de município, usar byAnoProdutoMunicipio para maior precisão
    // Caso contrário, usar byAnoProdutoRegional
    let filteredCrossData;

    if (municipios.length > 0 && detailed.byAnoProdutoMunicipio) {
      // Usar dataset de município quando há filtro de município
      filteredCrossData = detailed.byAnoProdutoMunicipio.filter(item => {
        if (item.a < anoMin || item.a > anoMax) return false;
        if (hasCadeiaFilter && !cadeias.includes(item.c)) return false;
        if (hasSubcadeiaFilter && !subcadeias.includes(item.s)) return false;
        if (hasProdutoFilter && !produtos.includes(item.n)) return false;
        if (!targetMunicipiosSet.has(item.m)) return false; // m = municipio_oficial
        if (effectiveTargetRegionaisSet.size > 0 && !effectiveTargetRegionaisSet.has(item.r)) return false;
        return true;
      });

      // Converter para formato compatível com byAnoProdutoRegional
      // Agrupando por ano, produto, cadeia, subcadeia, regional, meso
      const regionalGroups = {};
      filteredCrossData.forEach(item => {
        const key = `${item.a}|${item.n}|${item.c}|${item.s}|${item.r}`;
        if (!regionalGroups[key]) {
          regionalGroups[key] = {
            a: item.a,
            n: item.n,
            c: item.c,
            s: item.s,
            r: item.r,
            m: regionalToMeso[item.r] || '',
            v: 0,
            p: 0,
            ar: 0
          };
        }
        regionalGroups[key].v += item.v;
        regionalGroups[key].p += item.p;
        regionalGroups[key].ar += item.ar;
      });
      filteredCrossData = Object.values(regionalGroups);
    } else {
      // Usar dataset regional padrão
      filteredCrossData = detailed.byAnoProdutoRegional.filter(item => {
        if (item.a < anoMin || item.a > anoMax) return false;
        if (hasCadeiaFilter && !cadeias.includes(item.c)) return false;
        if (hasSubcadeiaFilter && !subcadeias.includes(item.s)) return false;
        if (hasProdutoFilter && !produtos.includes(item.n)) return false;
        if (effectiveTargetRegionaisSet.size > 0 && !effectiveTargetRegionaisSet.has(item.r)) return false;
        if (targetMesosSet.size > 0 && !targetMesosSet.has(item.m)) return false;
        return true;
      });
    }

    // === SÉRIE TEMPORAL ===
    let timeSeries;
    if (hasAnyFilter) {
      const byYear = {};
      filteredCrossData.forEach(item => {
        if (!byYear[item.a]) {
          byYear[item.a] = { ano: item.a, valor: 0, producao: 0, area: 0 };
        }
        byYear[item.a].valor += item.v;
        byYear[item.a].producao += item.p;
        byYear[item.a].area += item.ar;
      });
      timeSeries = Object.values(byYear).sort((a, b) => a.ano - b.ano);
    } else {
      timeSeries = aggregated.timeSeries;
    }

    // === TOTAIS ===
    const totals = timeSeries.reduce(
      (acc, item) => ({
        valor: acc.valor + item.valor,
        producao: acc.producao + item.producao,
        area: acc.area + item.area,
      }),
      { valor: 0, producao: 0, area: 0 }
    );

    // === POR CADEIA ===
    let byCadeia;
    if (hasAnyFilter) {
      const grouped = {};
      filteredCrossData.forEach(item => {
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

    // === POR SUBCADEIA ===
    let bySubcadeia;
    if (hasAnyFilter) {
      const grouped = {};
      filteredCrossData.forEach(item => {
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

    // === POR PRODUTO ===
    let byProduto;
    if (hasAnyFilter) {
      const grouped = {};
      filteredCrossData.forEach(item => {
        if (!grouped[item.n]) {
          grouped[item.n] = { produto_conciso: item.n, cadeia: item.c, subcadeia: item.s, valor: 0, producao: 0, area: 0 };
        }
        grouped[item.n].valor += item.v;
        grouped[item.n].producao += item.p;
        grouped[item.n].area += item.ar;
      });
      byProduto = Object.values(grouped).sort((a, b) => b.valor - a.valor);
    } else {
      byProduto = aggregated.byProduto;
    }

    // === POR REGIONAL ===
    let byRegional;
    if (hasAnyFilter) {
      const grouped = {};
      filteredCrossData.forEach(item => {
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

    // === POR MESORREGIÃO ===
    let byMeso;
    if (hasAnyFilter) {
      const grouped = {};
      filteredCrossData.forEach(item => {
        if (!grouped[item.m]) {
          grouped[item.m] = { meso_idr: item.m, valor: 0, producao: 0, area: 0 };
        }
        grouped[item.m].valor += item.v;
        grouped[item.m].producao += item.p;
        grouped[item.m].area += item.ar;
      });
      byMeso = Object.values(grouped).sort((a, b) => b.valor - a.valor);
    } else {
      byMeso = aggregated.byMeso;
    }

    // === POR MUNICÍPIO ===
    // Usa byAnoProdutoMunicipio quando há filtros de produto ou município
    // Caso contrário usa mapData (mais leve, sem dimensão de produto)
    const mapByMunicipio = {};

    if ((hasProdutoFilterAny || municipios.length > 0) && detailed.byAnoProdutoMunicipio) {
      // Filtrar dataset com granularidade município + produto
      const filteredMapData = detailed.byAnoProdutoMunicipio.filter(item => {
        if (item.a < anoMin || item.a > anoMax) return false;
        if (hasCadeiaFilter && !cadeias.includes(item.c)) return false;
        if (hasSubcadeiaFilter && !subcadeias.includes(item.s)) return false;
        if (hasProdutoFilter && !produtos.includes(item.n)) return false;
        if (targetMunicipiosSet.size > 0 && !targetMunicipiosSet.has(item.m)) return false;
        if (effectiveTargetRegionaisSet.size > 0 && !effectiveTargetRegionaisSet.has(item.r)) return false;
        return true;
      });

      filteredMapData.forEach(item => {
        if (!mapByMunicipio[item.cod]) {
          mapByMunicipio[item.cod] = { cod: item.cod, nome: item.m, regional: item.r, valor: 0, producao: 0, area: 0 };
        }
        mapByMunicipio[item.cod].valor += item.v;
        mapByMunicipio[item.cod].producao += item.p;
        mapByMunicipio[item.cod].area += item.ar;
      });
    } else {
      // Usar mapData simples (sem filtros de produto ou município)
      const filteredMapData = detailed.mapData.filter(item => {
        if (item.a < anoMin || item.a > anoMax) return false;
        if (targetMunicipiosSet.size > 0 && !targetMunicipiosSet.has(item.m)) return false;
        if (effectiveTargetRegionaisSet.size > 0 && !effectiveTargetRegionaisSet.has(item.r)) return false;
        if (targetMesosSet.size > 0 && regionalToMeso[item.r] && !targetMesosSet.has(regionalToMeso[item.r])) return false;
        return true;
      });

      filteredMapData.forEach(item => {
        if (!mapByMunicipio[item.c]) {
          mapByMunicipio[item.c] = { cod: item.c, nome: item.m, regional: item.r, valor: 0, producao: 0, area: 0 };
        }
        mapByMunicipio[item.c].valor += item.v;
        mapByMunicipio[item.c].producao += item.p;
        mapByMunicipio[item.c].area += item.ar;
      });
    }

    // === HIERARCHY para treemap ===
    let hierarchy;
    if (hasAnyFilter) {
      const grouped = {};
      filteredCrossData.forEach(item => {
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

    // === EVOLUÇÃO POR CADEIA ===
    let evolutionCadeia;
    if (hasAnyFilter) {
      const grouped = {};
      filteredCrossData.forEach(item => {
        const key = `${item.a}|${item.c}`;
        if (!grouped[key]) {
          grouped[key] = { ano: item.a, cadeia: item.c, valor: 0 };
        }
        grouped[key].valor += item.v;
      });
      evolutionCadeia = Object.values(grouped).sort((a, b) => a.ano - b.ano || b.valor - a.valor);
    } else {
      evolutionCadeia = aggregated.evolutionCadeia;
    }

    // === TOP PRODUTOS POR ANO ===
    let topProdutosAno;
    if (hasAnyFilter) {
      const byAnoProduct = {};
      filteredCrossData.forEach(item => {
        const key = `${item.a}|${item.n}`;
        if (!byAnoProduct[key]) {
          byAnoProduct[key] = { ano: item.a, produto_conciso: item.n, valor: 0 };
        }
        byAnoProduct[key].valor += item.v;
      });

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
      topProdutosAno = aggregated.topProdutosAno;
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
