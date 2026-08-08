import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { ChevronRight, CircleDot, ShieldCheck, UserCog, Users } from 'lucide-react';
import {
  buildReportMarkerSvg,
  DEFAULT_MAP_ZOOM,
  getReportStatusColor,
  isReportVisibleOnMap,
  MAUBAN_BOUNDS,
  MAUBAN_CENTER,
  REPORT_STATUS_LEGEND,
} from '../lib/reportMapMarkers';
import { isReportActiveForReportsPage } from '../lib/reportArchiveRules';
import '../css/dashboard.css';

const STATUS_LINE_SERIES = [
  { status: 'Pending', label: 'Pending', color: '#FFC107' },
  { status: 'In Progress', label: 'In Progress', color: '#3B82F6' },
  { status: 'Resolved', label: 'Resolved', color: '#22C55E' },
  { status: 'Rejected', label: 'Rejected', color: '#EF4444' },
];

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayKey(date) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonthLabel(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function reportCreatedDate(report) {
  const createdAt = report.createdAt || report.dateSubmitted;
  const date = createdAt ? new Date(createdAt) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function buildMonthOptions(reports) {
  const reportDates = reports.map(reportCreatedDate).filter(Boolean);
  const today = new Date();
  const minDate = reportDates.length > 0
    ? new Date(Math.min(...reportDates.map((date) => date.getTime())))
    : today;
  const maxDate = reportDates.length > 0
    ? new Date(Math.max(today.getTime(), ...reportDates.map((date) => date.getTime())))
    : today;
  const options = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const lastMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  while (cursor <= lastMonth) {
    options.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return options
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: formatMonthLabel(value) }));
}

function buildYAxisTicks(maxValue) {
  if (maxValue <= 10) {
    return Array.from({ length: maxValue + 1 }, (_, index) => index);
  }

  const step = Math.ceil(maxValue / 5);
  const ticks = [];
  for (let value = 0; value < maxValue; value += step) {
    ticks.push(value);
  }
  ticks.push(maxValue);
  return ticks;
}

function buildStatusTrendData(reports, selectedMonth) {
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);
    return {
      key: dayKey(date),
      label: String(index + 1),
      fullLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  const counts = Object.fromEntries(
    STATUS_LINE_SERIES.map((series) => [
      series.status,
      Object.fromEntries(days.map((day) => [day.key, 0])),
    ])
  );

  reports.forEach((report) => {
    if (!counts[report.status]) return;

    const createdAt = reportCreatedDate(report);
    if (!createdAt) return;

    const reportDayKey = dayKey(startOfLocalDay(createdAt));
    if (counts[report.status][reportDayKey] !== undefined) {
      counts[report.status][reportDayKey] += 1;
    }
  });

  const maxValue = Math.max(
    1,
    ...STATUS_LINE_SERIES.flatMap((series) =>
      days.map((day) => counts[series.status][day.key])
    )
  );

  return { days, counts, maxValue };
}

function buildSmoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const controlDistance = (point.x - previous.x) * 0.45;
    const controlStartX = previous.x + controlDistance;
    const controlEndX = point.x - controlDistance;
    return `${path} C ${controlStartX} ${previous.y}, ${controlEndX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function StatusLineChart({ reports }) {
  const monthOptions = useMemo(() => buildMonthOptions(reports), [reports]);
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const { days, counts, maxValue } = useMemo(
    () => buildStatusTrendData(reports, selectedMonth),
    [reports, selectedMonth]
  );
  const width = 1180;
  const height = 310;
  const padding = { top: 18, right: 18, bottom: 58, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const yTicks = buildYAxisTicks(maxValue);

  const getX = (index) =>
    padding.left + (days.length === 1 ? chartWidth / 2 : (chartWidth / (days.length - 1)) * index);
  const getY = (value) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;

  return (
    <div className="status-line-card card">
      <div className="section-header">
        <h2>Report Status Trend</h2>
        <div className="status-line-controls">
          <span className="status-line-subtitle">Daily by status</span>
          <select
            className="status-line-select"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            aria-label="Select trend month"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="status-line-chart-wrap">
        <svg
          className="status-line-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Line graph showing report status counts for ${formatMonthLabel(selectedMonth)}`}
        >
          <text
            x={padding.left + chartWidth / 2}
            y={height - 12}
            className="status-line-axis-title"
            textAnchor="middle"
          >
            Date
          </text>
          <text
            x={16}
            y={padding.top + chartHeight / 2}
            className="status-line-axis-title"
            textAnchor="middle"
            transform={`rotate(-90 16 ${padding.top + chartHeight / 2})`}
          >
            Reports
          </text>

          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  className="status-line-grid"
                />
                <text x={padding.left - 10} y={y + 4} className="status-line-axis-label" textAnchor="end">
                  {tick}
                </text>
              </g>
            );
          })}

          {days.map((day, index) => (
            <text
              key={day.key}
              x={getX(index)}
              y={height - 32}
              className="status-line-day-label"
              textAnchor="middle"
            >
              {day.label}
            </text>
          ))}

          {STATUS_LINE_SERIES.map((series) => {
            const points = days.map((day, index) => ({
              x: getX(index),
              y: getY(counts[series.status][day.key]),
              value: counts[series.status][day.key],
            }));
            const pathData = buildSmoothPath(points);

            return (
              <g key={series.status}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="status-line-path"
                />
                <title>{`${series.label} trend for ${formatMonthLabel(selectedMonth)}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="status-line-legend">
        {STATUS_LINE_SERIES.map((series) => (
          <span key={series.status} className="status-line-legend-item">
            <span className="status-line-legend-dot" style={{ backgroundColor: series.color }} />
            {series.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardMiniMap({ reports, reportLogs }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [archiveNow, setArchiveNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setArchiveNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
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
        zoomControl: false,
        attributionControl: false,
      });

      leafletMapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 0);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
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

      const geoReports = reports.filter((r) =>
        isReportVisibleOnMap(r, reportLogs || [], archiveNow)
      );

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
        map.setView(MAUBAN_CENTER, DEFAULT_MAP_ZOOM);
      }
    }

    syncMarkers();
  }, [reports, reportLogs, archiveNow, mapReady]);

  return <div ref={mapRef} className="dashboard-mini-map" />;
}

export default function Dashboard() {
  const { reports, reportLogs, residents, session, loading, error } = useApp();
  const [archiveNow, setArchiveNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setArchiveNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    #FFC107 0% ${pctPending}%,
    #3B82F6 ${pctPending}% ${pctPending + pctInProgress}%,
    #22C55E ${pctPending + pctInProgress}% ${pctPending + pctInProgress + pctResolved}%,
    #EF4444 ${pctPending + pctInProgress + pctResolved}% 100%
  )`;

  const statusChartItems = [
    { label: 'Pending', count: pendingCount, pct: pctPending, color: '#FFC107' },
    { label: 'In Progress', count: inProgressCount, pct: pctInProgress, color: '#3B82F6' },
    { label: 'Resolved', count: resolvedCount, pct: pctResolved, color: '#22C55E' },
    { label: 'Rejected', count: rejectedCount, pct: pctRejected, color: '#EF4444' }
  ];

  // Limit recent reports table to top 3 active reports matching Reports page sorting logic
  const recentReports = useMemo(() => {
    const active = reports.filter((report) =>
      isReportActiveForReportsPage(report, reportLogs || [], archiveNow)
    );

    active.sort((a, b) => {
      const getPriorityRank = (priority) => {
        if (!priority) return 4;
        const p = String(priority).trim().toLowerCase();
        if (p === 'high') return 1;
        if (p === 'medium') return 2;
        if (p === 'low') return 3;
        return 4;
      };

      const rankA = getPriorityRank(a.priority);
      const rankB = getPriorityRank(b.priority);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      const dateA = new Date(a.createdAt || a.dateSubmitted).getTime() || 0;
      const dateB = new Date(b.createdAt || b.dateSubmitted).getTime() || 0;
      return dateB - dateA;
    });

    return active.slice(0, 3);
  }, [archiveNow, reportLogs, reports]);
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
                <th>Priority</th>
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
                      {report.priority ? (
                        <span className={`priority-badge priority-${report.priority.toLowerCase()}`}>
                          {report.priority}
                        </span>
                      ) : (
                        ''
                      )}
                    </td>
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
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No reports available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StatusLineChart reports={reports} />

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
                  <div className="legend-color" style={{ backgroundColor: '#FFC107' }} />
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
            <DashboardMiniMap reports={reports} reportLogs={reportLogs} />
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
                <CircleDot size={18} color="#22C55E" />
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
