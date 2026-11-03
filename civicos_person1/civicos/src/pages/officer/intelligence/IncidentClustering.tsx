import React, { useState, useEffect } from 'react';
import { predictiveService, GeospatialHotspotsResponse, HotspotCluster } from '../../../services/predictiveService';
import { MapPin, Radio, RefreshCw, Compass } from 'lucide-react';

const IncidentClustering: React.FC = () => {
  const [hotspotData, setHotspotData] = useState<GeospatialHotspotsResponse | null>(null);
  const [epsKm, setEpsKm] = useState<number>(1.5);
  const [minSamples, setMinSamples] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCluster, setSelectedCluster] = useState<HotspotCluster | null>(null);

  useEffect(() => {
    loadSpatialHotspots();
  }, [epsKm, minSamples]);

  const loadSpatialHotspots = async () => {
    setLoading(true);
    try {
      const data = await predictiveService.getHotspots(epsKm, minSamples);
      if (data) {
        setHotspotData(data);
        if (data.hotspots?.length > 0) {
          setSelectedCluster(data.hotspots[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load spatial hotspots:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Spatial Incident Hotspots & Clustering
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Density-based spatial clustering identifying high-frequency hazard epicenters across municipal wards.
          </p>
        </div>
        <button
          onClick={loadSpatialHotspots}
          disabled={loading}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'COMPUTING CLUSTERS...' : 'RE-RUN CLUSTERING'}</span>
        </button>
      </div>

      {/* CLUSTERING PARAMETERS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
            <span>Neighborhood Distance (Epsilon)</span>
            <span className="font-mono text-blue-600">{epsKm.toFixed(1)} km</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={epsKm}
            onChange={(e) => setEpsKm(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="text-[10px] text-slate-500 mt-1">Maximum Haversine radius to group incident points</p>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
            <span>Minimum Cluster Size</span>
            <span className="font-mono text-purple-600">{minSamples} incidents</span>
          </div>
          <input
            type="range"
            min="2"
            max="10"
            step="1"
            value={minSamples}
            onChange={(e) => setMinSamples(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <p className="text-[10px] text-slate-500 mt-1">Minimum incidents to qualify as a systemic hotspot</p>
        </div>

        <div className="flex items-center space-x-4 border-l border-slate-200 pl-6 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Analyzed</span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {hotspotData?.total_incidents_analyzed || 0}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Hotspots Detected</span>
            <span className="text-xl font-black text-orange-600 font-mono">
              {hotspotData?.hotspots_detected_count || 0}
            </span>
          </div>
        </div>
      </div>

      {/* CLUSTERS & DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DETECTED HOTSPOTS CARDS */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Radio className="w-4 h-4 text-orange-600 animate-pulse" />
            <span>Identified Spatial Epicenters ({hotspotData?.hotspots?.length || 0})</span>
          </h3>

          {hotspotData?.hotspots && hotspotData.hotspots.length > 0 ? (
            hotspotData.hotspots.map((cluster) => (
              <div
                key={cluster.cluster_id}
                onClick={() => setSelectedCluster(cluster)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                  selectedCluster?.cluster_id === cluster.cluster_id
                    ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-100'
                    : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Cluster #{cluster.cluster_id}: {cluster.dominant_incident_type}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Center: ({cluster.center_latitude.toFixed(4)}, {cluster.center_longitude.toFixed(4)})
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    {cluster.risk_tier}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Incident Count</span>
                    <span className="font-black text-slate-800 text-base font-mono">{cluster.incident_count}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Avg Severity</span>
                    <span className="font-black text-orange-600 text-base font-mono">{cluster.average_severity.toFixed(1)} / 10</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Exposed Population</span>
                    <span className="font-black text-purple-600 text-base font-mono">
                      {cluster.total_affected_population?.toLocaleString() || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">Covered Municipal Wards:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.wards_covered.slice(0, 6).map((ward, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                        {ward}
                      </span>
                    ))}
                    {cluster.wards_covered.length > 6 && (
                      <span className="text-[10px] text-slate-500 font-bold self-center">
                        +{cluster.wards_covered.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              No clusters formed at this distance threshold. Try increasing Epsilon (km) or decreasing minimum samples.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ZONAL DENSITY SUMMARY */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Compass className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold">Zonal Incident Density</h3>
            </div>

            <div className="space-y-3">
              {hotspotData?.zonal_density &&
                Object.entries(hotspotData.zonal_density).map(([zone, stats]: [string, any], idx) => (
                  <div key={idx} className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{zone}</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-slate-700 px-2 py-0.5 rounded">
                        {stats.incident_count} Incidents
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Avg Severity: {stats.average_severity?.toFixed(1)}</span>
                      <span>Population: {stats.total_population?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 bg-orange-950/60 rounded-xl border border-orange-800/80">
              <p className="text-[10px] uppercase font-black text-orange-400">Operational Strategy</p>
              <p className="text-xs text-orange-200 mt-1 leading-relaxed">
                Pre-position rapid response squads at DBSCAN cluster centroids to reduce emergency response dispatch latency by up to 35%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentClustering;
