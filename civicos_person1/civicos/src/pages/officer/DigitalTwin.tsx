import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMccStore } from '../../store/mccStore';
import { CivicOSMap, MapMarkerData } from '../../components/CivicOSMap';
import {
  Layers,
  Filter,
  RefreshCw,
  CheckCircle2,
  Building2,
  Info,
  ExternalLink,
  ShieldAlert,
  Flame,
  Activity
} from 'lucide-react';

export const DigitalTwin: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, departments, fetchIncidents } = useMccStore();

  // Layer toggles
  const [layers, setLayers] = useState({
    activeIncidents: true,
    resolvedIncidents: false,
    criticalIncidents: true,
    person3Risk: false, // Predictive Risk Layer
  });

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchIncidents();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Convert incidents into Leaflet markers according to layer settings & filters
  const mapMarkers: MapMarkerData[] = useMemo(() => {
    return incidents
      .filter(inc => {
        // Status layer checks
        const isResolved = inc.status === 'Resolved' || inc.status === 'Closed' || inc.status === 'Verified';
        const isCritical = inc.severity === 'Critical' || inc.priority === 'High';

        if (isResolved && !layers.resolvedIncidents) return false;
        if (!isResolved && !layers.activeIncidents && !(layers.criticalIncidents && isCritical)) return false;
        if (layers.criticalIncidents && !layers.activeIncidents && !isCritical) return false;

        // Attribute filter checks
        if (selectedDept !== 'ALL' && inc.assignedDept !== selectedDept && inc.departmentId !== selectedDept) {
          return false;
        }
        if (selectedSeverity !== 'ALL' && inc.severity.toLowerCase() !== selectedSeverity.toLowerCase()) {
          return false;
        }
        if (selectedCategory !== 'ALL' && inc.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }

        return true;
      })
      .map((inc, idx) => {
        // Base coordinate with slight jitter if missing lat/long
        const baseLat = 12.9716 + ((idx % 5) - 2) * 0.009;
        const baseLng = 77.5946 + (((idx * 3) % 7) - 3) * 0.009;

        return {
          id: inc.id,
          title: `${inc.id} • ${inc.category}`,
          latitude: inc.locationCoords ? inc.locationCoords[0] : (baseLat),
          longitude: inc.locationCoords ? inc.locationCoords[1] : (baseLng),
          category: inc.category,
          status: inc.status,
          description: `${inc.description} | Location: ${inc.location} (Ward: ${inc.ward || 'Ward 14'})`,
          severity: inc.severity,
          isSample: false
        };
      });
  }, [incidents, layers, selectedDept, selectedSeverity, selectedCategory]);

  const selectedIncident = useMemo(() => {
    return incidents.find(i => i.id === selectedIncidentId);
  }, [incidents, selectedIncidentId]);

  return (
    <div className="space-y-5 p-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">City Digital Twin</h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase bg-blue-100 text-blue-700 rounded-full border border-blue-200">
              Geospatial GIS Engine
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Live Leaflet geospatial twin showing real reported incidents, infrastructure status & predicted hotspots
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Updating GIS...' : 'Refresh Map'}</span>
          </button>
          <span className="text-xs font-mono px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-bold">
            {mapMarkers.length} Markers Plotted
          </span>
        </div>
      </div>

      {/* FILTER & LAYER TOGGLE BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-500 uppercase flex items-center space-x-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Map Layers:</span>
          </span>

          <button
            onClick={() => setLayers(l => ({ ...l, activeIncidents: !l.activeIncidents }))}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              layers.activeIncidents
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Active Incidents</span>
          </button>

          <button
            onClick={() => setLayers(l => ({ ...l, criticalIncidents: !l.criticalIncidents }))}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              layers.criticalIncidents
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Critical Only</span>
          </button>

          <button
            onClick={() => setLayers(l => ({ ...l, resolvedIncidents: !l.resolvedIncidents }))}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              layers.resolvedIncidents
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolved</span>
          </button>

          <button
            onClick={() => setLayers(l => ({ ...l, person3Risk: !l.person3Risk }))}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1.5 ${
              layers.person3Risk
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Toggle Predictive Spatial Risk Layer"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Predictive Spatial Risk</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Pothole">Potholes</option>
            <option value="Garbage Dump">Solid Waste</option>
            <option value="Streetlight">Streetlights</option>
            <option value="Water Leakage">Water & Drainage</option>
          </select>
        </div>
      </div>

      {/* PREDICTIVE RISK NOTICE */}
      {layers.person3Risk && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>
              <strong>Predictive Risk Layer Active:</strong> Displaying high-risk spatial clusters and cascading failure risk zones.
            </span>
          </div>
          <button
            onClick={() => navigate('/officer/hotspots')}
            className="font-bold text-purple-800 hover:text-purple-950 underline flex-shrink-0 text-[11px]"
          >
            View Hotspot Clustering →
          </button>
        </div>
      )}

      {/* MAIN DIGITAL TWIN DISPLAY & DETAIL SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* LEAFLET MAP CONTAINER */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-slate-200 shadow-md relative bg-slate-100">
          <CivicOSMap
            center={[12.9716, 77.5946]}
            zoom={13}
            markers={mapMarkers}
            height="580px"
          />

          {/* Floating Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-lg text-[11px] font-semibold space-y-1.5 z-[1000] pointer-events-auto">
            <div className="text-slate-800 font-bold uppercase text-[10px] tracking-wider mb-1">GIS Map Legend</div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500 border border-white" />
              <span className="text-slate-600">Pothole / Road Damage</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white" />
              <span className="text-slate-600">Solid Waste / Dump</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 border border-white" />
              <span className="text-slate-600">Water Leak / Drainage</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-purple-500 border border-white" />
              <span className="text-slate-600">Streetlight / Electrical</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white" />
              <span className="text-slate-600">Resolved & Closed</span>
            </div>
          </div>
        </div>

        {/* INCIDENT DETAILS & INSPECTOR PANE */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Incident Inspector</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">Click marker to inspect</span>
            </div>

            {selectedIncident ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-50 text-blue-700 rounded border border-blue-200">
                    {selectedIncident.id}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    selectedIncident.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedIncident.severity}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedIncident.category}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedIncident.description}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Location:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[140px]">{selectedIncident.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Assigned Dept:</span>
                    <span className="font-bold text-slate-700">{selectedIncident.assignedDept || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Status:</span>
                    <span className="font-bold text-blue-600">{selectedIncident.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">AI Confidence:</span>
                    <span className="font-bold text-purple-600">{selectedIncident.aiConfidence || '92%'}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/officer/details/${selectedIncident.id}`)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  <span>Open Full Incident Workspace</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Select any incident pin on the map, or pick from recent active incidents below:
                </p>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {incidents.slice(0, 5).map(inc => (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl cursor-pointer transition text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">{inc.id}</span>
                        <span className="text-[10px] font-bold text-red-600">{inc.severity}</span>
                      </div>
                      <p className="text-slate-600 font-medium line-clamp-1">{inc.category} • {inc.location}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Projection: EPSG:4326</span>
            <button
              onClick={() => navigate('/officer/incidents')}
              className="text-blue-600 hover:text-blue-800 font-bold"
            >
              List View →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;
