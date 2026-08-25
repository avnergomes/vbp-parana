import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { feature } from 'topojson-client';

const BASE_PATH = import.meta.env.BASE_URL || '/vbp-parana/';
// Malha municipal reduzida self-hosted (749 KB) como fonte primaria, com
// fallback para o TopoJSON completo do hub via jsDelivr (4,4 MB). Ambos com
// as MESMAS propriedades e a mesma object key ('municipalities').
const TOPO_URL = 'https://datageoparana.github.io/assets/parana-municipalities.min.topojson';
const TOPO_URL_FALLBACK = 'https://cdn.jsdelivr.net/gh/datageoparana/datageoparana.github.io@main/assets/parana-municipalities.topojson';

/**
 * Busca o TopoJSON municipal: tenta o self-hosted reduzido primeiro (checando
 * res.ok) e, em qualquer falha (rede ou resposta nao-ok), cai para o TopoJSON
 * completo do hub antes de propagar o erro. Preserva AbortError (cancelamento
 * nao deve disparar o fallback).
 */
async function fetchTopo(signal) {
  try {
    const res = await fetch(TOPO_URL, { signal });
    if (res.ok) return res;
    throw new Error('topo-primary-not-ok');
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    const resFb = await fetch(TOPO_URL_FALLBACK, { signal });
    if (!resFb.ok) throw new Error('Erro ao carregar dados geográficos');
    return resFb;
  }
}

/**
 * Hook para carregar e gerenciar os dados do dashboard
 * Implementa lazy loading para arquivos grandes (detailed.json e municipios.geojson)
 */
export function useData() {
  const [aggregated, setAggregated] = useState(null);
  const [detailed, setDetailed] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [produtoMap, setProdutoMap] = useState(null);
  const [geoMap, setGeoMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDetailedLoading, setIsDetailedLoading] = useState(false); // regional
  const [isMunicipioLoading, setIsMunicipioLoading] = useState(false); // fatias
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [error, setError] = useState(null);
  // Erros dos carregamentos sob demanda ficam locais (não derrubam o app
  // inteiro como o erro do carregamento inicial).
  const [detailedError, setDetailedError] = useState(null);
  const [geoError, setGeoError] = useState(null);

  // Refs sincronos para os guards dos loaders compostos (evitam corrida:
  // detailedRef espelha o estado; munYearsRef reserva os anos em voo para
  // nao baixar/concatenar a mesma fatia duas vezes).
  const detailedRef = useRef(null);
  const munYearsRef = useRef(new Set());
  const munCompleteRef = useRef(false);
  useEffect(() => { detailedRef.current = detailed; }, [detailed]);

  // Carregar dados essenciais na inicialização (aggregated, produto_map, geo_map)
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadInitialData() {
      try {
        setLoading(true);

        const [aggRes, prodMapRes, geoMapRes] = await Promise.all([
          fetch(`${BASE_PATH}data/aggregated.json`, { signal }),
          fetch(`${BASE_PATH}data/produto_map.json`, { signal }),
          fetch(`${BASE_PATH}data/geo_map.json`, { signal }),
        ]);

        if (!aggRes.ok) {
          throw new Error('Erro ao carregar dados agregados');
        }

        const [aggData, prodMapData, geoMapData] = await Promise.all([
          aggRes.json(),
          prodMapRes.ok ? prodMapRes.json() : null,
          geoMapRes.ok ? geoMapRes.json() : null,
        ]);

        if (!signal.aborted) {
          setAggregated(aggData);
          setProdutoMap(prodMapData);
          setGeoMap(geoMapData);
          setError(null);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadInitialData();
    return () => controller.abort();
  }, []);

  // Carrega o cubo REGIONAL sob demanda (~8 MB): mapData + byAnoProdutoRegional.
  // Cobre todos os filtros exceto o recorte municipal por produto. Fallback
  // defensivo para detailed.json completo (83 MB) se a fatia regional faltar
  // (ex.: release antigo em cache).
  const loadDetailedRegional = useCallback(async () => {
    if (detailedRef.current?.regionalLoaded || isDetailedLoading) return;

    const controller = new AbortController();
    try {
      setIsDetailedLoading(true);
      setDetailedError(null);

      let mapData, byAnoProdutoRegional, fullMunicipio = null;
      const res = await fetch(`${BASE_PATH}data/detailed_regional.json`, { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        mapData = data.mapData || [];
        byAnoProdutoRegional = data.byAnoProdutoRegional || [];
      } else {
        // Fallback: detailed.json completo (traz tambem o cubo municipal).
        const full = await fetch(`${BASE_PATH}data/detailed.json`, { signal: controller.signal });
        if (!full.ok) throw new Error('Erro ao carregar dados detalhados');
        const data = await full.json();
        mapData = data.mapData || [];
        byAnoProdutoRegional = data.byAnoProdutoRegional || [];
        fullMunicipio = data.byAnoProdutoMunicipio || [];
      }

      if (!controller.signal.aborted) {
        if (fullMunicipio) { munCompleteRef.current = true; }
        setDetailed(prev => {
          const base = prev || {
            regionalLoaded: false, mapData: [], byAnoProdutoRegional: [],
            byAnoProdutoMunicipio: [], munYears: [], munComplete: false,
          };
          return {
            ...base,
            regionalLoaded: true,
            mapData,
            byAnoProdutoRegional,
            // Se o fallback completo trouxe o municipal, ele domina; senao
            // preserva as fatias que ja tenham chegado.
            byAnoProdutoMunicipio: fullMunicipio || base.byAnoProdutoMunicipio,
            munYears: fullMunicipio ? [] : base.munYears,
            munComplete: fullMunicipio ? true : base.munComplete,
          };
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setDetailedError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsDetailedLoading(false);
      }
    }
  }, [isDetailedLoading]);

  // Carrega as FATIAS municipais por ano sob demanda (~6 MB/ano):
  // detailed_municipio_<ano>.json. So baixa os anos que faltam (Set em ref),
  // concatena no cubo existente. Fallback defensivo para detailed.json completo
  // se uma fatia faltar.
  const loadDetailedMunicipio = useCallback(async (yearsWanted) => {
    if (munCompleteRef.current) return;
    const wanted = Array.isArray(yearsWanted) ? yearsWanted : [yearsWanted];
    const missing = wanted.filter(y => y != null && !munYearsRef.current.has(y));
    if (missing.length === 0) return;

    // Reserva os anos sincronamente para evitar baixar a mesma fatia 2x.
    missing.forEach(y => munYearsRef.current.add(y));

    const controller = new AbortController();
    try {
      setIsMunicipioLoading(true);
      setDetailedError(null);

      const results = await Promise.all(missing.map(async (y) => {
        const res = await fetch(`${BASE_PATH}data/detailed_municipio_${y}.json`, { signal: controller.signal });
        if (res.ok) return { y, rows: await res.json() };
        // Fallback: fatia ausente -> detailed.json completo.
        const full = await fetch(`${BASE_PATH}data/detailed.json`, { signal: controller.signal });
        if (!full.ok) throw new Error('Erro ao carregar dados municipais');
        return { full: await full.json() };
      }));

      if (controller.signal.aborted) return;

      const fullFallback = results.find(r => r.full);
      if (fullFallback) {
        munCompleteRef.current = true;
        const data = fullFallback.full;
        setDetailed(prev => {
          const base = prev || {
            regionalLoaded: false, mapData: [], byAnoProdutoRegional: [],
            byAnoProdutoMunicipio: [], munYears: [], munComplete: false,
          };
          return {
            ...base,
            regionalLoaded: base.regionalLoaded || (data.byAnoProdutoRegional || []).length > 0,
            mapData: base.mapData.length ? base.mapData : (data.mapData || []),
            byAnoProdutoRegional: base.byAnoProdutoRegional.length ? base.byAnoProdutoRegional : (data.byAnoProdutoRegional || []),
            byAnoProdutoMunicipio: data.byAnoProdutoMunicipio || [],
            munYears: [],
            munComplete: true,
          };
        });
      } else {
        const newRows = results.flatMap(r => r.rows);
        const loadedYears = results.map(r => r.y);
        setDetailed(prev => {
          const base = prev || {
            regionalLoaded: false, mapData: [], byAnoProdutoRegional: [],
            byAnoProdutoMunicipio: [], munYears: [], munComplete: false,
          };
          return {
            ...base,
            byAnoProdutoMunicipio: base.byAnoProdutoMunicipio.concat(newRows),
            munYears: Array.from(new Set([...(base.munYears || []), ...loadedYears])),
          };
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setDetailedError(err.message);
        // Libera os anos reservados para permitir retry.
        missing.forEach(y => munYearsRef.current.delete(y));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsMunicipioLoading(false);
      }
    }
  }, []);

  // Função para carregar municipios.geojson sob demanda (48MB)
  const loadGeoData = useCallback(async () => {
    if (geoData || isGeoLoading) return;

    const controller = new AbortController();
    try {
      setIsGeoLoading(true);
      setGeoError(null);
      // fetchTopo tenta o self-hosted reduzido e cai no CDN do hub em falha.
      const res = await fetchTopo(controller.signal);
      const topo = await res.json();
      const data = feature(topo, topo.objects.municipalities);
      if (!controller.signal.aborted) {
        setGeoData(data);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setGeoError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsGeoLoading(false);
      }
    }
  }, [geoData, isGeoLoading]);

  return {
    aggregated,
    detailed,
    geoData,
    produtoMap,
    geoMap,
    loading,
    isDetailedLoading,
    isMunicipioLoading,
    isGeoLoading,
    error,
    detailedError,
    geoError,
    loadDetailedRegional,
    loadDetailedMunicipio,
    loadGeoData,
  };
}

/**
 * Hook para filtrar dados com base nas seleções
 * Usa dataset cruzado (byAnoProdutoRegional) para aplicar TODOS os filtros em TODOS os visuais
 */
export function useFilteredData(aggregated, detailed, geoMap, filters) {
  return useMemo(() => {
    if (!aggregated) return null;

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
    // Cubos carregados sob demanda em fatias; enquanto não chegam, os blocos
    // abaixo caem nos agregados (visão sem filtro).
    // - regionalReady: mapData + byAnoProdutoRegional disponíveis (~8 MB).
    // - municipioReady: TODAS as fatias municipais do range [anoMin..anoMax]
    //   carregadas (ou o detailed.json completo via fallback).
    const regionalReady = !!detailed && detailed.regionalLoaded;
    let municipioReady = false;
    if (detailed) {
      if (detailed.munComplete) {
        municipioReady = true;
      } else {
        const loadedYears = new Set(detailed.munYears || []);
        municipioReady = true;
        for (let y = anoMin; y <= anoMax; y++) {
          if (!loadedYears.has(y)) { municipioReady = false; break; }
        }
      }
    }
    const useDetailed = regionalReady;

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
    let filteredCrossData = [];

    if (municipioReady && municipios.length > 0) {
      // Usar dataset de município quando há filtro de município (todas as
      // fatias do range já carregadas)
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
    } else if (useDetailed) {
      // Usar dataset regional padrão
      filteredCrossData = (detailed.byAnoProdutoRegional || []).filter(item => {
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
    if (hasAnyFilter && useDetailed) {
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
    if (hasAnyFilter && useDetailed) {
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
    if (hasAnyFilter && useDetailed) {
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
    if (hasAnyFilter && useDetailed) {
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
    if (hasAnyFilter && useDetailed) {
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
    if (hasAnyFilter && useDetailed) {
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

    if (municipioReady && (hasProdutoFilterAny || municipios.length > 0)) {
      // Filtrar dataset com granularidade município + produto (fatias do range
      // já carregadas)
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
    } else if (useDetailed) {
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
    if (hasAnyFilter && useDetailed) {
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
    if (hasAnyFilter && useDetailed) {
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
    if (hasAnyFilter && useDetailed) {
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

    // === EVOLUÇÃO VBP/ha (ano × regional e ano × município) ===
    // Base da aba VBP/ha: valor e área totais por ano para cada regional e
    // município do recorte filtrado. O VBP/ha é calculado sobre a ÁREA TOTAL
    // declarada (produtos sem área, ex. pecuária, entram no valor mas não na
    // área). Sem o cubo regional carregado fica null; a aba dispara o
    // carregamento sob demanda e exibe o estado de loading.
    let evolutionRegional = null;
    if (useDetailed) {
      const grouped = {};
      filteredCrossData.forEach(item => {
        const key = `${item.a}|${item.r}`;
        if (!grouped[key]) {
          grouped[key] = { ano: item.a, regional_idr: item.r, valor: 0, area: 0 };
        }
        grouped[key].valor += item.v;
        grouped[key].area += item.ar;
      });
      evolutionRegional = Object.values(grouped).sort((a, b) => a.ano - b.ano);
    }

    let evolutionMunicipio = null;
    if (municipioReady && (hasProdutoFilterAny || municipios.length > 0)) {
      // Com filtro de produto/cadeia ou de município, usar o cubo municipal
      // por produto (mesmos critérios do bloco mapByMunicipio acima).
      const grouped = {};
      detailed.byAnoProdutoMunicipio.forEach(item => {
        if (item.a < anoMin || item.a > anoMax) return;
        if (hasCadeiaFilter && !cadeias.includes(item.c)) return;
        if (hasSubcadeiaFilter && !subcadeias.includes(item.s)) return;
        if (hasProdutoFilter && !produtos.includes(item.n)) return;
        if (targetMunicipiosSet.size > 0 && !targetMunicipiosSet.has(item.m)) return;
        if (effectiveTargetRegionaisSet.size > 0 && !effectiveTargetRegionaisSet.has(item.r)) return;
        const key = `${item.a}|${item.cod}`;
        if (!grouped[key]) {
          grouped[key] = { ano: item.a, cod: item.cod, nome: item.m, regional: item.r, valor: 0, area: 0 };
        }
        grouped[key].valor += item.v;
        grouped[key].area += item.ar;
      });
      evolutionMunicipio = Object.values(grouped).sort((a, b) => a.ano - b.ano);
    } else if (useDetailed) {
      // Sem filtro de produto: mapData (ano × município) já tem v e ar totais.
      const grouped = {};
      detailed.mapData.forEach(item => {
        if (item.a < anoMin || item.a > anoMax) return;
        if (targetMunicipiosSet.size > 0 && !targetMunicipiosSet.has(item.m)) return;
        if (effectiveTargetRegionaisSet.size > 0 && !effectiveTargetRegionaisSet.has(item.r)) return;
        if (targetMesosSet.size > 0 && regionalToMeso[item.r] && !targetMesosSet.has(regionalToMeso[item.r])) return;
        const key = `${item.a}|${item.c}`;
        if (!grouped[key]) {
          grouped[key] = { ano: item.a, cod: item.c, nome: item.m, regional: item.r, valor: 0, area: 0 };
        }
        grouped[key].valor += item.v;
        grouped[key].area += item.ar;
      });
      evolutionMunicipio = Object.values(grouped).sort((a, b) => a.ano - b.ano);
    }

    // Fallback leve por município: quando o cubo municipal ainda não chegou
    // (ou nem foi disparado) e não há filtro ativo, usar aggregated.byMunicipio
    // (~75 KB já baixados no load inicial) remapeado para a convenção dos
    // consumidores (cod/nome/regional). Assim RadarChart "Top 5 Municípios" e
    // RankingTable municípios abrem instantaneamente na visão sem filtro.
    let byMunicipioOut = Object.values(mapByMunicipio);
    if (byMunicipioOut.length === 0 && !hasAnyFilter && aggregated.byMunicipio) {
      byMunicipioOut = aggregated.byMunicipio.map(m => ({
        cod: m.cod_ibge,
        nome: m.municipio_oficial,
        regional: m.regional_idr,
        valor: m.valor,
        producao: m.producao,
        area: m.area,
      }));
    }

    return {
      timeSeries,
      totals,
      byCadeia,
      bySubcadeia,
      byProduto,
      byRegional,
      byMunicipio: byMunicipioOut,
      byMeso,
      evolutionCadeia,
      evolutionRegional,
      evolutionMunicipio,
      topProdutosAno,
      hierarchy,
    };
  }, [aggregated, detailed, geoMap, filters]);
}
