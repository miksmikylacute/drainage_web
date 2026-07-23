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
      case '/archive':
        return 'Report Archive';
      case '/map':
        return 'Reports Map View';
      case '/residents':
        return 'Residents Management';
      case '/notifications':
        return 'Send Notification';
      default:
        return 'Drainage Monitoring System';
    }
  };

  const getSubtitle = (path) => {
    switch (path) {
      case '/dashboard':
        return 'Welcome Back, Admin!';
      case '/reports':
        return 'View and manage all submitted reports';
      case '/archive':
        return 'View and manage all your previously submitted reports';
      case '/map':
        return 'Visualize report locations on the map';
      case '/residents':
        return 'Manage registered users and account status';
      case '/notifications':
        return 'Send notifications to residents';
      default:
        return '';
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
      <div className="header-title-group">
        <h2 className="header-title">{getTitle(location.pathname)}</h2>
        <p className="header-subtitle">{getSubtitle(location.pathname)}</p>
      </div>
      <div
        className="header-user"
        onClick={openProfile}
        role="button"
        tabIndex={0}
        title="Edit Profile"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openProfile();
          }
        }}
      >
        <div className="header-avatar">
          {session?.user?.avatarUrl ? (
            <img src={session.user.avatarUrl} alt="" />
          ) : (
            <User size={26} />
          )}
        </div>
        <div className="header-user-info">
          <span className="header-user-name">
            {session?.user?.fullname || session?.user?.email || 'Admin'}
          </span>
          <span className="header-user-role">
            {session?.user?.role === 'super_admin' ? 'Super Admin' : 'Administrator'}
          </span>
        </div>
      </div>

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
