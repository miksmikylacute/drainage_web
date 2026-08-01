import { useState } from 'react';
import { useApp } from '../context/useApp';
import { ChevronLeft, ChevronRight, Search, Trash2, UserPlus, X } from 'lucide-react';
import '../css/residents.css';

const ITEMS_PER_PAGE = 10;

export default function Residents() {
  const { 
    residents, 
    createUser,
    session,
    deleteUser,
    toggleResidentStatus,
    loading
  } = useApp();
  const isSuperAdmin = session?.user?.role === 'super_admin';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  
  // Form State
  const [role, setRole] = useState('resident');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [viewingImageUrl, setViewingImageUrl] = useState(null);

  const resetForm = () => {
    setRole('resident');
    setName('');
    setContact('');
    setEmail('');
    setPassword('');
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
        password
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

  const filteredUsers = visibleUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.contact.includes(searchQuery) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayedUsers = filteredUsers.slice(0, visibleCount);

  return (
    <div>
      <div className="user-management-title" style={{ justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(10);
              }}
            />
            {searchQuery && (
              <span className="clear-search-icon" onClick={() => {
                setSearchQuery('');
                setVisibleCount(10);
              }}>
                <X size={16} />
              </span>
            )}
          </div>

          {/* Add Resident Button */}
          <button 
            className="btn-primary" 
            onClick={openAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px' }}
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
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.contact || '—'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === 'super_admin' ? 'Super Admin' : user.role}
                      </span>
                    </td>
                    <td>
                      <button
                        title="Click to toggle status"
                        className={`status-toggle-btn ${user.status.toLowerCase()}`}
                        disabled={user.role === 'super_admin' || (!isSuperAdmin && user.role !== 'resident')}
                        onClick={async () => {
                          try {
                            await toggleResidentStatus(user.id);
                          } catch (statusError) {
                            alert(statusError.message || 'Unable to update user status.');
                          }
                        }}
                      >
                        {user.status}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-secondary"
                          disabled={user.role === 'super_admin' || (!isSuperAdmin && user.role !== 'resident')}
                          onClick={async () => {
                            try {
                              await toggleResidentStatus(user.id);
                            } catch (statusError) {
                              alert(statusError.message || 'Unable to update user status.');
                            }
                          }}
                        >
                          {user.status === 'Active' ? 'Disable' : 'Enable'}
                        </button>
                        {isSuperAdmin && user.role !== 'super_admin' && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleDeleteUser(user)}
                            style={{ color: '#dc2626', borderColor: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            title={`Delete ${user.role} account`}
                          >
                            <Trash2 size={15} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
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
              Showing 1 to {Math.min(visibleCount, filteredUsers.length)} of {filteredUsers.length} users
            </div>
            {filteredUsers.length > 10 && (
              <div className="residents-pagination-controls" style={{ display: 'flex', gap: '8px' }}>
                {visibleCount < filteredUsers.length && (
                  <button
                    type="button"
                    className="residents-page-btn"
                    style={{ width: 'auto', padding: '0 16px' }}
                    onClick={() => setVisibleCount((prev) => prev + 10)}
                  >
                    Show More
                  </button>
                )}
                {visibleCount > 10 && (
                  <button
                    type="button"
                    className="residents-page-btn"
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
                <span className={`status-toggle-btn ${selectedUser.status.toLowerCase()}`} style={{ padding: '0', cursor: 'default' }}>{selectedUser.status}</span>
              </div>
            </div>

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
