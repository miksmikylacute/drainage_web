import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/useApp';
import {
  buildReportMarkerSvg,
  DEFAULT_MAP_ZOOM,
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
        minZoom: 16,
        maxZoom: 19,
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
        popupContent.innerHTML = `
          <div class="map-popup-badge" style="background-color: ${color}">
            ${report.status}
          </div>
          <h4 class="map-popup-title">${report.issue}</h4>
          <p class="map-popup-location">${report.location}</p>
          <p class="map-popup-coords">
            <strong>Coords:</strong> ${formatReportCoordinates(report.latitude, report.longitude)}
          </p>
          <p class="map-popup-reporter">By: ${report.submittedBy}</p>
          <button class="map-popup-action-btn" data-report-id="${report.id}" data-report-status="${report.status}">
            View details
          </button>
        `;

        marker.bindPopup(popupContent);

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
