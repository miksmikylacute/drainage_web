import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/useApp';
import {
  Search, X, Calendar, Filter, Eye, ChevronLeft, ChevronRight, Trash2, Info, ChevronDown
} from 'lucide-react';
import cloggedDrainImg from '../assets/clogged_drain.png';
import { isReportVisibleOnMap } from '../lib/reportMapMarkers';
import { isReportArchived } from '../lib/reportArchiveRules';
import { formatReportCoordinates } from '../lib/reportCoordinates';
import { isReportVideo } from '../lib/reportMedia';
import '../css/reports.css';
import '../css/archive.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATIC_YEARS = ['2026', '2027', '2028'];
const ITEMS_PER_PAGE = 10;

// Helper to format date nicely
function formatDate(value) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export default function ReportArchive() {
  const {
    reports,
    reportLogs,
    reportRemarks,
    loading,
    error,
    session,
    updateReportDetails,
    deleteReport,
    addReportRemark
  } = useApp();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const [monthFilter, setMonthFilter] = useState('All Months');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sortBy, setSortBy] = useState('Newest First');
  const [visibleCount, setVisibleCount] = useState(10);
  const [archiveNow, setArchiveNow] = useState(() => new Date());

  // Edit/View Modal State
  const [editingReport, setEditingReport] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [statusVal, setStatusVal] = useState('');
  const [showRemarksPopup, setShowRemarksPopup] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);

  const currentEditingReport = editingReport
    ? reports.find((report) => report.id === editingReport.id) || editingReport
    : null;
  const currentReportLogs = currentEditingReport
    ? reportLogs.filter((log) => log.reportId === currentEditingReport.id)
    : [];
  const currentReportRemarks = currentEditingReport
    ? reportRemarks.filter((remark) => remark.reportId === currentEditingReport.id)
    : [];
  const isSuperAdmin = session?.user?.role === 'super_admin';

  useEffect(() => {
    const timer = window.setInterval(() => setArchiveNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Derive available years
  const availableYears = useMemo(() => {
    const dbYears = new Set(
      reports
        .map((r) => {
          const d = new Date(r.createdAt || r.dateSubmitted);
          return isNaN(d) ? null : String(d.getFullYear());
        })
        .filter(Boolean)
    );
    STATIC_YEARS.forEach((y) => dbYears.add(y));
    return [...dbYears].sort();
  }, [reports]);

  // Filtering and Sorting logic
  const filteredReports = useMemo(() => {
    let result = reports.filter((report) => {
      // Search
      const q = searchQuery.toLowerCase();
      if (q) {
        const titleMatch = (report.issue || '').toLowerCase().includes(q);
        const locationMatch = (report.location || '').toLowerCase().includes(q);
        const reporterMatch = (report.submittedBy || '').toLowerCase().includes(q);
        const idMatch = (report.displayId || '').toLowerCase().includes(q);
        if (!titleMatch && !locationMatch && !reporterMatch && !idMatch) return false;
      }

      // Month
      const dateStr = report.createdAt || report.dateSubmitted;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
          if (monthFilter !== 'All Months' && MONTHS[d.getMonth()] !== monthFilter) return false;
          if (yearFilter !== 'All Years' && String(d.getFullYear()) !== yearFilter) return false;
        }
      } else {
        if (monthFilter !== 'All Months' || yearFilter !== 'All Years') return false;
      }

      // Only show Resolved and Rejected reports after the 24-hour active window.
      if (!isReportArchived(report, reportLogs, archiveNow)) return false;

      // Status
      if (statusFilter !== 'All Status' && report.status !== statusFilter) return false;

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || a.dateSubmitted).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || b.dateSubmitted).getTime();
      if (sortBy === 'Newest First') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    return result;
  }, [archiveNow, reportLogs, reports, searchQuery, monthFilter, yearFilter, statusFilter, sortBy]);

  const displayedReports = filteredReports.slice(0, visibleCount);

  const resetVisibleCount = () => setVisibleCount(10);

  const handleClearFilters = () => {
    setSearchQuery('');
    setMonthFilter('All Months');
    setYearFilter('All Years');
    setStatusFilter('All Status');
    setSortBy('Newest First');
    resetVisibleCount();
  };

  const handleOpenEdit = (report) => {
    setEditingReport(report);
    setRemarks(report.remarks || '');
    setStatusVal(report.status);
    setShowRemarksPopup(false);
    setShowImagePopup(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!statusVal) {
      alert('Please select a status.');
      return;
    }
    try {
      await updateReportDetails(editingReport.id, statusVal, null);
      if (remarks.trim()) {
        await addReportRemark(editingReport.id, remarks);
        setRemarks('');
      }
      setEditingReport(null);
    } catch (saveError) {
      alert(saveError.message || 'Unable to update report.');
    }
  };

  const handleDeleteReport = async () => {
    if (!currentEditingReport) return;
    const shouldDelete = window.confirm(
      `Delete ${currentEditingReport.displayId}? This will permanently remove the report from the database, resident mobile app, report timeline, notifications, remarks, and admin map.`
    );
    if (!shouldDelete) return;
    try {
      await deleteReport(currentEditingReport.id);
      setShowRemarksPopup(false);
      setShowImagePopup(false);
      setEditingReport(null);
    } catch (deleteError) {
      alert(deleteError.message || 'Unable to delete report.');
    }
  };

  return (
    <div className="archive-page-container">
      {loading && (
        <div className="card" style={{ padding: '30px', marginBottom: '20px', color: '#64748b' }}>
          Loading archive...
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* Filters Section */}
      <div className="archive-filters-row">
        <div className="archive-search-wrapper">
          <Search className="archive-search-icon" size={18} />
          <input
            type="text"
            placeholder="Search report title or location..."
            className="archive-search-input"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); resetVisibleCount(); }}
          />
          {searchQuery && (
            <span className="archive-clear-search" onClick={() => { setSearchQuery(''); resetVisibleCount(); }}>
              <X size={16} />
            </span>
          )}
        </div>

        <div className="archive-dropdowns">
          {/* Month */}
          <div className="archive-dropdown-group">
            <span className="archive-dropdown-label">Month</span>
            <div className="archive-select-container">
              <Calendar className="archive-select-icon" size={16} />
              <select
                value={monthFilter}
                onChange={(e) => { setMonthFilter(e.target.value); resetVisibleCount(); }}
                className="archive-select"
              >
                <option value="All Months">All Months</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="archive-select-arrow" size={14} />
            </div>
          </div>

          {/* Year */}
          <div className="archive-dropdown-group">
            <span className="archive-dropdown-label">Year</span>
            <div className="archive-select-container">
              <Calendar className="archive-select-icon" size={16} />
              <select
                value={yearFilter}
                onChange={(e) => { setYearFilter(e.target.value); resetVisibleCount(); }}
                className="archive-select"
              >
                <option value="All Years">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="archive-select-arrow" size={14} />
            </div>
          </div>

          {/* Status */}
          <div className="archive-dropdown-group">
            <span className="archive-dropdown-label">Status</span>
            <div className="archive-select-container">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); resetVisibleCount(); }}
                className="archive-select no-icon"
              >
                <option value="All Status">All Status</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <ChevronDown className="archive-select-arrow" size={14} />
            </div>
          </div>

          {/* Sort By */}
          <div className="archive-dropdown-group">
            <span className="archive-dropdown-label">Sort By</span>
            <div className="archive-select-container">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); resetVisibleCount(); }}
                className="archive-select no-icon"
              >
                <option value="Newest First">Newest First</option>
                <option value="Oldest First">Oldest First</option>
              </select>
              <ChevronDown className="archive-select-arrow" size={14} />
            </div>
          </div>

          {/* Clear Filters */}
          <button className="archive-btn-clear" onClick={handleClearFilters}>
            <Filter size={16} />
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="archive-info-banner">
        <div className="archive-info-left">
          <Info size={18} className="archive-info-icon" />
          <span>
            Showing reports for{' '}
            <strong>
              {monthFilter === 'All Months' ? '' : `${monthFilter} `}
              {yearFilter === 'All Years' ? 'All Time' : yearFilter}
            </strong>
          </span>
        </div>
        <div className="archive-info-right">
          <strong>{filteredReports.length}</strong> reports found
        </div>
      </div>

      {/* Table Card */}
      <div className="card archive-table-card">
        <div className="table-container">
          <table className="custom-table archive-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Report Details</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '180px' }}>Date Reported</th>
                <th style={{ width: '180px' }}>Last Updated</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedReports.length > 0 ? (
                displayedReports.map((report, index) => {
                  const displayIndex = index + 1;
                  return (
                    <tr key={report.id}>
                      <td className="archive-row-number">{displayIndex}</td>
                      <td>
                        <div className="archive-details-cell">
                          {isReportVideo(report.imageUrl) ? (
                            <button
                              type="button"
                              className="archive-report-thumb archive-video-thumb"
                              onClick={() => handleOpenEdit(report)}
                              aria-label="Open video report"
                            >
                              ▶
                            </button>
                          ) : (
                            <img
                              src={report.imageUrl || cloggedDrainImg}
                              alt="Report"
                              className="archive-report-thumb"
                              onClick={() => handleOpenEdit(report)}
                            />
                          )}
                          <div className="archive-details-text">
                            <span className="archive-details-title" onClick={() => handleOpenEdit(report)}>
                              {report.issue}
                            </span>
                            <div className="archive-details-loc">
                              <span className="archive-loc-pin">📍</span>
                              <span className="archive-loc-text">{report.location}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${report.statusClass}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="archive-date-cell">{report.dateSubmitted}</td>
                      <td className="archive-date-cell">
                        {report.updatedAt ? formatDate(report.updatedAt) : report.dateSubmitted}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="archive-btn-view"
                          onClick={() => handleOpenEdit(report)}
                          title="View Details"
                        >
                          <Eye size={14} className="archive-btn-view-icon" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="archive-empty-state">
                    No reports match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredReports.length > 0 && (
          <div className="archive-pagination-container">
            <div className="archive-pagination-info">
              Showing 1 to {Math.min(visibleCount, filteredReports.length)} of {filteredReports.length} reports
            </div>
            {filteredReports.length > 10 && (
              <div className="archive-pagination-controls" style={{ display: 'flex', gap: '8px' }}>
                {visibleCount < filteredReports.length && (
                  <button
                    type="button"
                    className="archive-page-btn"
                    style={{ width: 'auto', padding: '0 16px' }}
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                  >
                    Show More
                  </button>
                )}
                {visibleCount > 10 && (
                  <button
                    type="button"
                    className="archive-page-btn"
                    style={{ width: 'auto', padding: '0 16px' }}
                    onClick={() => setVisibleCount(10)}
                  >
                    Show Less
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit/View Modal Popup */}
      {currentEditingReport && (
        <div className="modal-overlay report-modal-overlay" onClick={() => setEditingReport(null)}>
          <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
            
            <button className="back-link" onClick={() => setEditingReport(null)}>
              <ChevronLeft size={20} />
              <span>Back to Archive</span>
            </button>

            <div className="report-modal-grid">
              <section className="report-detail-panel">
                <div className="report-panel-title">Report Details</div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Report ID</span>
                  <span className="report-detail-value">{currentEditingReport.displayId}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Location</span>
                  {isReportVisibleOnMap(currentEditingReport) ? (
                    <span 
                      className="report-detail-value location-link"
                      onClick={() => navigate(`/map?focus=${currentEditingReport.id}`)}
                    >
                      {currentEditingReport.location}
                    </span>
                  ) : (
                    <span className="report-detail-value">{currentEditingReport.location}</span>
                  )}
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Coordinates</span>
                  <span className="report-detail-value">{formatReportCoordinates(currentEditingReport)}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Date Submitted</span>
                  <span className="report-detail-value">{currentEditingReport.dateSubmitted}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Submitted by</span>
                  <span className="report-detail-value">{currentEditingReport.submittedBy || 'Anonymous'}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Contact No.</span>
                  <span className="report-detail-value">{currentEditingReport.contactNo || 'N/A'}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Description</span>
                  <span className="report-detail-value report-description-preview">
                    {currentEditingReport.description || 'No description provided.'}
                  </span>
                </div>
                <div className="report-detail-row" style={{ marginBottom: 0 }}>
                  <span className="report-detail-label">Current Status</span>
                  <span className={`report-detail-value status-${currentEditingReport.statusClass}`}>
                    {currentEditingReport.status}
                  </span>
                </div>
              </section>

              <section className="report-media-panel">
                <div className="report-panel-title">Report Attachment</div>
                <button
                  type="button"
                  className="report-image-container report-image-button"
                  onClick={() => setShowImagePopup(true)}
                  title="View full attachment"
                >
                  {isReportVideo(currentEditingReport.imageUrl) ? (
                    <div className="report-video-preview">
                      <span className="report-video-play">▶</span>
                      <span>Video attachment</span>
                    </div>
                  ) : (
                    <img
                      src={currentEditingReport.imageUrl || cloggedDrainImg}
                      alt="Clogged drainage documentation"
                      className="report-image"
                    />
                  )}
                </button>
              </section>
            </div>

            <div className="report-timeline-section">
              <h3>Report Timeline</h3>
              {currentReportLogs.length > 0 ? (
                <div className="report-timeline-list">
                  {currentReportLogs.map((log) => (
                    <div key={log.id} className="report-timeline-item">
                      <div className={`report-timeline-dot ${log.newStatus.toLowerCase().replace(/\s+/g, '')}`} />
                      <div className="report-timeline-content">
                        <div className="report-timeline-title">
                          {log.oldStatus ? `${log.oldStatus} to ${log.newStatus}` : log.newStatus}
                        </div>
                        <div className="report-timeline-date">{log.createdAtLabel}</div>
                        {log.remarks && (
                          <div className="report-timeline-remarks">{log.remarks}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="report-timeline-empty">No timeline updates yet.</div>
              )}
            </div>

            <form className="report-action-form" onSubmit={handleSave}>
              <div className="report-edit-controls">
                <div className="report-form-field">
                  <div className="remarks-header-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: 0 }}>Admin Remarks</label>
                    <button
                      type="button"
                      className="btn-show-remarks"
                      onClick={() => setShowRemarksPopup(true)}
                      style={{ paddingLeft: 0, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Show all remarks ({currentReportRemarks.length})
                    </button>
                  </div>
                </div>

                <div className="report-form-field">
                  <label className="form-label" style={{ fontWeight: '600' }}>Archived Status</label>
                  <select
                    className="status-select-box"
                    value={statusVal}
                    disabled
                  >
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="notif-btn-row report-modal-actions">
                {isSuperAdmin && (
                  <button
                    type="button"
                    className="btn-remove-report"
                    onClick={handleDeleteReport}
                  >
                    <Trash2 size={16} />
                    <span>Remove Report</span>
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn-cancel-notif" 
                  onClick={() => {
                    setShowRemarksPopup(false);
                    setEditingReport(null);
                  }}
                  style={{ minWidth: '100px' }}
                >
                  Close
                </button>
              </div>
            </form>
          </div>

          {showRemarksPopup && (
            <div className="remarks-popup-overlay" onClick={() => setShowRemarksPopup(false)}>
              <div className="remarks-popup-card" onClick={(e) => e.stopPropagation()}>
                <div className="remarks-popup-header">
                  <div>
                    <h3>Admin Remarks</h3>
                    <p>{currentEditingReport.displayId}</p>
                  </div>
                  <button
                    type="button"
                    className="remarks-popup-close"
                    onClick={() => setShowRemarksPopup(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                {currentReportRemarks.length > 0 ? (
                  <div className="remarks-popup-list">
                    {currentReportRemarks.map((item, index) => (
                      <div key={item.id} className="remarks-popup-item">
                        <div className="remarks-popup-number">{index + 1}</div>
                        <div className="remarks-popup-body">
                          <div className="remarks-popup-meta">
                            <span>{item.adminName}</span>
                            <span>{item.createdAtLabel}</span>
                          </div>
                          <p>{item.remark}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="remarks-popup-empty">No admin remarks yet.</div>
                )}
              </div>
            </div>
          )}

          {showImagePopup && (
            <div className="image-popup-overlay" onClick={() => setShowImagePopup(false)}>
              <div className="image-popup-card" onClick={(e) => e.stopPropagation()}>
                <div className="image-popup-header">
                  <div>
                    <h3>Report Image</h3>
                    <p>{currentEditingReport.displayId}</p>
                  </div>
                  <button
                    type="button"
                    className="image-popup-close"
                    onClick={() => setShowImagePopup(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="image-popup-body">
                  {isReportVideo(currentEditingReport.imageUrl) ? (
                    <video
                      src={currentEditingReport.imageUrl}
                      className="image-popup-img"
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={currentEditingReport.imageUrl || cloggedDrainImg}
                      alt="Full report documentation"
                      className="image-popup-img"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
