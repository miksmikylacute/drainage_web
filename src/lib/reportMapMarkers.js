export const SOLEDAD_CENTER = [14.1915, 121.7305];
export const MAUBAN_CENTER = SOLEDAD_CENTER;
export const DEFAULT_MAP_ZOOM = 17;
export const MIN_MAP_ZOOM = 16;
export const MAX_MAP_ZOOM = 19;

export const SOLEDAD_BOUNDS = [
  [14.1840, 121.7210],
  [14.1990, 121.7390],
];
export const MAUBAN_BOUNDS = SOLEDAD_BOUNDS;

export const REPORT_STATUS_COLORS = {
  Pending: '#ef4444',
  'In Progress': '#2563eb',
  Resolved: '#10b981',
  Rejected: '#8b5cf6',
};

export const REPORT_STATUS_LEGEND = [
  { status: 'Pending', label: 'New Report', color: REPORT_STATUS_COLORS.Pending },
  { status: 'In Progress', label: 'In Progress', color: REPORT_STATUS_COLORS['In Progress'] },
];

export function getReportStatusColor(status) {
  return REPORT_STATUS_COLORS[status] || '#6b7280';
}

export function hasReportCoordinates(report) {
  return Number.isFinite(report.latitude) && Number.isFinite(report.longitude);
}

export function isReportVisibleOnMap(report) {
  return (
    hasReportCoordinates(report) &&
    report.status !== 'Resolved' &&
    report.status !== 'Rejected'
  );
}

export function buildReportMarkerSvg(color, size = 'normal') {
  const width = size === 'small' ? 24 : 32;
  const height = size === 'small' ? 32 : 42;
  const circleX = width / 2;
  const circleY = size === 'small' ? 12 : 16;
  const circleR = size === 'small' ? 4.5 : 6;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 32 42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26S32 26.667 32 16C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="${circleX}" cy="${circleY}" r="${circleR}" fill="white" fill-opacity="0.9"/>
    </svg>`;
}
