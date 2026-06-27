import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { Search, X, Edit, ChevronLeft } from 'lucide-react';
import cloggedDrainImg from '../assets/clogged_drain.png';
import '../css/reports.css';

export default function Reports() {
  const { reports, loading, error, updateReportDetails } = useApp();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState('All');

  // Edit Modal State
  const [editingReport, setEditingReport] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [statusVal, setStatusVal] = useState('');

  const tabs = ['All', 'In Progress', 'Resolved', 'Rejected'];

  const handleOpenEdit = (report) => {
    setEditingReport(report);
    setRemarks(report.remarks || '');
    setStatusVal(report.status);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!statusVal) {
      alert('Please select a status.');
      return;
    }

    try {
      await updateReportDetails(editingReport.id, statusVal, remarks);
      setEditingReport(null);
    } catch (saveError) {
      alert(saveError.message || 'Unable to update report.');
    }
  };

  // Filter reports by tab and search query
  const filteredReports = reports.filter((report) => {
    const matchesTab = activeTab === 'All' || report.status === activeTab;
    const matchesSearch = 
      report.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                <th>ID</th>
                <th>Issue</th>
                <th>Location</th>
                <th>Status</th>
                <th>Date Submitted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.displayId}</td>
                    <td>{report.issue}</td>
                    <td>{report.location}</td>
                    <td>
                      <span className={`status-badge ${report.status.toLowerCase().replace(' ', '')}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>{report.dateSubmitted}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-delete"
                        onClick={() => handleOpenEdit(report)}
                        title="Edit report details"
                        style={{ color: 'var(--primary-dark)' }}
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
      {editingReport && (
        <div className="modal-overlay" onClick={() => setEditingReport(null)}>
          <div className="report-modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Back Button Link */}
            <button className="back-link" onClick={() => setEditingReport(null)}>
              <ChevronLeft size={20} />
              <span>Back to Reports</span>
            </button>

            {/* Content Details Grid */}
            <div className="report-modal-grid">
              
              {/* Left Column details */}
              <div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Report ID</span>
                  <span className="report-detail-value">{editingReport.displayId}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Location</span>
                  <span className="report-detail-value">{editingReport.location}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Date Submitted</span>
                  <span className="report-detail-value">{editingReport.dateSubmitted}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Submitted by</span>
                  <span className="report-detail-value">{editingReport.submittedBy || 'Anonymous'}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Contact No.</span>
                  <span className="report-detail-value">{editingReport.contactNo || 'N/A'}</span>
                </div>
                <div className="report-detail-row">
                  <span className="report-detail-label">Description</span>
                  <span className="report-detail-value" style={{ fontWeight: '400' }}>
                    {editingReport.description || 'No description provided.'}
                  </span>
                </div>
                <div className="report-detail-row" style={{ marginBottom: 0 }}>
                  <span className="report-detail-label">Current Status</span>
                  <span className={`report-detail-value status-${editingReport.status.toLowerCase().replace(' ', '')}`}>
                    {editingReport.status}
                  </span>
                </div>
              </div>

              {/* Right Column image mockup */}
              <div className="report-image-container">
                <img 
                  src={editingReport.imageUrl || cloggedDrainImg} 
                  alt="Clogged drainage documentation" 
                  className="report-image" 
                />
              </div>

            </div>

            {/* Bottom edit inputs form */}
            <form onSubmit={handleSave}>
              <div className="report-edit-controls">
                
                {/* Remarks field */}
                <div>
                  <label className="form-label" style={{ fontWeight: '600' }}>Remarks (Optional)</label>
                  <textarea
                    placeholder="Enter remarks..."
                    className="remarks-input-box"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>

                {/* Dropdown status selection */}
                <div>
                  <label className="form-label" style={{ fontWeight: '600' }}>Update Status To</label>
                  <select
                    className="status-select-box"
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                  >
                    <option value="">Select status</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="notif-btn-row" style={{ marginTop: 0, justifyContent: 'flex-start' }}>
                <button 
                  type="button" 
                  className="btn-cancel-notif" 
                  onClick={() => setEditingReport(null)}
                  style={{ padding: '12px 42px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-send-notif" 
                  style={{ padding: '12px 42px' }}
                >
                  Update Status
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
