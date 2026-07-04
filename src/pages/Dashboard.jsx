import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { ChevronRight, Users, CircleDot } from 'lucide-react';
import '../css/dashboard.css';

export default function Dashboard() {
  const { reports, residents, loading, error } = useApp();

  // Calculate statistics dynamically
  const totalReports = reports.length;
  const inProgressCount = reports.filter(r => r.status === 'In Progress').length;
  const resolvedCount = reports.filter(r => r.status === 'Resolved').length;
  const rejectedCount = reports.filter(r => r.status === 'Rejected').length;

  // Pie chart calculation
  const totalForPie = inProgressCount + resolvedCount + rejectedCount || 1;
  const pctInProgress = Math.round((inProgressCount / totalForPie) * 100);
  const pctResolved = Math.round((resolvedCount / totalForPie) * 100);
  const pctRejected = 100 - pctInProgress - pctResolved; // ensures total is exactly 100%

  const conicGradient = `conic-gradient(
    #f59e0b 0% ${pctInProgress}%,
    #10b981 ${pctInProgress}% ${pctInProgress + pctResolved}%,
    #ef4444 ${pctInProgress + pctResolved}% 100%
  )`;

  // Limit recent reports table to latest 4 reports
  const recentReports = reports.slice(0, 4);

  // Total residents count
  const totalUsers = residents.length;

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
      <div className="card" style={{ marginBottom: '24px' }}>
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
                <th>ID</th>
                <th>Issue</th>
                <th>Location</th>
                <th>Status</th>
                <th>Date Submitted</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No reports available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row: Pie Chart | Reports by Location | System Info */}
      <div className="dashboard-bottom-grid">
        {/* Status Pie Chart */}
        <div className="card bottom-card">
          <div className="section-header">
            <h2>Recent by Status (All Time)</h2>
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
                  <div className="legend-color inprogress" />
                  <span>In Progress</span>
                </div>
                <span className="legend-value">{inProgressCount} ({pctInProgress}%)</span>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color resolved" />
                  <span>Resolved</span>
                </div>
                <span className="legend-value">{resolvedCount} ({pctResolved}%)</span>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-color rejected" />
                  <span>Rejected</span>
                </div>
                <span className="legend-value">{rejectedCount} ({pctRejected}%)</span>
              </div>
            </div>
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
          <div className="map-preview">
            <iframe
              title="Reports Location Map"
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15000!2d124.0!3d11.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sph!4v1"
              width="100%"
              height="100%"
              style={{ border: 0, borderRadius: '12px' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
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
              <span className="system-info-label">Total Users</span>
              <span className="system-info-value">{totalUsers}</span>
            </div>
            <div className="system-info-item">
              <div className="system-info-dot">
                <CircleDot size={18} color="#10b981" />
              </div>
              <span className="system-info-label">Active today</span>
              <span className="system-info-value">1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
