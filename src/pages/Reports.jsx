import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { Search, X, Edit, ChevronLeft, Trash2 } from 'lucide-react';
import cloggedDrainImg from '../assets/clogged_drain.png';
import '../css/reports.css';

export default function Reports() {
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
  const [activeTab, setActiveTab] = useState('All');

  // Edit Modal State
  const [editingReport, setEditingReport] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [statusVal, setStatusVal] = useState('');
  const [showRemarksPopup, setShowRemarksPopup] = useState(false);
  const [showImagePopup, setShowImagePopup] = useState(false);

  const tabs = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
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

  const handleAddRemark = async () => {
    if (!currentEditingReport) return;

    try {
      await addReportRemark(currentEditingReport.id, remarks);
      setRemarks('');
    } catch (remarkError) {
      alert(remarkError.message || 'Unable to save remark.');
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

  // Filter reports by tab and search query
  const filteredReports = reports.filter((report) => {
    const matchesTab = activeTab === 'All' || report.status === activeTab;
    const matchesSearch = 
      report.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.displayId.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  return (
    <div>
      {loading && (
        <div className="card" style={{ padding: '30px', marginBottom: '20px', color: '#64748b' }}>
          Loading reports...
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* Filter Tabs + Search on the same row */}
      <div className="controls-row" style={{ marginBottom: '24px' }}>
        <div className="filter-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`filter-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search report..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span className="clear-search-icon" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </span>
          )}
        </div>
      </div>

      {/* Reports Table Container */}
      <div className="card" style={{ padding: '8px 24px 24px' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Date Submitted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
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
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-delete"
                        onClick={() => handleOpenEdit(report)}
                        title="Edit report details"
                        style={{ color: '#000000' }}
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No reports match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Details Popup Modal */}
      {currentEditingReport && (
        <div className="modal-overlay report-modal-overlay" onClick={() => setEditingReport(null)}>
          <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Back Button Link */}
            <button className="back-link" onClick={() => setEditingReport(null)}>
              <ChevronLeft size={20} />
              <span>Back to Reports</span>
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
                  {currentEditingReport.latitude && currentEditingReport.longitude ? (
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
                <div className="report-panel-title">Report Photo</div>
                <button
                  type="button"
                  className="report-image-container report-image-button"
                  onClick={() => setShowImagePopup(true)}
                  title="View full image"
                >
                  <img 
                    src={currentEditingReport.imageUrl || cloggedDrainImg} 
                    alt="Clogged drainage documentation" 
                    className="report-image" 
                  />
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

            {/* Bottom edit inputs form */}
            <form className="report-action-form" onSubmit={handleSave}>
              <div className="report-edit-controls">
                
                {/* Remarks field */}
                <div className="report-form-field">
                  <div className="remarks-header-row">
                    <label className="form-label" style={{ fontWeight: '600' }}>Admin Remark</label>
                    <button
                      type="button"
                      className="btn-show-remarks"
                      onClick={() => setShowRemarksPopup(true)}
                    >
                      Show all remarks ({currentReportRemarks.length})
                    </button>
                  </div>
                  <textarea
                    placeholder="Enter admin note..."
                    className="remarks-input-box"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-save-remark"
                    onClick={handleAddRemark}
                    disabled={!remarks.trim()}
                  >
                    Save Remark
                  </button>
                </div>

                {/* Dropdown status selection */}
                <div className="report-form-field">
                  <label className="form-label" style={{ fontWeight: '600' }}>Update Status To</label>
                  <select
                    className="status-select-box"
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                  >
                    <option value="">Select status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

              </div>

              {/* Submit Buttons */}
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
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-send-notif" 
                >
                  Update Status
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
                  <img
                    src={currentEditingReport.imageUrl || cloggedDrainImg}
                    alt="Full report documentation"
                    className="image-popup-img"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
