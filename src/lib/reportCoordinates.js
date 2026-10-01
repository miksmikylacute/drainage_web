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

/**
 * Disambiguates overlapping report markers so every pin remains distinct, visible, and clickable.
 * If multiple reports share identical or near-identical coordinates (< 16 meters),
 * their display pins are arranged in a neat circular fan-out.
 */
export function disambiguateReportCoordinates(reports) {
  if (!Array.isArray(reports) || reports.length <= 1) {
    return (reports || []).map((r) => ({
      report: r,
      displayLat: r.latitude,
      displayLng: r.longitude,
      isClustered: false,
    }));
  }

  const COLLISION_THRESHOLD = 0.00015; // ~16 meters
  const OFFSET_RADIUS = 0.00018; // ~20 meters fanned out

  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < reports.length; i++) {
    if (assigned.has(i)) continue;
    const r1 = reports[i];
    const cluster = [{ index: i, report: r1 }];
    assigned.add(i);

    for (let j = i + 1; j < reports.length; j++) {
      if (assigned.has(j)) continue;
      const r2 = reports[j];
      const dLat = Math.abs(r1.latitude - r2.latitude);
      const dLng = Math.abs(r1.longitude - r2.longitude);

      if (dLat <= COLLISION_THRESHOLD && dLng <= COLLISION_THRESHOLD) {
        cluster.push({ index: j, report: r2 });
        assigned.add(j);
      }
    }
    clusters.push(cluster);
  }

  const results = new Array(reports.length);

  clusters.forEach((cluster) => {
    if (cluster.length === 1) {
      const item = cluster[0];
      results[item.index] = {
        report: item.report,
        displayLat: item.report.latitude,
        displayLng: item.report.longitude,
        isClustered: false,
      };
    } else {
      const n = cluster.length;
      cluster.forEach((item, pos) => {
        const angle = (2 * Math.PI * pos) / n;
        const displayLat = item.report.latitude + Math.sin(angle) * OFFSET_RADIUS;
        const displayLng = item.report.longitude + Math.cos(angle) * OFFSET_RADIUS;

        results[item.index] = {
          report: item.report,
          displayLat,
          displayLng,
          isClustered: true,
        };
      });
    }
  });

  return results;
}
