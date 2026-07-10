import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Camera, User, X } from 'lucide-react';
import { useApp } from '../context/useApp';

export default function Header() {
  const location = useLocation();
  const { session, updateCurrentProfile } = useApp();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getTitle = (path) => {
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/reports':
        return 'All Reports';
      case '/map':
        return 'Reports Map View';
      case '/residents':
        return 'User Management';
      case '/notifications':
        return 'Send Notification';
      default:
        return 'Drainage Monitoring System';
    }
  };

  const openProfile = () => {
    setFullname(session?.user?.fullname || '');
    setPhone(session?.user?.phone || '');
    setEmail(session?.user?.email || '');
    setAvatarFile(null);
    setAvatarPreview(session?.user?.avatarUrl || '');
    setIsProfileOpen(true);
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await updateCurrentProfile({
        fullname,
        phone,
        email,
        avatarFile
      });
      setIsProfileOpen(false);
    } catch (error) {
      alert(error.message || 'Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <header className="app-header">
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
        {getTitle(location.pathname)}
      </h2>
      <button type="button" className="header-profile-btn" onClick={openProfile}>
        <div className="header-avatar">
          {session?.user?.avatarUrl ? (
            <img src={session.user.avatarUrl} alt="" />
          ) : (
            <User size={18} />
          )}
        </div>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
          {session?.user?.fullname || session?.user?.email || 'Admin'}
        </span>
      </button>

      {isProfileOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsProfileOpen(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Admin Profile</h2>
              <button className="modal-close" onClick={() => setIsProfileOpen(false)} disabled={isSaving}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <label className="admin-avatar-picker">
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} />
                <span className="admin-avatar-preview">
                  {avatarPreview ? <img src={avatarPreview} alt="" /> : <User size={38} />}
                </span>
                <span className="admin-avatar-camera">
                  <Camera size={16} />
                </span>
              </label>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={fullname} onChange={(e) => setFullname(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsProfileOpen(false)} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
