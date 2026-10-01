import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useApp } from '../context/useApp';
import {
  buildReportMarkerSvg,
  DEFAULT_MAP_ZOOM,
  MIN_MAP_ZOOM,
  MAX_MAP_ZOOM,
  getReportStatusColor,
  hasReportCoordinates,
  isReportVisibleOnMap,
  MAUBAN_BOUNDS,
  MAUBAN_CENTER,
  REPORT_STATUS_COLORS,
} from '../lib/reportMapMarkers';
import { formatReportCoordinates, cleanLocationText, disambiguateReportCoordinates } from '../lib/reportCoordinates';
import { getRemainingArchiveTime } from '../lib/reportArchiveRules';
import '../css/map.css';

const STATUS_OPTIONS = [
  { status: 'Pending', label: 'Pending', color: REPORT_STATUS_COLORS.Pending },
  { status: 'In Progress', label: 'In Progress', color: REPORT_STATUS_COLORS['In Progress'] },
  { status: 'Resolved', label: 'Resolved', color: REPORT_STATUS_COLORS.Resolved },
  { status: 'Rejected', label: 'Rejected', color: REPORT_STATUS_COLORS.Rejected },
];

const ALL_STATUSES = STATUS_OPTIONS.map((item) => item.status);

export default function MapView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusReportId = searchParams.get('focus');
  const { reports, reportLogs } = useApp();
  const [archiveNow, setArchiveNow] = useState(() => new Date());
  const [selectedStatuses, setSelectedStatuses] = useState(() => new Set(ALL_STATUSES));
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setArchiveNow(new Date()), 10 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Only active (non-archived) reports with valid coordinates
  const coordinateReports = useMemo(() => {
    return (reports || []).filter((r) =>
      isReportVisibleOnMap(r, reportLogs || [], archiveNow)
    );
  }, [reports, reportLogs, archiveNow]);

  // Live marker count per status (active, unarchived reports only)
  const statusCounts = useMemo(() => {
    const counts = {
      all: coordinateReports.length,
      Pending: 0,
      'In Progress': 0,
      Resolved: 0,
      Rejected: 0,
    };
    coordinateReports.forEach((r) => {
      if (counts[r.status] !== undefined) {
        counts[r.status] += 1;
      }
    });
    return counts;
  }, [coordinateReports]);

  // Reports matching currently selected filter statuses (or matching targeted focus report)
  const visibleReports = useMemo(() => {
    const baseReports = coordinateReports.filter((r) => selectedStatuses.has(r.status));
    if (focusReportId) {
      const focusedReport = (reports || []).find(
        (r) => hasReportCoordinates(r) && (r.id === focusReportId || r.displayId === focusReportId)
      );
      if (focusedReport && !baseReports.some((r) => r.id === focusedReport.id)) {
        return [...baseReports, focusedReport];
      }
    }
    return baseReports;
  }, [coordinateReports, selectedStatuses, focusReportId, reports]);

  const isAllSelected = selectedStatuses.size === ALL_STATUSES.length;

  // Toggle & stacking logic
  const handleToggleStatus = (status) => {
    setSelectedStatuses((prev) => {
      const allActive = prev.size === ALL_STATUSES.length;

      // If all are currently active and user clicks one, isolate that status
      if (allActive) {
        return new Set([status]);
      }

      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
        // If unchecking the last active status, reset back to all
        if (next.size === 0) {
          return new Set(ALL_STATUSES);
        }
      } else {
        // Stack additional status
        next.add(status);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedStatuses(new Set(ALL_STATUSES));
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialise Leaflet once
  useEffect(() => {
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

  // Sync report markers whenever visibleReports change
  useEffect(() => {
    async function syncMarkers() {
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current;
      if (!map || !mapReady) return;

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      let focusedMarker = null;

      const disambiguatedReports = disambiguateReportCoordinates(visibleReports);

      disambiguatedReports.forEach(({ report, displayLat, displayLng }) => {
        const color = getReportStatusColor(report.status);

        const icon = L.divIcon({
          html: buildReportMarkerSvg(color),
          className: 'map-custom-icon',
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -44],
        });

        const marker = L.marker([displayLat, displayLng], { icon }).addTo(map);

        const remaining = (report.status === 'Resolved' || report.status === 'Rejected')
          ? getRemainingArchiveTime(report, reportLogs, archiveNow)
          : null;
        const timerHtml = remaining && !remaining.isExpired
          ? `<span class="map-popup-timer" title="Active on map for this remaining time">⏱ ${remaining.text}</span>`
          : '';

        const popupContent = document.createElement('div');
        popupContent.className = 'map-popup-card';
        const statusSlug = (report.status || '').toLowerCase().replace(/\s+/g, '');
        popupContent.innerHTML = `
          <div class="map-popup-header">
            <span class="map-popup-badge status-${statusSlug}">
              <span class="map-popup-badge-dot"></span>
              ${report.status}
            </span>
            ${timerHtml}
          </div>
          <h4 class="map-popup-title">${report.issue || report.title || 'Drainage Report'}</h4>
          <p class="map-popup-location">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="map-popup-loc-icon"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>${cleanLocationText(report.location)}</span>
          </p>
          <div class="map-popup-coords-box">
            <span class="map-popup-coords-label">Coordinates:</span>
            <span class="map-popup-coords-val">${formatReportCoordinates(report)}</span>
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
          marker.setZIndexOffset(1000);
        }
      });

      if (focusedMarker) {
        map.setView(focusedMarker.getLatLng(), 18);
        focusedMarker.openPopup();
      } else if (visibleReports.length > 0) {
        const bounds = L.latLngBounds(
          visibleReports.map((report) => [report.latitude, report.longitude])
        );
        map.fitBounds(bounds.pad(0.2), { maxZoom: 18 });
      } else {
        map.setView(MAUBAN_CENTER, DEFAULT_MAP_ZOOM);
      }
    }

    syncMarkers();
  }, [visibleReports, navigate, mapReady, focusReportId, reportLogs, archiveNow]);

  return (
    <div className="map-page-wrapper">
      <div className="map-header">
        <p className="map-page-sub">Showing drainage reports in Brgy. Soledad, Mauban, Quezon</p>
        <div className="map-filter-group" role="group" aria-label="Filter map by report status">
          <button
            type="button"
            className={`map-filter-btn ${isAllSelected ? 'active all-active' : 'inactive'}`}
            onClick={handleSelectAll}
            title="Show all status reports"
            aria-pressed={isAllSelected}
          >
            <span className="map-filter-label">All</span>
            <span className="map-filter-count">{statusCounts.all}</span>
          </button>
          {STATUS_OPTIONS.map((item) => {
            const isSelected = selectedStatuses.has(item.status);
            const count = statusCounts[item.status] || 0;
            const statusSlug = item.status.toLowerCase().replace(/\s+/g, '');
            return (
              <button
                key={item.status}
                type="button"
                className={`map-filter-btn ${isSelected ? `active status-${statusSlug}` : 'inactive'}`}
                onClick={() => handleToggleStatus(item.status)}
                title={`Toggle ${item.label} reports`}
                aria-pressed={isSelected}
              >
                <span
                  className="map-filter-dot"
                  style={{ backgroundColor: isSelected ? item.color : '#94a3b8' }}
                />
                <span className="map-filter-label">{item.label}</span>
                <span className="map-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="map-leaflet-card" style={{ position: 'relative' }}>
        {isOffline && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              backgroundColor: '#dc2626',
              color: '#ffffff',
              padding: '8px 18px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              pointerEvents: 'none',
            }}
          >
            <WifiOff size={16} />
            <span>No Internet Connection: OpenStreetMap tiles cannot be loaded.</span>
          </div>
        )}
        <div ref={mapRef} className="map-leaflet-container" />
      </div>
    </div>
  );
}
