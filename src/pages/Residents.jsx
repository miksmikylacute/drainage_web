import { useState } from 'react';
import { useApp } from '../context/useApp';
import { Search, Trash2, UserPlus, X } from 'lucide-react';
import '../css/residents.css';

export default function Residents() {
  const { 
    residents, 
    addResident, 
    deleteResident, 
    toggleResidentStatus 
  } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setContact('');
    setEmail('');
    setPassword('');
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Handle Add Resident Form Submit
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
      await addResident({
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

  // Filter residents
  const filteredResidents = residents.filter(res => 
    res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.contact.includes(searchQuery)
  );

  return (
    <div>
      <div className="section-header" style={{ marginBottom: '24px', justifyContent: 'flex-end' }}>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Search Resident */}
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search resident..."
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
            <span>Add Resident</span>
          </button>
        </div>
      </div>

      {/* Residents Table */}
      <div className="card" style={{ padding: '8px 24px 24px' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Number</th>
                <th>Email</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResidents.length > 0 ? (
                filteredResidents.map((res) => (
                  <tr key={res.id}>
                    <td>{res.name}</td>
                    <td>{res.contact}</td>
                    <td>{res.email}</td>
                    <td>
                      <button
                        title="Click to toggle status"
                        className={`status-toggle-btn ${res.status.toLowerCase()}`}
                        onClick={async () => {
                          try {
                            await toggleResidentStatus(res.id);
                          } catch (statusError) {
                            alert(statusError.message || 'Unable to update resident status.');
                          }
                        }}
                      >
                        {res.status}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn-delete"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${res.name}?`)) {
                            deleteResident(res.id).catch((deleteError) => {
                              alert(deleteError.message || 'Unable to delete resident.');
                            });
                          }
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No residents found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Resident Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Resident</h2>
              <button className="modal-close" onClick={closeModal} disabled={isSaving}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
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
                  {isSaving ? 'Creating...' : 'Create Resident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
