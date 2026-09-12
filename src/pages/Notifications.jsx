import { useMemo, useState } from 'react';
import { useApp } from '../context/useApp';
import { Search, X, Send, Users } from 'lucide-react';
import '../css/notifications.css';

export default function Notifications() {
  const { residents, sendNotification } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResidents, setSelectedResidents] = useState([]);
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sending, setSending] = useState(false);

  // Eligible residents who can receive notifications (residents that are not disabled)
  const eligibleResidents = useMemo(() => {
    return (residents || []).filter(
      (res) => res.role === 'resident' && res.status !== 'Disabled'
    );
  }, [residents]);

  const isAllSelected =
    eligibleResidents.length > 0 &&
    eligibleResidents.every((res) => selectedResidents.some((sel) => sel.id === res.id));

  // Filter suggestion list based on query and remove already selected ones
  const suggestions = eligibleResidents.filter((res) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return false;

    const matchesQuery =
      (res.name && res.name.toLowerCase().includes(query)) ||
      (res.email && res.email.toLowerCase().includes(query));

    const alreadySelected = selectedResidents.some((sel) => sel.id === res.id);

    return matchesQuery && !alreadySelected;
  });

  const handleSelectResident = (resident) => {
    setSelectedResidents([...selectedResidents, resident]);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedResidents([]);
    } else {
      setSelectedResidents([...eligibleResidents]);
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleRemoveResident = (id) => {
    setSelectedResidents(selectedResidents.filter((res) => res.id !== id));
  };

  const handleCancel = () => {
    setSelectedResidents([]);
    setMessage('');
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (selectedResidents.length === 0) {
      alert('Please select at least one resident to receive the notification.');
      return;
    }
    if (!message.trim()) {
      alert('Please enter a message.');
      return;
    }

    setSending(true);
    try {
      await sendNotification(selectedResidents.map((resident) => resident.id), message.trim());
      const recipientCount = selectedResidents.length;
      if (recipientCount > 3) {
        alert(`Notification sent successfully to all ${recipientCount} selected residents!`);
      } else {
        const recipientNames = selectedResidents.map((r) => r.name).join(', ');
        alert(`Notification saved for:\n${recipientNames}`);
      }
      handleCancel();
    } catch (sendError) {
      alert(sendError.message || 'Unable to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Gray form panel */}
        <div className="send-notif-form-box">
          
          {/* Search Input Group */}
          <div className="send-notif-input-wrapper">
            <div className="search-input-wrapper" style={{ width: '100%' }}>
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search resident.."
                className="search-input"
                style={{ width: '100%', borderRadius: '10px' }}
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
              />
              {searchQuery && (
                <span className="clear-search-icon" onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}>
                  <X size={16} />
                </span>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((res) => (
                  <div 
                    key={res.id} 
                    className="suggestion-item"
                    onClick={() => handleSelectResident(res)}
                  >
                    <span className="suggestion-name">{res.name}</span>
                    <span className="suggestion-email">{res.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* "To" Field Group */}
          <div className="send-notif-input-wrapper">
            <div className="to-header-row">
              <label className="send-notif-label">
                To:
                {selectedResidents.length > 0 && (
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b', marginLeft: '6px' }}>
                    ({selectedResidents.length} of {eligibleResidents.length} selected)
                  </span>
                )}
              </label>
              <button
                type="button"
                className={`btn-select-all ${isAllSelected ? 'active' : ''}`}
                onClick={handleToggleSelectAll}
                disabled={eligibleResidents.length === 0 || sending}
              >
                {isAllSelected ? (
                  <>
                    <X size={14} />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Users size={14} />
                    <span>Select All Residents ({eligibleResidents.length})</span>
                  </>
                )}
              </button>
            </div>
            <div className="to-list-container">
              {selectedResidents.length > 0 ? (
                selectedResidents.map((res) => (
                  <div key={res.id} className="to-tag">
                    <span>{res.name}</span>
                    <button 
                      type="button" 
                      className="to-tag-remove"
                      onClick={() => handleRemoveResident(res.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                  No residents selected. Search and select above or click Select All Residents.
                </span>
              )}
            </div>
          </div>

          {/* "Message" Field Group */}
          <div className="send-notif-input-wrapper" style={{ marginBottom: 0 }}>
            <label className="send-notif-label">Message</label>
            <textarea
              className="message-textarea"
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

        </div>

        {/* Form Actions (placed outside of gray box) */}
        <div className="notif-btn-row">
          <button 
            type="button" 
            className="btn-cancel-notif"
            onClick={handleCancel}
            disabled={sending}
          >
            Cancel
          </button>
          
          <button 
            type="button" 
            className="btn-send-notif"
            onClick={handleSend}
            disabled={sending}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Send size={16} />
            <span>{sending ? 'Sending...' : 'Send Notification'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
