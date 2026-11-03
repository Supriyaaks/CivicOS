import React, { useState, useMemo } from 'react';
import { useMccStore } from '../../../store/mccStore';
import { CivicOSMap, MapMarkerData } from '../../../components/CivicOSMap';

const GeospatialIntelligence: React.FC = () => {
  const { incidents } = useMccStore();
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredIncidents = activeFilter === 'all'
    ? incidents
    : incidents.filter(inc => inc.severity === activeFilter);

  const mapMarkers: MapMarkerData[] = useMemo(() => {
    const baseCoords = [
      { lat: 12.9352, lng: 77.6245 },
      { lat: 12.9716, lng: 77.5946 },
      { lat: 13.0358, lng: 77.5970 },
      { lat: 12.9784, lng: 77.6408 },
      { lat: 12.9250, lng: 77.5890 },
      { lat: 12.9698, lng: 77.7500 },
    ];

    return filteredIncidents.map((inc, i) => {
      const coord = baseCoords[i % baseCoords.length];
      return {
        id: inc.id,
        latitude: coord.lat,
        longitude: coord.lng,
        title: `${inc.id}: ${inc.category}`,
        category: inc.category,
        status: inc.status,
        description: inc.description || inc.location,
        severity: inc.severity,
        isSample: false
      };
    });
  }, [filteredIncidents]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Geospatial Intelligence</h1>
        <div className="flex space-x-2">
          {['all', 'Critical', 'High', 'Medium', 'Low'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${activeFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <CivicOSMap
            center={[12.9716, 77.5946]}
            zoom={12}
            markers={mapMarkers}
            height="500px"
          />
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Spatial Insights</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase">Primary Cluster</p>
                <p className="text-sm font-bold text-slate-700">Sector 4 - Industrial Zone</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase">Risk Correlation</p>
                <p className="text-sm text-slate-700">High correlation with road surface age.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
            <h3 className="font-bold mb-2 flex items-center space-x-2">
              <span>🔍</span>
              <span>Geospatial AI</span>
            </h3>
            <p className="text-xs opacity-90 leading-relaxed">
              Pattern analysis suggests a 20% increase in water-related incidents in the North-East quadrant during next week's predicted rain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeospatialIntelligence;
