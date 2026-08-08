import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/useApp';
import {
  buildReportMarkerSvg,
  DEFAULT_MAP_ZOOM,
  MIN_MAP_ZOOM,
  MAX_MAP_ZOOM,
  getReportStatusColor,
  isReportVisibleOnMap,
  MAUBAN_BOUNDS,
  MAUBAN_CENTER,
  REPORT_STATUS_LEGEND,
} from '../lib/reportMapMarkers';
import { formatReportCoordinates } from '../lib/reportCoordinates';
import '../css/map.css';

export default function MapView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusReportId = searchParams.get('focus');
  const { reports, reportLogs } = useApp();
  const [archiveNow, setArchiveNow] = useState(() => new Date());
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setArchiveNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

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
        zoom: DEFAULT_MAP_ZOOM,
        minZoom: MIN_MAP_ZOOM,
        maxZoom: MAX_MAP_ZOOM,
        maxBounds: MAUBAN_BOUNDS,
        maxBoundsViscosity: 1.0,
      });

      leafletMapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 0);

      // OpenStreetMap tile layer (free, no key needed)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);


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

      const geoReports = reports.filter((r) =>
        isReportVisibleOnMap(r, reportLogs || [], archiveNow)
      );
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

        const popupContent = document.createElement('div');
        popupContent.className = 'map-popup-card';
        const statusSlug = (report.status || '').toLowerCase().replace(/\s+/g, '');
        popupContent.innerHTML = `
          <div class="map-popup-header">
            <span class="map-popup-badge status-${statusSlug}">
              <span class="map-popup-badge-dot"></span>
              ${report.status}
            </span>
          </div>
          <h4 class="map-popup-title">${report.issue}</h4>
          <p class="map-popup-location">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="map-popup-loc-icon"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${report.location}</span>
          </p>
          <div class="map-popup-coords-box">
            <span class="map-popup-coords-label">Coords:</span>
            <span class="map-popup-coords-val">${formatReportCoordinates(report.latitude, report.longitude)}</span>
          </div>
          <div class="map-popup-reporter">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>By: <strong>${report.submittedBy}</strong></span>
          </div>
          <button class="map-popup-action-btn lf-popup-btn" data-report-id="${report.id}" data-report-status="${report.status}">
            <span>View details</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        `;

        marker.bindPopup(popupContent, {
          className: 'lf-popup-wrapper',
          maxWidth: 270,
          minWidth: 230,
          autoPan: true,
          autoPanPadding: [20, 80],
          autoPanPaddingTopLeft: [20, 80],
          autoPanPaddingBottomRight: [20, 20],
        });

        marker.on('popupopen', () => {
          const btn = popupContent.querySelector('.map-popup-action-btn');
          if (btn) {
            const params = new URLSearchParams({
              focus: btn.dataset.reportId,
              status: btn.dataset.reportStatus,
            });
            btn.onclick = () => navigate(`/reports?${params.toString()}`);
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
        map.fitBounds(bounds.pad(0.2), { maxZoom: 18 });
      } else {
        map.setView(MAUBAN_CENTER, DEFAULT_MAP_ZOOM);
      }
    }

    syncMarkers();
  }, [reports, reportLogs, archiveNow, navigate, mapReady, focusReportId]);

  return (
    <div className="map-page-wrapper">
      <div className="map-header">
        <p className="map-page-sub">Showing drainage reports in Brgy. Soledad, Mauban, Quezon</p>
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
