const fs = require('fs');
const reportsPath = 'c:/drainage/drainage-admin-react/src/pages/Reports.jsx';
let content = fs.readFileSync(reportsPath, 'utf8');

content = content.replace(
  "import { Search, X, Edit, ChevronLeft, Trash2 } from 'lucide-react';",
  "import { Search, X, Edit, ChevronLeft, Trash2, Eye, Filter, Calendar, ChevronRight, MoreVertical } from 'lucide-react';"
);

const stateStart = "const [activeTab, setActiveTab] = useState('All');";
const newStates = `const [activeTab, setActiveTab] = useState('All');

  // New Filters
  const [monthFilter, setMonthFilter] = useState('All Months');
  const [yearFilter, setYearFilter] = useState('All Years');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;`;
content = content.replace(stateStart, newStates);

const filterStart = `  // Filter reports by tab and search query
  const filteredReports = reports.filter((report) => {
    const matchesTab = activeTab === 'All' || report.status === activeTab;
    const matchesSearch = 
      report.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.displayId.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });`;

const newFilter = `  // Filter reports by tab, search query, month, and year
  const filteredReports = reports.filter((report) => {
    const matchesTab = activeTab === 'All' || report.status === activeTab;
    const matchesSearch = 
      report.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.submittedBy && report.submittedBy.toLowerCase().includes(searchQuery.toLowerCase())) ||
      report.displayId.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesMonth = true;
    let matchesYear = true;

    if (report.dateSubmitted) {
      if (monthFilter !== 'All Months') {
        const shortMonth = monthFilter.substring(0, 3);
        matchesMonth = report.dateSubmitted.includes(shortMonth) || report.dateSubmitted.includes(monthFilter);
      }
      if (yearFilter !== 'All Years') {
        matchesYear = report.dateSubmitted.includes(yearFilter);
      }
    }

    return matchesTab && matchesSearch && matchesMonth && matchesYear;
  });

  const handleClearFilters = () => {
    setSearchQuery('');
    setMonthFilter('All Months');
    setYearFilter('All Years');
    setActiveTab('All');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusCount = (status) => {
    if (status === 'All') return reports.length;
    return reports.filter(r => r.status === status).length;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };`;
content = content.replace(filterStart, newFilter);

const returnIndex = content.indexOf('  return (\n    <div>');
const newReturn = `  return (
    <div className="reports-page-container">
      <div className="reports-page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">View and manage all submitted reports</p>
        </div>
      </div>

      {loading && (
        <div className="card loading-card">
          Loading reports...
        </div>
      )}

      {error && (
        <div className="card error-card">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={\`filter-tab \${activeTab === tab ? 'active' : ''} tab-\${tab.toLowerCase().replace(/\\s+/g, '')}\`}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
          >
            {tab} <span className="tab-badge">{getStatusCount(tab)}</span>
          </button>
        ))}
      </div>

      {/* Controls Row: Search and Filters */}
      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search report title or location..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
          {searchQuery && (
            <span className="clear-search-icon" onClick={() => { setSearchQuery(''); setCurrentPage(1); }}>
              <X size={16} />
            </span>
          )}
        </div>

        <div className="filter-dropdowns">
          <div className="dropdown-wrapper">
            <label>Month</label>
            <div className="select-container">
              <Calendar className="select-icon" size={16} />
              <select 
                value={monthFilter} 
                onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1); }}
                className="filter-select"
              >
                <option value="All Months">All Months</option>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dropdown-wrapper">
            <label>Year</label>
            <div className="select-container">
              <Calendar className="select-icon" size={16} />
              <select 
                value={yearFilter} 
                onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }}
                className="filter-select"
              >
                <option value="All Years">All Years</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>
          </div>

          <button className="btn-clear-filters" onClick={handleClearFilters}>
            <Filter size={16} /> Clear Filters
          </button>
        </div>
      </div>

      {/* Reports Table Container */}
      <div className="card table-card">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th style={{ minWidth: '250px' }}>Report Image & Title</th>
                <th style={{ minWidth: '200px' }}>Location</th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Date Submitted</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length > 0 ? (
                paginatedReports.map((report, index) => (
                  <tr key={report.id}>
                    <td className="row-number">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>
                      <div className="report-title-cell">
                        <img 
                          src={report.imageUrl || cloggedDrainImg} 
                          alt="Report" 
                          className="table-report-img"
                          onClick={() => {
                            setEditingReport(report);
                            setShowImagePopup(true);
                          }}
                        />
                        <div className="report-title-text">
                          <span className="issue-title">{report.issue}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="location-cell">
                        <span className="location-text">{report.location}</span>
                      </div>
                    </td>
                    <td>
                      <div className="reporter-cell">
                        {report.submittedBy || 'Anonymous'}
                      </div>
                    </td>
                    <td>
                      <span className={\`status-badge \${report.statusClass}\`}>
                        {report.status}
                      </span>
                    </td>
                    <td>{report.dateSubmitted}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button
                          className="btn-action view-btn"
                          onClick={() => handleOpenEdit(report)}
                          title="View/Edit report details"
                        >
                          <Eye size={18} />
                        </button>
                        <button className="btn-action more-btn">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No reports match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} reports
            </div>
            <div className="pagination-controls">
              <button 
                className="page-btn nav-btn" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i + 1}
                  className={\`page-btn \${currentPage === i + 1 ? 'active' : ''}\`}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              
              <button 
                className="page-btn nav-btn" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>`;

const endOfReturn = content.indexOf('      {/* Edit Details Popup Modal */}');
content = content.substring(0, returnIndex) + newReturn + "\n\n" + content.substring(endOfReturn);

fs.writeFileSync(reportsPath, content, 'utf8');
console.log('Successfully patched Reports.jsx');
