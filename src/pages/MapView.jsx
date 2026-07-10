import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/useApp';
import '../css/map.css';

// Mauban, Quezon – approximate bounding box and center
const MAUBAN_CENTER = [14.1927, 121.7305];
const MAUBAN_BOUNDS = [
  [14.0900, 121.6400], // SW corner
  [14.3200, 121.8400], // NE corner
];

// Status → marker colour
const STATUS_COLOR = {
  Pending: '#64748b',
  Resolved: '#10b981',
  'In Progress': '#f59e0b',
  Rejected: '#ef4444',
};

function buildMarkerSvg(color) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26S32 26.667 32 16C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white" fill-opacity="0.85"/>
    </svg>`;
}

export default function MapView() {
  const navigate = useNavigate();
  const { reports } = useApp();
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  // Initialise Leaflet once
  useEffect(() => {
    // Dynamic import so Leaflet (which touches window/document) loads only client-side
    let L;
    let map;

    async function init() {
      L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (leafletMapRef.current) return; // already initialised

      map = L.map(mapRef.current, {
        center: MAUBAN_CENTER,
        zoom: 13,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: MAUBAN_BOUNDS,
        maxBoundsViscosity: 0.9,
      });

      leafletMapRef.current = map;

      // OpenStreetMap tile layer (free, no key needed)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      // Municipality label overlay
      const maubanLabel = L.divIcon({
        html: `<div class="map-municipality-label">Mauban, Quezon</div>`,
        className: '',
        iconAnchor: [60, 12],
      });
      L.marker(MAUBAN_CENTER, { icon: maubanLabel, interactive: false }).addTo(map);
    }

    init();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Sync report markers whenever reports change
  useEffect(() => {
    async function syncMarkers() {
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current;
      if (!map) return;

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const geoReports = reports.filter(
        (r) => r.latitude != null && r.longitude != null
      );

      geoReports.forEach((report) => {
        const color = STATUS_COLOR[report.status] ?? '#6b7280';

        const icon = L.divIcon({
          html: buildMarkerSvg(color),
          className: 'map-custom-icon',
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -44],
        });

        const marker = L.marker([report.latitude, report.longitude], { icon }).addTo(map);

        const popupHtml = `
          <div class="lf-popup">
            <div class="lf-popup-title">${report.issue ?? 'Drainage Issue'}</div>
            <div class="lf-popup-loc">${report.location ?? ''}</div>
            <div class="lf-popup-meta">
              <span class="lf-popup-date">${report.dateSubmitted ?? ''}</span>
              <span class="lf-status lf-status-${report.statusClass ?? ''}">${report.status ?? ''}</span>
            </div>
            <button class="lf-popup-btn" data-id="${report.displayId ?? report.id}">View details</button>
          </div>`;

        marker.bindPopup(popupHtml, { maxWidth: 240, className: 'lf-popup-wrapper' });

        // Handle "View details" click via event delegation on the map container
        marker.on('popupopen', () => {
          const btn = mapRef.current?.querySelector('.lf-popup-btn');
          if (btn) {
            btn.onclick = () => navigate(`/reports?search=${btn.dataset.id}`);
          }
        });

        markersRef.current.push(marker);
      });
    }

    syncMarkers();
  }, [reports, navigate]);

  return (
    <div className="map-page-wrapper">
      <div className="map-header">
        <p className="map-page-sub">Showing drainage reports in Mauban, Quezon</p>
      </div>

      <div className="map-leaflet-card">
        <div ref={mapRef} className="map-leaflet-container" />
      </div>
    </div>
  );
}
