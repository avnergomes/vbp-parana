import { useEffect, useRef, useMemo, useState } from 'react';
import { MapPin, Layers } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

export default function MapChart({ data, geoData, metric = 'valor' }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerRef = useRef(null);
  const [selectedMetric, setSelectedMetric] = useState(metric);

  const municipioData = useMemo(() => {
    if (!data?.byMunicipio) return {};
    const map = {};
    data.byMunicipio.forEach(item => {
      if (item.cod) {
        map[item.cod] = item;
      }
    });
    return map;
  }, [data]);

  const { minVal, maxVal } = useMemo(() => {
    if (!data?.byMunicipio?.length) return { minVal: 0, maxVal: 1 };
    const values = data.byMunicipio.map(d => d[selectedMetric] || 0).filter(v => v > 0);
    return {
      minVal: Math.min(...values),
      maxVal: Math.max(...values),
    };
  }, [data, selectedMetric]);

  useEffect(() => {
    if (!mapRef.current || !geoData || mapInstanceRef.current) return;

    // Dynamically import Leaflet
    import('leaflet').then(L => {
      // Initialize map
      const map = L.map(mapRef.current, {
        center: [-24.7, -51.5],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Add tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geoData]);

  useEffect(() => {
    if (!mapInstanceRef.current || !geoData) return;

    import('leaflet').then(L => {
      // Remove existing layer
      if (layerRef.current) {
        mapInstanceRef.current.removeLayer(layerRef.current);
      }

      const getColor = (value) => {
        if (!value || value === 0) return '#f3f4f6';

        const normalized = (value - minVal) / (maxVal - minVal);
        const colors = [
          '#dcfce7', // lightest green
          '#86efac',
          '#4ade80',
          '#22c55e',
          '#16a34a',
          '#15803d',
          '#166534', // darkest green
        ];

        const index = Math.min(Math.floor(normalized * colors.length), colors.length - 1);
        return colors[index];
      };

      const style = (feature) => {
        const codIbge = feature.properties?.CodIbge;
        const mData = municipioData[codIbge];
        const value = mData ? mData[selectedMetric] : 0;

        return {
          fillColor: getColor(value),
          weight: 1,
          opacity: 1,
          color: '#ffffff',
          fillOpacity: 0.8,
        };
      };

      const onEachFeature = (feature, layer) => {
        const codIbge = feature.properties?.CodIbge;
        const nome = feature.properties?.Municipio || 'Desconhecido';
        const regional = feature.properties?.RegIdr || '-';
        const mData = municipioData[codIbge];

        const valor = mData?.valor || 0;
        const producao = mData?.producao || 0;
        const area = mData?.area || 0;

        layer.bindTooltip(`
          <div style="font-family: system-ui; min-width: 180px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #166534;">${nome}</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${regional}</div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
              <span style="color: #6b7280;">Valor:</span>
              <span style="font-weight: 500; color: #166534;">${formatCurrency(valor)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
              <span style="color: #6b7280;">Produção:</span>
              <span style="font-weight: 500;">${formatNumber(producao)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #6b7280;">Área:</span>
              <span style="font-weight: 500;">${formatNumber(area)} ha</span>
            </div>
          </div>
        `, {
          className: 'custom-tooltip',
          sticky: true,
        });

        layer.on({
          mouseover: (e) => {
            e.target.setStyle({
              weight: 3,
              color: '#166534',
              fillOpacity: 0.9,
            });
          },
          mouseout: (e) => {
            layerRef.current.resetStyle(e.target);
          },
        });
      };

      const geoLayer = L.geoJSON(geoData, {
        style,
        onEachFeature,
      }).addTo(mapInstanceRef.current);

      layerRef.current = geoLayer;
    });
  }, [geoData, municipioData, selectedMetric, minVal, maxVal]);

  const metricOptions = [
    { value: 'valor', label: 'Valor (R$)' },
    { value: 'producao', label: 'Produção' },
    { value: 'area', label: 'Área (ha)' },
  ];

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-water-100 rounded-lg">
            <MapPin className="w-5 h-5 text-water-600" />
          </div>
          <h3 className="section-title">Mapa Territorial</h3>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-earth-400" />
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="filter-select w-auto"
          >
            {metricOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div
        ref={mapRef}
        className="h-[500px] rounded-xl overflow-hidden border border-earth-200"
        style={{ background: '#f8fafc' }}
      />

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <span className="text-xs text-earth-500">Menor</span>
        <div className="flex h-3 rounded overflow-hidden">
          {['#dcfce7', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534'].map((color, i) => (
            <div key={i} className="w-8 h-full" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-xs text-earth-500">Maior</span>
      </div>

      <p className="text-xs text-earth-400 text-center mt-2">
        Passe o mouse sobre um município para ver os detalhes
      </p>
    </div>
  );
}
