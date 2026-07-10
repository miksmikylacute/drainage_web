import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, MapPin, Users, Bell, LogOut } from 'lucide-react';
import { useApp } from '../context/useApp';
import drainageLogo from '../assets/drainage_clean.png';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useApp();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Map', path: '/map', icon: MapPin },
    { name: 'Residents', path: '/residents', icon: Users },
    { name: 'Notification', path: '/notifications', icon: Bell },
  ];

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    await signOut();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-content-wrapper">
          <div className="sidebar-brand-logo-circle">
            <img src={drainageLogo} alt="Report Drainage Logo" className="sidebar-brand-logo-img" />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">Report Drainage</span>
            <span className="sidebar-brand-subtitle">Monitoring and Reporting System</span>
          </div>
        </div>
      </div>
      
      <div className="sidebar-menu-panel">
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="sidebar-footer">
            <button
              onClick={handleLogoutClick}
              className="sidebar-item"
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {showLogoutModal && createPortal(
        <div className="logout-modal-overlay">
          <div className="logout-modal-card">
            <h3 className="logout-modal-title">Are you sure you want to log out?</h3>
            <p className="logout-modal-text">
              You will need to log in again to access the system.
            </p>
            <div className="logout-modal-actions">
              <button className="logout-modal-cancel" onClick={cancelLogout}>
                Cancel
              </button>
              <button className="logout-modal-confirm" onClick={confirmLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
