import { useState } from 'react';
import { useApp } from '../context/useApp';
import { Search, UserPlus, X } from 'lucide-react';
import '../css/residents.css';

export default function Residents() {
  const { 
    residents, 
    createUser,
    session,
    toggleResidentStatus,
    loading
  } = useApp();
  const isSuperAdmin = session?.user?.role === 'super_admin';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [role, setRole] = useState('resident');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const visibleUsers = residents.filter((user) => isSuperAdmin || user.role === 'resident');

  const filteredUsers = visibleUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.contact.includes(searchQuery) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="user-management-title">
        <div>
          <h1>User Management</h1>
          <p>
            {isSuperAdmin
              ? 'Create and manage resident and admin accounts.'
              : 'Create and manage resident accounts.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search users..."
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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
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
    </div>
  );
}
