import { useState } from 'react';
import { useApp } from '../context/useApp';
import { ChevronLeft, ChevronRight, FileText, Search, Trash2, Upload, UserPlus, X } from 'lucide-react';
import '../css/residents.css';

const ITEMS_PER_PAGE = 10;

export default function Residents() {
  const { 
    residents, 
    createUser,
    session,
    deleteUser,
    updateUserStatus,
    loading
  } = useApp();
  const isSuperAdmin = session?.user?.role === 'super_admin';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Form State
  const [role, setRole] = useState('resident');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [idCardFile, setIdCardFile] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);

  const resetForm = () => {
    setRole('resident');
    setName('');
    setContact('');
    setEmail('');
    setPassword('');
    setIdCardFile(null);
    if (idCardPreview) URL.revokeObjectURL(idCardPreview);
    setIdCardPreview(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !email.trim() || !password) {
      alert('Please fill out all fields.');
      return;
    }

    if (password && password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);

    try {
      await createUser({
        role,
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim(),
        password,
        idCardFile
      });

      resetForm();
      setIsModalOpen(false);
    } catch (saveError) {
      alert(saveError.message || 'Unable to save resident.');
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteUser = async (user) => {
    if (!isSuperAdmin || user.role === 'super_admin') return;

    const shouldDelete = window.confirm(
      `Delete ${user.name}? This will permanently remove the ${user.role} account. Resident reports and related records will be deleted by database cascade.`
    );

    if (!shouldDelete) return;

    try {
      await deleteUser(user.id);
      setSelectedUser((current) => (current?.id === user.id ? null : current));
    } catch (deleteError) {
      alert(deleteError.message || 'Unable to delete user.');
    }
  };

  const visibleUsers = residents.filter((user) => isSuperAdmin || user.role === 'resident');

  const pendingCount = visibleUsers.filter((u) => u.status === 'Pending').length;
  const activeCount = visibleUsers.filter((u) => u.status === 'Active' || !u.status).length;
  const disabledCount = visibleUsers.filter((u) => u.status === 'Disabled').length;

  const filteredUsers = visibleUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.contact.includes(searchQuery) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'Pending') {
      return user.status === 'Pending';
    }
    if (statusFilter === 'Active') {
      return user.status === 'Active' || !user.status;
    }
    if (statusFilter === 'Disabled') {
      return user.status === 'Disabled';
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const firstPageButton = Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4));
  const lastPageButton = Math.min(totalPages, firstPageButton + 4);
  const pageNumbers = Array.from(
    { length: lastPageButton - firstPageButton + 1 },
    (_, index) => firstPageButton + index
  );

  return (
    <div>


      {/* Controls Row: Left Filter Tabs | Right Search & Add Button */}
      <div className="user-controls-row">
        {/* Resident Verification Status Filter Tabs */}
        <div className="resident-filter-tabs">
          <button
            type="button"
            className={`resident-tab ${statusFilter === 'All' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('All');
              setCurrentPage(1);
            }}
          >
            <span>All Accounts</span>
            <span className="resident-tab-count">{visibleUsers.length}</span>
          </button>
          <button
            type="button"
            className={`resident-tab pending-tab ${pendingCount > 0 ? 'has-pending' : ''} ${statusFilter === 'Pending' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('Pending');
              setCurrentPage(1);
            }}
          >
            <span>Pending Approval</span>
            <span className="resident-tab-count">{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`resident-tab ${statusFilter === 'Active' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('Active');
              setCurrentPage(1);
            }}
          >
            <span>Active</span>
            <span className="resident-tab-count">{activeCount}</span>
          </button>
          <button
            type="button"
            className={`resident-tab ${statusFilter === 'Disabled' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('Disabled');
              setCurrentPage(1);
            }}
          >
            <span>Disabled</span>
            <span className="resident-tab-count">{disabledCount}</span>
          </button>
        </div>

        {/* Right Search Input & Add User Button */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <span className="clear-search-icon" onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}>
                <X size={16} />
              </span>
            )}
          </div>

          {/* Add User Button */}
          <button 
            className="btn-primary" 
            onClick={openAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', whiteSpace: 'nowrap' }}
          >
            <UserPlus size={18} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="user-management-loading">Loading users...</div>
      )}

      <div className="card" style={{ padding: '8px 24px 24px' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Number</th>
                <th>Email</th>
                <th>Valid ID</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.length > 0 ? (
                displayedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div 
                        className="user-cell" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedUser(user)}
                      >
                        <span className="user-avatar-sm">
                          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.charAt(0)}
                        </span>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#334155' }}>{user.contact || '—'}</td>
                    <td style={{ color: '#334155' }}>{user.email}</td>
                    <td>
                      {user.idCardUrl ? (
                        <button
                          type="button"
                          className="btn-view-id-link"
                          onClick={() => setViewingImageUrl(user.idCardUrl)}
                          title="Click to view uploaded valid ID photo"
                        >
                          <FileText size={14} />
                          <span>View ID</span>
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === 'super_admin' ? 'Super Admin' : user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`user-status-pill status-${user.status ? user.status.toLowerCase() : 'active'}`}>
                        <span className="status-pill-dot"></span>
                        {user.status === 'Pending' ? 'Pending' : (user.status || 'Active')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {user.status === 'Pending' ? (
                          <>
                            <button
                              type="button"
                              className="action-btn-approve"
                              onClick={async () => {
                                try {
                                  await updateUserStatus(user.id, 'Active');
                                } catch (statusError) {
                                  alert(statusError.message || 'Unable to approve resident.');
                                }
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="action-btn-reject"
                              onClick={async () => {
                                try {
                                  await updateUserStatus(user.id, 'Disabled');
                                } catch (statusError) {
                                  alert(statusError.message || 'Unable to reject resident.');
                                }
                              }}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          user.role !== 'super_admin' && (isSuperAdmin || user.role === 'resident') && (
                            <button
                              type="button"
                              className="action-btn-toggle"
                              title={user.status === 'Active' ? 'Disable this account' : 'Enable this account'}
                              onClick={async () => {
                                try {
                                  await updateUserStatus(user.id, user.status === 'Active' ? 'Disabled' : 'Active');
                                } catch (statusError) {
                                  alert(statusError.message || 'Unable to update user status.');
                                }
                              }}
                            >
                              {user.status === 'Active' ? 'Disable' : 'Enable'}
                            </button>
                          )
                        )}

                        {isSuperAdmin && user.role !== 'super_admin' && (
                          <button
                            type="button"
                            className="action-btn-delete"
                            onClick={() => handleDeleteUser(user)}
                            title={`Delete ${user.role} account`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredUsers.length > 0 && (
          <div className="residents-pagination-container">
            <div className="residents-pagination-info">
              Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
            </div>
            <div className="residents-pagination-controls">
              <button
                type="button"
                className="residents-page-btn"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`residents-page-btn ${safeCurrentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="residents-page-btn"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="modal-close" onClick={closeModal} disabled={isSaving}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {isSuperAdmin && (
                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <select
                    className="form-input"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="resident">Resident</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Juan Dela Cruz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 09242586524"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. juan@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Valid ID Photo</span>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>(Optional)</span>
                </label>
                <div className="file-upload-wrapper">
                  <input
                    type="file"
                    id="valid-id-file-input"
                    accept="image/jpeg,image/png,image/webp"
                    className="file-upload-hidden-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setIdCardFile(file);
                        if (idCardPreview) URL.revokeObjectURL(idCardPreview);
                        setIdCardPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label htmlFor="valid-id-file-input" className="file-upload-box">
                    <div className="file-upload-trigger-btn">
                      <Upload size={16} />
                      <span>Browse Photo</span>
                    </div>
                    <span className="file-upload-filename">
                      {idCardFile ? idCardFile.name : 'No file selected'}
                    </span>
                  </label>
                </div>
                {idCardPreview && (
                  <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                    <img
                      src={idCardPreview}
                      alt="Preview ID"
                      style={{ height: '90px', borderRadius: '10px', border: '1px solid #cbd5e1', objectFit: 'cover', display: 'block' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIdCardFile(null);
                        if (idCardPreview) URL.revokeObjectURL(idCardPreview);
                        setIdCardPreview(null);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="Remove selected ID photo"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Creating...' : `Create ${role === 'admin' ? 'Admin' : 'Resident'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '20px 0 10px' }}>
              <div className="admin-avatar-preview" style={{ width: '100px', height: '100px', fontSize: '32px', fontWeight: '800' }}>
                {selectedUser.avatarUrl ? (
                  <div 
                    onClick={() => setViewingImageUrl(selectedUser.avatarUrl)} 
                    style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}
                  >
                    <img src={selectedUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  selectedUser.name.charAt(0)
                )}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)', margin: '0' }}>{selectedUser.name}</h3>
              <span className={`role-badge ${selectedUser.role}`} style={{ alignSelf: 'center' }}>
                {selectedUser.role === 'super_admin' ? 'Super Admin' : selectedUser.role}
              </span>
            </div>

            <div style={{ textAlign: 'left', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Email Address</span>
                <span style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: '500' }}>{selectedUser.email}</span>
              </div>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Contact Number</span>
                <span style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: '500' }}>{selectedUser.contact || '—'}</span>
              </div>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Account Status</span>
                <span className={`status-toggle-btn ${selectedUser.status ? selectedUser.status.toLowerCase() : 'active'}`} style={{ padding: '0', cursor: 'default' }}>
                  {selectedUser.status === 'Pending' ? 'Pending Verification' : selectedUser.status}
                </span>
              </div>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Submitted Valid ID Photo</span>
                {selectedUser.idCardUrl ? (
                  <div style={{ marginTop: '6px', textAlign: 'center' }}>
                    <img
                      src={selectedUser.idCardUrl}
                      alt="Valid ID"
                      style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0', objectFit: 'contain' }}
                      onClick={() => setViewingImageUrl(selectedUser.idCardUrl)}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>Click to expand ID card image</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No ID photo attached</span>
                )}
              </div>
            </div>

            {selectedUser.status === 'Pending' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1, backgroundColor: '#22C55E' }}
                  onClick={async () => {
                    try {
                      await updateUserStatus(selectedUser.id, 'Active');
                      setSelectedUser(null);
                    } catch (e) {
                      alert(e.message || 'Unable to approve user.');
                    }
                  }}
                >
                  Approve Resident ID
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, color: '#dc2626', borderColor: '#fecaca' }}
                  onClick={async () => {
                    try {
                      await updateUserStatus(selectedUser.id, 'Disabled');
                      setSelectedUser(null);
                    } catch (e) {
                      alert(e.message || 'Unable to reject user.');
                    }
                  }}
                >
                  Reject ID
                </button>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '32px' }}>
              {isSuperAdmin && selectedUser.role !== 'super_admin' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleDeleteUser(selectedUser)}
                  style={{ width: '100%', color: '#dc2626', borderColor: '#fecaca' }}
                >
                  Delete Account
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setSelectedUser(null)} style={{ width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Overlay */}
      {viewingImageUrl && (
        <div 
          className="modal-overlay" 
          onClick={() => setViewingImageUrl(null)} 
          style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img 
              src={viewingImageUrl} 
              alt="Profile" 
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
              onClick={(e) => e.stopPropagation()} 
            />
            <button 
              className="modal-close" 
              onClick={() => setViewingImageUrl(null)} 
              style={{ position: 'absolute', top: '-40px', right: '0', color: 'white', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px' }}
            >
              <X size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
