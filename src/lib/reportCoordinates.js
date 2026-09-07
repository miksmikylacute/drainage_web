export function formatReportCoordinates(reportOrLat, maybeLng) {
  let lat;
  let lng;

  if (typeof reportOrLat === 'number' || (typeof reportOrLat === 'string' && maybeLng !== undefined)) {
    lat = Number(reportOrLat);
    lng = Number(maybeLng);
  } else if (reportOrLat && typeof reportOrLat === 'object') {
    lat = Number(reportOrLat.latitude);
    lng = Number(reportOrLat.longitude);
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Coordinates unavailable';
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function cleanLocationText(locationStr) {
  if (!locationStr || typeof locationStr !== 'string') return '';
  return locationStr
    .replace(/\s*-\s*pinned location\s*\([^)]*\)/gi, '')
    .replace(/\s*pinned location\s*\([^)]*\)/gi, '')
    .replace(/\s*\([\d.\s,-]+\)/gi, '')
    .trim();
}
