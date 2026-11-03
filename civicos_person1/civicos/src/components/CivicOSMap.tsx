import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category: string;
  status: string;
  description?: string;
  severity?: string;
  priority?: string;
  distanceFormatted?: string;
  distanceKm?: number;
  date?: string;
  isSample?: boolean;
}

interface CivicOSMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarkerData[];
  pickerMode?: boolean;
  selectedLocation?: [number, number] | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  searchCenter?: [number, number] | null;
  searchRadiusKm?: number;
  onIncidentClick?: (id: string) => void;
  height?: string;
  className?: string;
}

// Category to visual color and emoji
const getCategoryMeta = (category: string, status: string): { color: string; icon: string } => {
  if (status === 'Resolved' || status === 'Closed' || status === 'Verified') {
    return { color: '#10B981', icon: '✓' };
  }
  const cat = (category || '').toLowerCase();
  if (cat.includes('pothole') || cat.includes('crack') || cat.includes('road')) {
    return { color: '#EF4444', icon: '⚠️' };
  }
  if (cat.includes('garbage') || cat.includes('waste') || cat.includes('litter')) {
    return { color: '#F59E0B', icon: '🗑️' };
  }
  if (cat.includes('water') || cat.includes('drain') || cat.includes('manhole')) {
    return { color: '#3B82F6', icon: '💧' };
  }
  if (cat.includes('light') || cat.includes('electric') || cat.includes('power')) {
    return { color: '#8B5CF6', icon: '💡' };
  }
  if (cat.includes('traffic') || cat.includes('safety') || cat.includes('animal')) {
    return { color: '#EC4899', icon: '🚨' };
  }
  return { color: '#6366F1', icon: '📍' };
};

// Generates a self-contained custom Leaflet DivIcon for incidents
const createMapPin = (color: string, emoji: string, isSelected: boolean = false): L.DivIcon => {
  const size = isSelected ? 38 : 32;
  return L.divIcon({
    className: 'civicos-map-pin',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        ${isSelected ? `<div style="
          position: absolute;
          inset: -5px;
          border-radius: 50% 50% 50% 0;
          background-color: ${color};
          opacity: 0.4;
          transform: rotate(-45deg);
        "></div>` : ''}
        <div style="
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
          border: 2px solid white;
          cursor: pointer;
        ">
          <span style="transform: rotate(45deg); font-size: ${isSelected ? 15 : 13}px; line-height: 1;">
            ${emoji}
          </span>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Generates a distinct pulsating pin for searched location / "You Are Here"
const createSearchCenterPin = (): L.DivIcon => {
  return L.divIcon({
    className: 'civicos-search-center-pin',
    html: `
      <div style="position: relative; width: 34px; height: 34px;">
        <div style="
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.3);
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #1D4ED8;
          border: 3px solid #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.4);
          color: white;
          font-size: 15px;
        ">
          📍
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
};

export const CivicOSMap: React.FC<CivicOSMapProps> = ({
  center = [12.9716, 77.5946], // Bengaluru center by default
  zoom = 13,
  markers = [],
  pickerMode = false,
  selectedLocation,
  onLocationSelect,
  searchCenter,
  searchRadiusKm,
  onIncidentClick,
  height = '380px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const searchCenterMarkerRef = useRef<L.Marker | null>(null);
  const searchRadiusCircleRef = useRef<L.Circle | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const [tileError, setTileError] = useState<boolean>(false);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    });

    tileLayer.on('tileerror', () => {
      setTileError(true);
    });

    tileLayer.addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Handle picker mode map click
    if (pickerMode && onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });
    }

    // Attach delegated popup button click listener
    map.on('popupopen', (e) => {
      const popupEl = e.popup.getElement();
      if (!popupEl) return;
      const btn = popupEl.querySelector('.civicos-view-details-btn') as HTMLElement;
      if (btn) {
        btn.onclick = () => {
          const incId = btn.getAttribute('data-incident-id');
          if (incId && onIncidentClick) {
            onIncidentClick(incId);
          }
        };
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update Map Center & Zoom dynamically if props change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (center && typeof center[0] === 'number' && typeof center[1] === 'number') {
      mapInstanceRef.current.setView(center, zoom || mapInstanceRef.current.getZoom(), {
        animate: true,
      });
    }
  }, [center?.[0], center?.[1], zoom]);

  // 3. Render Searched Location Pin & Radius Circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clean up previous search center marker and circle
    if (searchCenterMarkerRef.current) {
      searchCenterMarkerRef.current.remove();
      searchCenterMarkerRef.current = null;
    }
    if (searchRadiusCircleRef.current) {
      searchRadiusCircleRef.current.remove();
      searchRadiusCircleRef.current = null;
    }

    if (searchCenter && searchCenter[0] && searchCenter[1]) {
      const pin = createSearchCenterPin();
      const radiusKm = searchRadiusKm || 3;
      const radiusMeters = radiusKm * 1000;

      // Radius circle
      const circle = L.circle(searchCenter, {
        radius: radiusMeters,
        color: '#2563EB',
        weight: 1.5,
        fillColor: '#3B82F6',
        fillOpacity: 0.08,
        dashArray: '4, 6',
      }).addTo(map);
      searchRadiusCircleRef.current = circle;

      // Center Pin
      const marker = L.marker(searchCenter, { icon: pin, zIndexOffset: 1000 }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
          <div style="font-weight: 700; color: #1D4ED8; margin-bottom: 2px;">
            Searched Location Center
          </div>
          <div style="color: #64748B; font-size: 11px;">
            Radius: <strong>${radiusKm >= 1 ? `${radiusKm} km` : `${radiusKm * 1000} m`}</strong>
          </div>
          <div style="font-family: monospace; font-size: 10px; color: #94A3B8; margin-top: 4px;">
            ${searchCenter[0].toFixed(4)}, ${searchCenter[1].toFixed(4)}
          </div>
        </div>
      `);
      searchCenterMarkerRef.current = marker;
    }
  }, [searchCenter?.[0], searchCenter?.[1], searchRadiusKm]);

  // 4. Render Incident Markers with Rich Popups
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    markers.forEach((m) => {
      if (!m.latitude || !m.longitude) return;
      const { color, icon } = getCategoryMeta(m.category, m.status);
      const pin = createMapPin(color, icon, false);

      const marker = L.marker([m.latitude, m.longitude], { icon: pin });

      const statusColor =
        m.status === 'Resolved' ? '#10B981' :
        m.status === 'InProgress' || m.status === 'In Progress' ? '#6366F1' : '#F59E0B';

      const popupHtml = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 220px; max-width: 260px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
            <span style="
              font-weight: 700;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: ${color};
              background: ${color}15;
              padding: 2px 6px;
              border-radius: 4px;
            ">${m.category}</span>
            <span style="
              font-size: 10px;
              font-weight: 700;
              color: ${statusColor};
              background: ${statusColor}15;
              padding: 2px 6px;
              border-radius: 4px;
            ">
              ${m.status}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #0F172A; margin-bottom: 2px;">
            ${m.title}
          </div>

          ${m.description ? `<p style="color: #475569; font-size: 11px; margin: 4px 0 6px 0; max-height: 48px; overflow: hidden; text-overflow: ellipsis;">${m.description}</p>` : ''}

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
            ${m.distanceFormatted ? `<span style="font-weight: 600; color: #2563EB;">📍 ${m.distanceFormatted} away</span>` : `<span>${m.id}</span>`}
            ${m.priority ? `<span style="font-weight: 600; color: ${m.priority === 'Critical' ? '#DC2626' : m.priority === 'High' ? '#EA580C' : '#64748B'};">${m.priority}</span>` : ''}
          </div>

          <div style="margin-top: 8px;">
            <button
              class="civicos-view-details-btn"
              data-incident-id="${m.id}"
              style="
                width: 100%;
                background-color: #2563EB;
                color: #FFFFFF;
                border: none;
                border-radius: 6px;
                padding: 6px 10px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                transition: background 0.15s ease;
              "
              onmouseover="this.style.backgroundColor='#1D4ED8'"
              onmouseout="this.style.backgroundColor='#2563EB'"
            >
              View Details →
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      layer.addLayer(marker);
    });
  }, [markers]);

  // 5. Render Selected Location Pin in Picker Mode
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }

    if (selectedLocation && selectedLocation[0] && selectedLocation[1]) {
      const pin = createMapPin('#0284C7', '📍', true);
      const marker = L.marker(selectedLocation, { icon: pin }).addTo(map);
      marker.bindPopup(`
        <div style="font-size: 12px; font-weight: 600; color: #0284C7; text-align: center;">
          Selected Coordinates<br/>
          <span style="font-family: monospace; font-size: 11px; color: #64748B;">
            ${selectedLocation[0].toFixed(5)}, ${selectedLocation[1].toFixed(5)}
          </span>
        </div>
      `);
      pickerMarkerRef.current = marker;
    }
  }, [selectedLocation]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Picker Instruction Banner */}
      {pickerMode && (
        <div className="absolute top-3 left-12 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-md text-xs font-medium text-slate-700 pointer-events-none flex items-center space-x-1.5">
          <span className="text-blue-500">📍</span>
          <span>Click anywhere on the map to pin incident location</span>
        </div>
      )}

      {/* Network / Offline Fallback Banner */}
      {tileError && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-amber-50 border border-amber-200 text-amber-800 text-[11px] px-2.5 py-1 rounded-md shadow-sm">
          Map tiles offline: local coordinate grid active
        </div>
      )}
    </div>
  );
};

export default CivicOSMap;
