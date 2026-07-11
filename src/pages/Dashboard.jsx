import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { ChevronRight, CircleDot, ShieldCheck, UserCog, Users } from 'lucide-react';
import {
  buildReportMarkerSvg,
  getReportStatusColor,
  hasReportCoordinates,
  MAUBAN_BOUNDS,
  MAUBAN_CENTER,
  REPORT_STATUS_LEGEND,
} from '../lib/reportMapMarkers';
import '../css/dashboard.css';

function DashboardMiniMap({ reports }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
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
        zoomControl: false,
        attributionControl: false,
      });

      leafletMapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 0);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);
    }

    initMap();

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    async function syncMarkers() {
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current;
      if (!map || !mapReady) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const geoReports = reports.filter(hasReportCoordinates);

      geoReports.forEach((report) => {
        const icon = L.divIcon({
          html: buildReportMarkerSvg(getReportStatusColor(report.status), 'small'),
          className: 'map-custom-icon',
          iconSize: [24, 32],
          iconAnchor: [12, 32],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([report.latitude, report.longitude], { icon }).addTo(map);
        marker.bindTooltip(report.issue || 'Drainage Issue');
        markersRef.current.push(marker);
      });

      if (geoReports.length > 0) {
        const bounds = L.latLngBounds(
          geoReports.map((report) => [report.latitude, report.longitude])
        );
        map.fitBounds(bounds.pad(0.25), { maxZoom: 16 });
      } else {
        map.setView(MAUBAN_CENTER, 13);
      }
    }

    syncMarkers();
  }, [reports, mapReady]);

  return <div ref={mapRef} className="dashboard-mini-map" />;
}

export default function Dashboard() {
  const { reports, residents, session, loading, error } = useApp();

  // Calculate statistics dynamically
  const totalReports = reports.length;
  const pendingCount = reports.filter(r => r.status === 'Pending').length;
  const inProgressCount = reports.filter(r => r.status === 'In Progress').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
  const rejectedCount = reports.filter(r => r.status === 'Rejected').length;

  // Pie chart calculation
  const totalForPie = pendingCount + inProgressCount + resolvedCount + rejectedCount || 1;
  const pctPending = Math.round((pendingCount / totalForPie) * 100);
  const pctInProgress = Math.round((inProgressCount / totalForPie) * 100);
  const pctResolved = Math.round((resolvedCount / totalForPie) * 100);
  const pctRejected = 100 - pctPending - pctInProgress - pctResolved;

  const conicGradient = `conic-gradient(
    #ef4444 0% ${pctPending}%,
    #2563eb ${pctPending}% ${pctPending + pctInProgress}%,
    #10b981 ${pctPending + pctInProgress}% ${pctPending + pctInProgress + pctResolved}%,
    #8b5cf6 ${pctPending + pctInProgress + pctResolved}% 100%
  )`;

  const statusChartItems = [
    { label: 'Pending', count: pendingCount, pct: pctPending, color: '#ef4444' },
    { label: 'In Progress', count: inProgressCount, pct: pctInProgress, color: '#2563eb' },
    { label: 'Resolved', count: resolvedCount, pct: pctResolved, color: '#10b981' },
    { label: 'Rejected', count: rejectedCount, pct: pctRejected, color: '#8b5cf6' }
  ];

  // Limit recent reports table to latest 3 reports
  const recentReports = reports.slice(0, 3);
  const residentUsers = residents.filter((user) => user.role === 'resident');
  const adminUsers = residents.filter((user) => user.role === 'admin');
  const superAdminUsers = residents.filter((user) => user.role === 'super_admin');
  const totalUsers = residents.length;
  const isSuperAdmin = session?.user?.role === 'super_admin';

  if (loading) {
    return <div className="card" style={{ padding: '30px', color: '#64748b' }}>Loading dashboard data...</div>;
  }

  return (
    <div>
      {error && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card-wrapper">
          <div className="card stat-card total">
            <span className="stat-title">Total Reports</span>
            <span className="stat-value">{totalReports}</span>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="card stat-card pending">
            <span className="stat-title">Pending</span>
            <span className="stat-value">{pendingCount}</span>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="card stat-card inprogress">
            <span className="stat-title">In Progress</span>
            <span className="stat-value">{inProgressCount}</span>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="card stat-card resolved">
            <span className="stat-title">Resolved</span>
            <span className="stat-value">{resolvedCount}</span>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="card stat-card rejected">
            <span className="stat-title">Rejected</span>
            <span className="stat-value">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Recent Reports Table - Full Width */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="section-header">
          <h2>Recent Report</h2>
          <Link to="/reports" className="view-all-link">
            View all <ChevronRight size={16} />
          </Link>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Date Submitted</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.issue}</td>
                    <td>{report.location}</td>
                    <td>{report.submittedBy || 'Anonymous'}</td>
                    <td>
                      <span className={`status-badge ${report.statusClass}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>{report.dateSubmitted}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No reports available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Pie Chart | Reports by Location | System Info */}
      <div className="dashboard-bottom-grid">
        {/* Status Pie Chart */}
        <div className="card bottom-card">
          <div className="section-header">
            <h2>Recent by Status (All Time)</h2>
          </div>
          
          <div className="chart-container">
            <div className="pie-chart-wrapper">
              <div 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '50%', 
                  background: conicGradient,
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.1)'
                }} 
              />
            </div>

            <div className="pie-legend">
              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color" style={{ backgroundColor: '#ef4444' }} />
                  <span>Pending</span>
                </div>
                <span className="legend-value">{pendingCount} ({pctPending}%)</span>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color inprogress" />
                  <span>In Progress</span>
                </div>
                <span className="legend-value">{inProgressCount} ({pctInProgress}%)</span>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color resolved" />
                  <span>Resolved</span>
                </div>
                <span className="legend-value">{resolvedCount} ({pctResolved}%)</span>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color rejected" />
                  <span>Rejected</span>
                </div>
                <span className="legend-value">{rejectedCount} ({pctRejected}%)</span>
              </div>
            </div>
          </div>

          <div className="status-bars" aria-label="Report status bar chart">
            {statusChartItems.map((item) => (
              <div key={item.label} className="status-bar-row">
                <div className="status-bar-meta">
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
                <div className="status-bar-track">
                  <div
                    className="status-bar-fill"
                    style={{
                      width: `${Math.max(item.pct, item.count > 0 ? 5 : 0)}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reports by Location */}
        <div className="card bottom-card">
          <div className="section-header">
            <h2>Reports by Location</h2>
            <Link to="/map" className="view-all-link">
              View all <ChevronRight size={16} />
            </Link>
          </div>
          <Link to="/map" className="map-preview" aria-label="Open reports map">
            <DashboardMiniMap reports={reports} />
          </Link>
          <div className="dashboard-map-legend" aria-label="Report status legend">
            {REPORT_STATUS_LEGEND.map((item) => (
              <span key={item.status} className="dashboard-map-legend-item">
                <span className="dashboard-map-legend-dot" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* System Information */}
        <div className="card bottom-card system-info-card">
          <div className="section-header">
            <h2>System Information</h2>
          </div>
          <div className="system-info-content">
            <div className="system-info-item">
              <div className="system-info-icon users-icon">
                <Users size={20} />
              </div>
              <span className="system-info-label">Residents</span>
              <span className="system-info-value">{residentUsers.length}</span>
            </div>
            <div className="system-info-item">
              <div className="system-info-dot">
                <CircleDot size={18} color="#10b981" />
              </div>
              <span className="system-info-label">Reports with pins</span>
              <span className="system-info-value">
                {reports.filter((report) => report.latitude != null && report.longitude != null).length}
              </span>
            </div>
            {isSuperAdmin && (
              <>
                <div className="system-info-item">
                  <div className="system-info-icon admins-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="system-info-label">Admins</span>
                  <span className="system-info-value">{adminUsers.length}</span>
                </div>
                <div className="system-info-item">
                  <div className="system-info-icon super-admins-icon">
                    <UserCog size={20} />
                  </div>
                  <span className="system-info-label">Super Admin</span>
                  <span className="system-info-value">{superAdminUsers.length}</span>
                </div>
                <div className="super-admin-actions">
                  <Link to="/residents" className="super-admin-action">
                    Manage Accounts <ChevronRight size={16} />
                  </Link>
                  <Link to="/notifications" className="super-admin-action">
                    Send Notice <ChevronRight size={16} />
                  </Link>
                </div>
              </>
            )}
            {!isSuperAdmin && (
              <div className="system-info-item">
                <div className="system-info-icon users-icon">
                  <Users size={20} />
                </div>
                <span className="system-info-label">Total Users</span>
                <span className="system-info-value">{totalUsers}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
