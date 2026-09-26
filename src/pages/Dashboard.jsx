import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { ChevronRight, CircleDot, ShieldCheck, UserCog, Users, WifiOff } from 'lucide-react';
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
  if (value === 'all') return 'All Time';
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

  const sortedMonths = options
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: formatMonthLabel(value) }));

  return [
    { value: 'all', label: 'All Time' },
    ...sortedMonths,
  ];
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
  const reportDates = reports.map(reportCreatedDate).filter(Boolean);
  const today = new Date();
  const minDate = reportDates.length > 0
    ? new Date(Math.min(...reportDates.map((date) => date.getTime())))
    : today;
  const maxDate = reportDates.length > 0
    ? new Date(Math.max(today.getTime(), ...reportDates.map((date) => date.getTime())))
    : today;

  if (selectedMonth === 'all') {
    // Check if reports span within a single month
    const isSingleMonth =
      minDate.getFullYear() === maxDate.getFullYear() &&
      minDate.getMonth() === maxDate.getMonth();

    if (isSingleMonth) {
      // If all reports occurred in the same month, show daily intervals so daily trend is visible and matches month filter!
      const year = minDate.getFullYear();
      const month = minDate.getMonth() + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      const intervals = Array.from({ length: daysInMonth }, (_, index) => {
        const date = new Date(year, month - 1, index + 1);
        return {
          key: dayKey(date),
          label: String(index + 1),
          fullLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };
      });

      const counts = Object.fromEntries(
        STATUS_LINE_SERIES.map((series) => [
          series.status,
          Object.fromEntries(intervals.map((day) => [day.key, 0])),
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

      const rawMax = Math.max(
        0,
        ...STATUS_LINE_SERIES.flatMap((series) =>
          intervals.map((day) => counts[series.status][day.key])
        )
      );
      const maxValue = Math.max(4, rawMax <= 5 ? rawMax + 1 : Math.ceil(rawMax * 1.15));

      return {
        intervals,
        counts,
        maxValue,
        xAxisTitle: `Date (${minDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`,
        subtitle: 'Daily by status (All Time)',
      };
    }

    // Multi-month: start from minDate's month to maxDate's month (no empty padding from January!)
    const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

    const intervals = [];
    while (cursor <= endMonth) {
      const key = monthKey(cursor);
      intervals.push({
        key,
        label: cursor.toLocaleDateString('en-US', {
          month: 'short',
          year: minDate.getFullYear() !== maxDate.getFullYear() ? '2-digit' : undefined,
        }),
        fullLabel: cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const counts = Object.fromEntries(
      STATUS_LINE_SERIES.map((series) => [
        series.status,
        Object.fromEntries(intervals.map((item) => [item.key, 0])),
      ])
    );

    reports.forEach((report) => {
      if (!counts[report.status]) return;
      const createdAt = reportCreatedDate(report);
      if (!createdAt) return;
      const mKey = monthKey(createdAt);
      if (counts[report.status][mKey] !== undefined) {
        counts[report.status][mKey] += 1;
      }
    });

    const rawMax = Math.max(
      0,
      ...STATUS_LINE_SERIES.flatMap((series) =>
        intervals.map((item) => counts[series.status][item.key])
      )
    );
    const maxValue = Math.max(4, rawMax <= 5 ? rawMax + 1 : Math.ceil(rawMax * 1.15));

    return {
      intervals,
      counts,
      maxValue,
      xAxisTitle: 'Month',
      subtitle: 'Monthly by status (All Time)',
    };
  }

  // Monthly view: daily intervals
  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const intervals = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);
    return {
      key: dayKey(date),
      label: String(index + 1),
      fullLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
  });

  const counts = Object.fromEntries(
    STATUS_LINE_SERIES.map((series) => [
      series.status,
      Object.fromEntries(intervals.map((day) => [day.key, 0])),
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

  const rawMax = Math.max(
    0,
    ...STATUS_LINE_SERIES.flatMap((series) =>
      intervals.map((day) => counts[series.status][day.key])
    )
  );
  const maxValue = Math.max(4, rawMax <= 5 ? rawMax + 1 : Math.ceil(rawMax * 1.15));

  return {
    intervals,
    counts,
    maxValue,
    xAxisTitle: 'Date',
    subtitle: 'Daily by status',
  };
}

function StatusLineChart({ reports, selectedMonth, onSelectMonth, monthOptions }) {
  const { intervals, counts, maxValue, xAxisTitle, subtitle } = useMemo(
    () => buildStatusTrendData(reports, selectedMonth),
    [reports, selectedMonth]
  );
  const [hoverIndex, setHoverIndex] = useState(null);

  const width = 1180;
  const height = 310;
  const padding = { top: 24, right: 28, bottom: 58, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const yTicks = buildYAxisTicks(maxValue);

  const getX = (index) =>
    padding.left + (intervals.length === 1 ? chartWidth / 2 : (chartWidth / (intervals.length - 1)) * index);
  const getY = (value) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;

  const handleMouseMove = (e) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * width;
    if (mouseX < padding.left || mouseX > width - padding.right || intervals.length <= 1) {
      return;
    }
    const ratio = (mouseX - padding.left) / chartWidth;
    const rawIndex = Math.round(ratio * (intervals.length - 1));
    const clampedIndex = Math.max(0, Math.min(intervals.length - 1, rawIndex));
    setHoverIndex(clampedIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="status-line-card card">
      <div className="section-header">
        <h2>Report Status Trend</h2>
        <div className="status-line-controls">
          <span className="status-line-subtitle">{subtitle}</span>
          <select
            className="status-line-select"
            value={selectedMonth}
            onChange={(event) => onSelectMonth(event.target.value)}
            aria-label="Select trend period"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="status-line-chart-wrap" style={{ position: 'relative' }}>
        <svg
          className="status-line-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Line graph showing report status counts for ${formatMonthLabel(selectedMonth)}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair' }}
        >
          <text
            x={padding.left + chartWidth / 2}
            y={height - 12}
            className="status-line-axis-title"
            textAnchor="middle"
          >
            {xAxisTitle}
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

          {intervals.map((item, index) => (
            <text
              key={item.key}
              x={getX(index)}
              y={height - 32}
              className="status-line-day-label"
              textAnchor="middle"
              style={{ fontWeight: hoverIndex === index ? '800' : '600' }}
            >
              {item.label}
            </text>
          ))}

          {/* Vertical cursor guide line when hovering */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              x2={getX(hoverIndex)}
              y1={padding.top}
              y2={padding.top + chartHeight}
              stroke="#64748b"
              strokeDasharray="4 3"
              strokeWidth="1.5"
              pointerEvents="none"
            />
          )}

          {/* Status Lines & Dots */}
          {STATUS_LINE_SERIES.map((series, sIndex) => {
            const points = intervals.map((item, index) => ({
              x: getX(index),
              y: getY(counts[series.status][item.key]),
              value: counts[series.status][item.key],
              item,
            }));
            const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

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
                {points.map((p, pIndex) => {
                  const isHovered = hoverIndex === pIndex;
                  if (p.value === 0 && !isHovered) return null;
                  // If multiple statuses have the same non-zero value, apply a slight horizontal offset so dots don't completely cover each other
                  const offset = p.value > 0 ? (sIndex - 1.5) * 4 : 0;
                  return (
                    <circle
                      key={`${series.status}-${p.item.key}`}
                      cx={p.x + offset}
                      cy={p.y}
                      r={isHovered ? 5.5 : 4}
                      fill={series.color}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      pointerEvents="none"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Interactive Tooltip Card */}
          {hoverIndex !== null && (
            <g
              transform={`translate(${Math.min(width - 180, Math.max(padding.left, getX(hoverIndex) - 75))}, ${padding.top + 8})`}
              pointerEvents="none"
            >
              <rect
                width="156"
                height="104"
                rx="10"
                fill="#0f172a"
                fillOpacity="0.94"
                stroke="#334155"
                strokeWidth="1"
              />
              <text x="12" y="20" fill="#f8fafc" fontSize="11" fontWeight="700">
                {intervals[hoverIndex].fullLabel || intervals[hoverIndex].label}
              </text>
              {STATUS_LINE_SERIES.map((series, sIdx) => {
                const val = counts[series.status][intervals[hoverIndex].key] || 0;
                return (
                  <g key={series.status} transform={`translate(12, ${37 + sIdx * 15})`}>
                    <circle cx="4" cy="0" r="3.5" fill={series.color} />
                    <text x="14" y="3.5" fill="#cbd5e1" fontSize="10.5" fontWeight="500">
                      {series.label}:
                    </text>
                    <text x="132" y="3.5" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="end">
                      {val}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
        minZoom: MIN_MAP_ZOOM,
        maxZoom: MAX_MAP_ZOOM,
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '180px' }}>
      {isOffline && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '600',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <WifiOff size={14} />
          <span>No Internet Connection</span>
        </div>
      )}
      <div ref={mapRef} className="dashboard-mini-map" />
    </div>
  );
}

export default function Dashboard() {
  const { reports, reportLogs, residents, session, loading, error } = useApp();
  const [archiveNow, setArchiveNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setArchiveNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Shared Month Filter State
  const monthOptions = useMemo(() => buildMonthOptions(reports), [reports]);
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));

  // Filter reports for status pie chart based on selectedMonth
  const filteredStatusReports = useMemo(() => {
    if (selectedMonth === 'all') {
      return reports;
    }
    return reports.filter((report) => {
      const createdAt = reportCreatedDate(report);
      if (!createdAt) return false;
      return monthKey(createdAt) === selectedMonth;
    });
  }, [reports, selectedMonth]);

  // Overall statistics for top summary cards
  const totalReports = reports.length;
  const pendingCount = reports.filter(r => r.status === 'Pending').length;
  const inProgressCount = reports.filter(r => r.status === 'In Progress').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
  const rejectedCount = reports.filter(r => r.status === 'Rejected').length;

  // Pie chart calculation based on synchronized selectedMonth filter
  const piePendingCount = filteredStatusReports.filter(r => r.status === 'Pending').length;
  const pieInProgressCount = filteredStatusReports.filter(r => r.status === 'In Progress').length;
  const pieResolvedCount = filteredStatusReports.filter(r => r.status === 'Resolved').length;
  const pieRejectedCount = filteredStatusReports.filter(r => r.status === 'Rejected').length;

  const totalForPie = piePendingCount + pieInProgressCount + pieResolvedCount + pieRejectedCount;
  const pctPending = totalForPie > 0 ? Math.round((piePendingCount / totalForPie) * 100) : 0;
  const pctInProgress = totalForPie > 0 ? Math.round((pieInProgressCount / totalForPie) * 100) : 0;
  const pctResolved = totalForPie > 0 ? Math.round((pieResolvedCount / totalForPie) * 100) : 0;
  const pctRejected = totalForPie > 0 ? Math.max(0, 100 - pctPending - pctInProgress - pctResolved) : 0;

  const conicGradient = totalForPie === 0
    ? 'conic-gradient(#e2e8f0 0% 100%)'
    : `conic-gradient(
        #FFC107 0% ${pctPending}%,
        #3B82F6 ${pctPending}% ${pctPending + pctInProgress}%,
        #22C55E ${pctPending + pctInProgress}% ${pctPending + pctInProgress + pctResolved}%,
        #EF4444 ${pctPending + pctInProgress + pctResolved}% 100%
      )`;

  const statusChartItems = [
    { label: 'Pending', count: piePendingCount, pct: pctPending, color: '#FFC107' },
    { label: 'In Progress', count: pieInProgressCount, pct: pctInProgress, color: '#3B82F6' },
    { label: 'Resolved', count: pieResolvedCount, pct: pctResolved, color: '#22C55E' },
    { label: 'Rejected', count: pieRejectedCount, pct: pctRejected, color: '#EF4444' }
  ];

  const pieChartTitle = selectedMonth === 'all'
    ? 'Recent by Status (All Time)'
    : `Recent by Status (${formatMonthLabel(selectedMonth)})`;

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
      <div className="card table-card" style={{ marginBottom: '24px' }}>
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
                <th style={{ width: '25%' }}>Title</th>
                <th style={{ width: '27%' }}>Location</th>
                <th style={{ width: '16%' }}>Reporter</th>
                <th style={{ width: '10%' }}>Priority</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '12%' }}>Date Submitted</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <tr key={report.id} className="dashboard-report-row">
                    <td className="col-title">
                      <span className="mobile-card-title">{report.issue}</span>
                    </td>
                    <td className="col-location">
                      <span className="mobile-loc-text">
                        <span className="mobile-only-icon">📍 </span>
                        {report.location}
                      </span>
                    </td>
                    <td className="col-reporter">
                      <span className="mobile-meta-item">
                        <span className="mobile-only-icon">👤 </span>
                        {report.submittedBy || 'Anonymous'}
                      </span>
                    </td>
                    <td className="col-priority">
                      {report.priority ? (
                        <span className={`priority-badge priority-${report.priority.toLowerCase()}`}>
                          {report.priority}
                        </span>
                      ) : (
                        <span className="mobile-empty-dash">—</span>
                      )}
                    </td>
                    <td className="col-status">
                      <span className={`status-badge ${report.statusClass}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="col-date">
                      <span className="mobile-meta-item">
                        <span className="mobile-only-icon">📅 </span>
                        {report.dateSubmitted}
                      </span>
                    </td>
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

      <StatusLineChart
        reports={reports}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        monthOptions={monthOptions}
      />

      {/* Bottom Row: Pie Chart | Reports by Location | System Info */}
      <div className="dashboard-bottom-grid">
        {/* Status Pie Chart */}
        <div className="card bottom-card">
          <div className="section-header">
            <h2>{pieChartTitle}</h2>
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
                <span className="legend-value">{piePendingCount} ({pctPending}%)</span>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color inprogress" />
                  <span>In Progress</span>
                </div>
                <span className="legend-value">{pieInProgressCount} ({pctInProgress}%)</span>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color resolved" />
                  <span>Resolved</span>
                </div>
                <span className="legend-value">{pieResolvedCount} ({pctResolved}%)</span>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color rejected" />
                  <span>Rejected</span>
                </div>
                <span className="legend-value">{pieRejectedCount} ({pctRejected}%)</span>
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
