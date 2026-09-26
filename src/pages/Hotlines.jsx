import { useMemo, useState } from 'react';
import { Edit, Plus, Search, Trash2, X } from 'lucide-react';
import { useApp } from '../context/useApp';
import ConfirmModal from '../components/ConfirmModal';
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
  const { hotlines, saveHotline, deleteHotline, loading, error } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
    isProcessing: false,
    onConfirm: () => {},
  });

  const confirmAction = ({ title, message, confirmText = 'Confirm', variant = 'primary', action }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      variant,
      isProcessing: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isProcessing: true }));
        try {
          await action();
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isProcessing: false }));
        } catch (err) {
          setConfirmModal((prev) => ({ ...prev, isProcessing: false }));
          alert(err.message || 'Operation failed.');
        }
      },
    });
  };

  const filteredHotlines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (hotlines || []).filter((hotline) => {
      if (!query) return true;
      const num = hotline.phoneNumber || '';
      return (
        hotline.name.toLowerCase().includes(query) ||
        num.toLowerCase().includes(query) ||
        (hotline.category || '').toLowerCase().includes(query)
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
      name: hotline.name || '',
      phoneNumber: hotline.phoneNumber || '',
      category: hotline.category || '',
      description: hotline.description || '',
      sortOrder: hotline.sortOrder || 0,
      isActive: hotline.isActive !== false
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phoneNumber.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const isEditing = Boolean(form.id);
    confirmAction({
      title: isEditing ? 'Confirm Update Hotline' : 'Confirm Add Hotline',
      message: `Are you sure you want to ${isEditing ? 'update' : 'add'} the hotline for "${form.name.trim()}" (${form.phoneNumber.trim()})?`,
      confirmText: isEditing ? 'Update Hotline' : 'Add Hotline',
      variant: 'primary',
      action: async () => {
        setIsSaving(true);
        try {
          await saveHotline(form);
          closeModal();
        } finally {
          setIsSaving(false);
        }
      },
    });
  };

  const handleDelete = (hotline) => {
    confirmAction({
      title: 'Delete Hotline',
      message: `Are you sure you want to delete the hotline "${hotline.name}" (${hotline.phoneNumber})? It will be removed immediately from both the admin portal and the resident mobile app.`,
      confirmText: 'Delete Hotline',
      variant: 'danger',
      action: async () => {
        await deleteHotline(hotline.id);
      },
    });
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

      <div className="card table-card">
        <div className="table-container">
          <table className="custom-table hotline-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone Number</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHotlines.length > 0 ? (
                filteredHotlines.map((hotline) => (
                  <tr key={hotline.id} className="hotline-table-row">
                    <td className="col-hotline-name">
                      <div className="hotline-name-cell">
                        <strong>{hotline.name}</strong>
                      </div>
                    </td>
                    <td className="col-hotline-phone">
                      <a href={`tel:${hotline.phoneNumber}`} className="hotline-phone-link">
                        📞 {hotline.phoneNumber}
                      </a>
                    </td>
                    <td className="col-hotline-actions" style={{ textAlign: 'right' }}>
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
                  <td colSpan="3" className="hotline-empty-cell">
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

      {/* Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        isProcessing={confirmModal.isProcessing}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
