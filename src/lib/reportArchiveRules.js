const ARCHIVE_STATUSES = new Set(['Resolved', 'Rejected']);
const ARCHIVE_DELAY_MS = 24 * 60 * 60 * 1000;

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isArchiveStatus(status) {
  return ARCHIVE_STATUSES.has(status);
}

export function getReportArchiveEligibleAt(report, reportLogs = []) {
  if (!isArchiveStatus(report?.status)) return null;

  const statusLog = reportLogs
    .filter((log) => log.reportId === report.id && log.newStatus === report.status)
    .map((log) => toValidDate(log.createdAt))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const statusMarkedAt = statusLog
    || toValidDate(report.updatedAt)
    || toValidDate(report.createdAt);

  if (!statusMarkedAt) return null;
  return new Date(statusMarkedAt.getTime() + ARCHIVE_DELAY_MS);
}

export function isReportArchived(report, reportLogs = [], now = new Date()) {
  const archiveEligibleAt = getReportArchiveEligibleAt(report, reportLogs);
  return Boolean(archiveEligibleAt && now.getTime() >= archiveEligibleAt.getTime());
}

export function isReportActiveForReportsPage(report, reportLogs = [], now = new Date()) {
  return !isReportArchived(report, reportLogs, now);
}
