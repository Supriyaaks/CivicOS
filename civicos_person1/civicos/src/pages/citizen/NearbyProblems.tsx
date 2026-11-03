import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { backendService, LocationSuggestion } from '../../services/backendService';
import { CivicOSMap, MapMarkerData } from '../../components/CivicOSMap';
import { Search, MapPin, Navigation, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Roads and Potholes',
  'Street Lighting',
  'Water Supply',
  'Drainage and Sewage',
  'Garbage and Waste Management',
  'Public Infrastructure',
  'Traffic and Road Safety',
  'Other',
];

const RADIUS_OPTIONS = [
  { label: '500 m', value: 0.5 },
  { label: '1 km', value: 1.0 },
  { label: '3 km', value: 3.0 },
  { label: '5 km', value: 5.0 },
  { label: '10 km', value: 10.0 },
];

const STATUS_OPTIONS = ['All', 'Pending', 'In Progress', 'Resolved'];

export const NearbyProblems: React.FC = () => {
  const navigate = useNavigate();

  // Search & Geocoding State
  const [searchQuery, setSearchQuery] = useState('Indiranagar, Bengaluru');
  const [selectedLocationName, setSelectedLocationName] = useState('Indiranagar, Bengaluru');
  const [coordinates, setCoordinates] = useState<[number, number]>([12.9784, 77.6408]); // Default Indiranagar
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{ type: 'info' | 'error'; message: string } | null>(null);

  // Filters State
  const [radiusKm, setRadiusKm] = useState<number>(3.0);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');
  const [sortBy, setSortBy] = useState<'distance' | 'recent' | 'priority'>('distance');

  // Incidents Results State
  const [nearbyIncidents, setNearbyIncidents] = useState<any[]>([]);
  const [totalFound, setTotalFound] = useState<number>(0);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Debounced Geocoding Autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // If query matches current selected location, don't re-trigger dropdown
    if (searchQuery === selectedLocationName) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const results = await backendService.searchLocations(searchQuery, 5);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery, selectedLocationName]);

  // 2. Query Real PostgreSQL Incidents via Express Backend
  const fetchNearbyIncidents = async () => {
    setIsLoadingIncidents(true);
    setFetchError(null);
    try {
      const res = await backendService.getNearbyIncidents({
        latitude: coordinates[0],
        longitude: coordinates[1],
        radiusKm,
        status: statusFilter,
        category: categoryFilter,
        limit: 50,
      });

      if (res) {
        setNearbyIncidents(res.incidents || []);
        setTotalFound(res.count || 0);
      } else {
        setNearbyIncidents([]);
        setTotalFound(0);
      }
    } catch (err: any) {
      console.error('Failed to retrieve nearby incidents:', err);
      setFetchError('Unable to connect to municipal incident database. Please check your connection and retry.');
      setNearbyIncidents([]);
      setTotalFound(0);
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  // Re-fetch when location, radius, status or category changes
  useEffect(() => {
    fetchNearbyIncidents();
  }, [coordinates[0], coordinates[1], radiusKm, statusFilter, categoryFilter]);

  // Handle Selection of Location Suggestion
  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setCoordinates([item.latitude, item.longitude]);
    setSelectedLocationName(item.name || item.displayName.split(',')[0]);
    setSearchQuery(item.displayName);
    setShowSuggestions(false);
    setLocationNotice(null);
  };

  // Manual Geocode on Enter or Click Search
  const handleManualSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setShowSuggestions(false);
    setIsSearchingLocation(true);
    setLocationNotice(null);

    try {
      const results = await backendService.searchLocations(searchQuery, 1);
      if (results && results.length > 0) {
        const item = results[0];
        setCoordinates([item.latitude, item.longitude]);
        setSelectedLocationName(item.name || item.displayName.split(',')[0]);
        setSearchQuery(item.displayName);
      } else {
        setLocationNotice({
          type: 'error',
          message: `Could not pinpoint coordinates for "${searchQuery}". Please select a landmark or check spelling.`
        });
      }
    } catch {
      setLocationNotice({
        type: 'error',
        message: 'Location service temporarily unavailable. Please try again.'
      });
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // 3. Browser Geolocation (Use My Location)
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice({
        type: 'error',
        message: 'Geolocation is not supported by your browser.'
      });
      return;
    }

    setIsLocatingUser(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));
        setCoordinates([lat, lng]);

        // Attempt reverse geocoding to give a friendly name
        try {
          const rev = await backendService.reverseGeocode(lat, lng);
          const friendlyName = rev?.locality ? `${rev.locality}, Bengaluru` : `My GPS Location (${lat}, ${lng})`;
          setSelectedLocationName(friendlyName);
          setSearchQuery(rev?.displayName || friendlyName);
          setLocationNotice({
            type: 'info',
            message: `Located: ${friendlyName}. Showing civic issues around your current position.`
          });
        } catch {
          setSelectedLocationName(`GPS Location (${lat}, ${lng})`);
          setSearchQuery(`GPS (${lat}, ${lng})`);
        } finally {
          setIsLocatingUser(false);
        }
      },
      (error) => {
        setIsLocatingUser(false);
        let errorMsg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. You can manually enter your neighborhood name above.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please enter your location manually.';
        }
        setLocationNotice({ type: 'error', message: errorMsg });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // 4. Sorted Incident Results
  const sortedIncidents = useMemo(() => {
    const list = [...nearbyIncidents];
    if (sortBy === 'distance') {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'priority') {
      const priorityOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      list.sort((a, b) => (priorityOrder[b.priority || b.severity] || 0) - (priorityOrder[a.priority || a.severity] || 0));
    }
    return list;
  }, [nearbyIncidents, sortBy]);

  // 5. Map Markers synchronized with real incidents
  const mapMarkers: MapMarkerData[] = useMemo(() => {
    return sortedIncidents
      .filter(inc => inc.latitude && inc.longitude)
      .map(inc => ({
        id: inc.incidentCode || inc.id,
        latitude: inc.latitude,
        longitude: inc.longitude,
        title: inc.location || inc.category,
        category: inc.category,
        status: inc.status,
        description: inc.description,
        priority: inc.priority || inc.severity,
        distanceFormatted: inc.distanceFormatted,
        distanceKm: inc.distanceKm,
        date: new Date(inc.createdAt).toLocaleDateString(),
        isSample: false,
      }));
  }, [sortedIncidents]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Nearby Civic Problems</h1>
        <p className="text-sm text-slate-500 font-medium">
          Discover and monitor civic incidents reported by citizens within your immediate municipal vicinity.
        </p>
      </div>

      {/* SEARCH & FILTERS PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Search Bar & My Location Button */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          <div ref={searchContainerRef} className="md:col-span-8 relative">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Search Area / Landmark / Locality
            </label>
            <form onSubmit={handleManualSearch} className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Enter address, locality, landmark (e.g. Indiranagar, Bengaluru)..."
                className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isSearchingLocation}
                className="absolute right-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {isSearchingLocation ? 'Locating...' : 'Search'}
              </button>
            </form>

            {/* Suggestions Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-[2000] overflow-hidden">
                <div className="p-2 border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Location Suggestions (OpenStreetMap)
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left p-3 hover:bg-blue-50/70 transition flex items-start space-x-2.5 group"
                    >
                      <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5 transition" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {item.name || item.displayName.split(',')[0]}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {item.displayName}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Use My Location Button */}
          <div className="md:col-span-4">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Current GPS
            </label>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={isLocatingUser}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 text-blue-600 ${isLocatingUser ? 'animate-spin' : ''}`} />
              <span>{isLocatingUser ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
            </button>
          </div>
        </div>

        {/* Location Notice Banner */}
        {locationNotice && (
          <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            locationNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{locationNotice.message}</span>
            </div>
            <button
              onClick={() => setLocationNotice(null)}
              className="text-slate-400 hover:text-slate-700 font-bold ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Radius, Category, and Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Radius Selector */}
          <div>
            <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Search Radius
            </label>
            <div className="grid grid-cols-5 gap-1">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRadiusKm(r.value)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                    radiusKm === r.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st === 'All' ? 'All Statuses' : st}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Category Filter
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* INTERACTIVE OPENSTREETMAP SECTION */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Interactive Geospatial Map (OpenStreetMap)
            </h2>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              Radius: {radiusKm >= 1 ? `${radiusKm} km` : `${radiusKm * 1000} m`}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Center: <strong>{selectedLocationName}</strong> • Click any pin for problem diagnosis
          </span>
        </div>

        <CivicOSMap
          center={coordinates}
          zoom={radiusKm <= 0.5 ? 16 : radiusKm <= 1.0 ? 15 : radiusKm <= 3.0 ? 14 : radiusKm <= 5.0 ? 13 : 12}
          searchCenter={coordinates}
          searchRadiusKm={radiusKm}
          markers={mapMarkers}
          onIncidentClick={(id) => navigate(`/citizen/complaint/${id}`)}
          height="400px"
          className="shadow-sm"
        />
      </div>

      {/* RESULTS LIST SECTION: CIVIC PROBLEMS NEAR THIS LOCATION */}
      <div className="space-y-4">
        {/* Results Header with Count & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Civic Problems Near This Location
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLoadingIncidents ? (
                'Querying municipal database...'
              ) : (
                <>
                  <strong className="text-slate-800 font-bold">{totalFound}</strong> civic problem{totalFound === 1 ? '' : 's'} found within{' '}
                  <strong className="text-blue-600 font-bold">{radiusKm >= 1 ? `${radiusKm} km` : `${radiusKm * 1000} m`}</strong> of{' '}
                  <strong className="text-slate-800">{selectedLocationName}</strong>.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs font-semibold text-slate-500">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold bg-white border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-blue-500"
            >
              <option value="distance">Nearest First</option>
              <option value="recent">Most Recently Reported</option>
              <option value="priority">Highest Priority</option>
            </select>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoadingIncidents ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Scanning civic incidents within {radiusKm} km radius...</p>
          </div>
        ) : fetchError ? (
          <div className="bg-rose-50 p-8 rounded-2xl border border-rose-200 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-rose-800">{fetchError}</p>
            <button
              onClick={fetchNearbyIncidents}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition"
            >
              Retry Database Search
            </button>
          </div>
        ) : sortedIncidents.length > 0 ? (
          /* Incident Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedIncidents.map((p) => {
              const statusBadgeColor =
                p.status === 'Resolved' || p.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                p.status === 'InProgress' || p.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-amber-100 text-amber-800 border-amber-200';

              const priorityColor =
                p.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                p.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-slate-50 text-slate-600 border-slate-200';

              return (
                <div
                  key={p.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded tracking-wide">
                          {p.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {p.incidentCode || p.id}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusBadgeColor}`}>
                          {p.status}
                        </span>
                        {p.priority && (
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${priorityColor}`}>
                            {p.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {p.location || p.category}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {p.description || 'No detailed description logged.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3 text-slate-500">
                      <span className="flex items-center space-x-1 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        <span>📍</span>
                        <span>{p.distanceFormatted} away</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/citizen/complaint/${p.incidentCode || p.id}`)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
              🔍
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-800">No Civic Problems Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No reported civic problems were found within {radiusKm >= 1 ? `${radiusKm} km` : `${radiusKm * 1000} m`} of{' '}
                <strong>{selectedLocationName}</strong> matching your active filters.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Try expanding search radius:</span>
              <button
                onClick={() => setRadiusKm(5.0)}
                className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
              >
                Expand to 5 km
              </button>
              <button
                onClick={() => setRadiusKm(10.0)}
                className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
              >
                Expand to 10 km
              </button>
              {(statusFilter !== 'All' || categoryFilter !== 'All Categories') && (
                <button
                  onClick={() => { setStatusFilter('All'); setCategoryFilter('All Categories'); }}
                  className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyProblems;
