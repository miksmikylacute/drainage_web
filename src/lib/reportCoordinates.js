export function formatReportCoordinates(report) {
  if (!Number.isFinite(report?.latitude) || !Number.isFinite(report?.longitude)) {
    return 'Coordinates unavailable';
  }

  return `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`;
}
