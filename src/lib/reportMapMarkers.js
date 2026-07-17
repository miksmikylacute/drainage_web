export const MAUBAN_CENTER = [14.1927, 121.7305];

export const MAUBAN_BOUNDS = [
  [14.0900, 121.6400],
  [14.3200, 121.8400],
];

export const REPORT_STATUS_COLORS = {
  Pending: '#FFC107',
  'In Progress': '#3B82F6',
  Resolved: '#22C55E',
  Rejected: '#EF4444',
};

export const REPORT_STATUS_LEGEND = [
  { status: 'Pending', label: 'Pending', color: REPORT_STATUS_COLORS.Pending },
  { status: 'In Progress', label: 'In Progress', color: REPORT_STATUS_COLORS['In Progress'] },
  { status: 'Resolved', label: 'Resolved', color: REPORT_STATUS_COLORS.Resolved },
  { status: 'Rejected', label: 'Rejected', color: REPORT_STATUS_COLORS.Rejected },
];

export function getReportStatusColor(status) {
  return REPORT_STATUS_COLORS[status] || '#6b7280';
}

export function hasReportCoordinates(report) {
  return Number.isFinite(report.latitude) && Number.isFinite(report.longitude);
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
