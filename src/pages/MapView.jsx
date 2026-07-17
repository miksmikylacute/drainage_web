import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/useApp';
import {
  buildReportMarkerSvg,
  getReportStatusColor,
  hasReportCoordinates,
  MAUBAN_BOUNDS,
  MAUBAN_CENTER,
  REPORT_STATUS_LEGEND,
} from '../lib/reportMapMarkers';
import '../css/map.css';

export default function MapView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusReportId = searchParams.get('focus');
  const { reports } = useApp();
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialise Leaflet once
  useEffect(() => {
    // Dynamic import so Leaflet (which touches window/document) loads only client-side
    let cancelled = false;

    async function init() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (cancelled || leafletMapRef.current || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: MAUBAN_CENTER,
        zoom: 13,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: MAUBAN_BOUNDS,
        maxBoundsViscosity: 0.9,
      });

      leafletMapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 0);

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
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Sync report markers whenever reports change
  useEffect(() => {
    async function syncMarkers() {
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current;
      if (!map || !mapReady) return;

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const geoReports = reports.filter(hasReportCoordinates);
      let focusedMarker = null;

      geoReports.forEach((report) => {
        const color = getReportStatusColor(report.status);

        const icon = L.divIcon({
          html: buildReportMarkerSvg(color),
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

        if (focusReportId && (report.id === focusReportId || report.displayId === focusReportId)) {
          focusedMarker = marker;
        }
      });

      if (focusedMarker) {
        map.setView(focusedMarker.getLatLng(), 18);
        focusedMarker.openPopup();
      } else if (geoReports.length > 0) {
        const bounds = L.latLngBounds(
          geoReports.map((report) => [report.latitude, report.longitude])
        );
        map.fitBounds(bounds.pad(0.2), { maxZoom: 17 });
      }
    }

    syncMarkers();
  }, [reports, navigate, mapReady, focusReportId]);

  return (
    <div className="map-page-wrapper">
      <div className="map-header">
        <p className="map-page-sub">Showing drainage reports in Mauban, Quezon</p>
        <div className="map-legend" aria-label="Report status legend">
          {REPORT_STATUS_LEGEND.map((item) => (
            <span key={item.status} className="map-legend-item">
              <span className="map-legend-dot" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="map-leaflet-card">
        <div ref={mapRef} className="map-leaflet-container" />
      </div>
    </div>
  );
}
