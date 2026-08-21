import { useMemo, useState } from 'react';
import { Edit, Plus, Search, Trash2, X } from 'lucide-react';
import { useApp } from '../context/useApp';
import '../css/hotlines.css';

const EMPTY_FORM = {
  id: '',
  name: '',
  phoneNumber: '',
  category: '',
  description: '',
  sortOrder: 0,
  isActive: true
};

export default function Hotlines() {
  const { hotlines, loading, error, saveHotline, deleteHotline } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const filteredHotlines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return hotlines.filter((hotline) => {
      if (!query) return true;
      return (
        hotline.name.toLowerCase().includes(query) ||
        hotline.phoneNumber.toLowerCase().includes(query) ||
        hotline.category.toLowerCase().includes(query) ||
        hotline.description.toLowerCase().includes(query)
      );
    });
  }, [hotlines, searchQuery]);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (hotline) => {
    setForm({
      id: hotline.id,
      name: hotline.name,
      phoneNumber: hotline.phoneNumber,
      category: hotline.category,
      description: hotline.description,
      sortOrder: hotline.sortOrder,
      isActive: hotline.isActive
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await saveHotline(form);
      closeModal();
    } catch (saveError) {
      alert(saveError.message || 'Unable to save hotline.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (hotline) => {
    const shouldDelete = window.confirm(
      `Delete ${hotline.name}? Mobile residents will be notified that hotline information changed.`
    );
    if (!shouldDelete) return;

    try {
      await deleteHotline(hotline.id);
    } catch (deleteError) {
      alert(deleteError.message || 'Unable to delete hotline.');
    }
  };

  return (
    <div>
      {loading && (
        <div className="card hotline-loading-card">Loading hotlines...</div>
      )}

      {error && (
        <div className="card hotline-error-card">{error}</div>
      )}

      <div className="hotline-toolbar">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search hotlines..."
            className="search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <span className="clear-search-icon" onClick={() => setSearchQuery('')}>
              <X size={16} />
            </span>
          )}
        </div>

        <button type="button" className="btn-primary hotline-add-btn" onClick={openCreateModal}>
          <Plus size={18} />
          <span>Add Hotline</span>
        </button>
      </div>

      <div className="card" style={{ padding: '8px 24px 24px' }}>
        <div className="table-container">
          <table className="custom-table hotline-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone Number</th>
                <th>Category</th>
                <th>Status</th>
                <th>Sort</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHotlines.length > 0 ? (
                filteredHotlines.map((hotline) => (
                  <tr key={hotline.id}>
                    <td>
                      <div className="hotline-name-cell">
                        <strong>{hotline.name}</strong>
                        {hotline.description && <span>{hotline.description}</span>}
                      </div>
                    </td>
                    <td className="hotline-phone-cell">{hotline.phoneNumber}</td>
                    <td>{hotline.category || '-'}</td>
                    <td>
                      <span className={`hotline-status ${hotline.isActive ? 'active' : 'inactive'}`}>
                        {hotline.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{hotline.sortOrder}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="hotline-actions">
                        <button
                          type="button"
                          className="hotline-icon-btn"
                          onClick={() => openEditModal(hotline)}
                          title="Edit hotline"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="hotline-icon-btn danger"
                          onClick={() => handleDelete(hotline)}
                          title="Delete hotline"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="hotline-empty-cell">
                    No hotlines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{form.id ? 'Edit Hotline' : 'Add Hotline'}</h2>
              <button className="modal-close" onClick={closeModal} disabled={isSaving}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. Barangay Soledad Emergency"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  value={form.phoneNumber}
                  onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                  placeholder="e.g. 09123456789"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  className="form-input"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="e.g. Emergency, Health, Disaster"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input hotline-textarea"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Short note shown to residents"
                />
              </div>

              <div className="hotline-form-row">
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  />
                </div>

                <label className="hotline-toggle">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  <span>Active hotline</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Hotline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
