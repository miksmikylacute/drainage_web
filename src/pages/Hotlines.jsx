import { useMemo, useState } from 'react';
import { /* Edit, Plus, Search, Trash2, */ X } from 'lucide-react';
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

const NEW_HOTLINES = [
  { id: '1', name: 'PNP', phoneNumbers: ['0910 865 1687', '0998 598 5761'], category: 'Emergency', description: '' },
  { id: '2', name: 'MDRRMO', phoneNumbers: ['0939 916 6123', '(042) 7170 090'], category: 'Disaster', description: '' },
  { id: '3', name: 'BFP', phoneNumbers: ['0969 438 8874', '(042) 7840 950'], category: 'Fire', description: '' },
  { id: '4', name: 'COAST GUARD', phoneNumbers: ['0948 344 4400'], category: 'Rescue', description: '' },
  { id: '5', name: 'HOSPITAL', phoneNumbers: ['0981 598 3404', '(042) 7840 216'], category: 'Medical', description: '' },
];

export default function Hotlines() {
  const { loading, error } = useApp();
  const [searchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const filteredHotlines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return NEW_HOTLINES.filter((hotline) => {
      if (!query) return true;
      const nums = (hotline.phoneNumbers || []).join(' ');
      return (
        hotline.name.toLowerCase().includes(query) ||
        nums.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    closeModal();
  };

  return (
    <div>
      {loading && (
        <div className="card hotline-loading-card">Loading hotlines...</div>
      )}

      {error && (
        <div className="card hotline-error-card">{error}</div>
      )}

      <div className="card" style={{ padding: '8px 24px 24px' }}>
        <div className="table-container">
          <table className="custom-table hotline-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone Number</th>
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
                    <td className="hotline-phone-cell">
                      {Array.isArray(hotline.phoneNumbers) ? (
                        hotline.phoneNumbers.map((num, idx) => (
                          <div key={idx}>{num}</div>
                        ))
                      ) : (
                        hotline.phoneNumber
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="hotline-empty-cell">
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
