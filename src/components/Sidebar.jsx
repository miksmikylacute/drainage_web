import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, MapPin, History, Users, Bell, PhoneCall, LogOut } from 'lucide-react';
import { useApp } from '../context/useApp';
import drainageLogo from '../assets/drain_alert_logo_new.png';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, adminNotifications, residents, session } = useApp();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const reportsUnreadCount = (adminNotifications || []).filter(
    (item) => !item.isRead && item.type !== 'new_user'
  ).length;
  const isSuperAdmin = session?.user?.role === 'super_admin';
  const visibleUsers = (residents || []).filter((user) => isSuperAdmin || user.role === 'resident');
  const pendingResidentsCount = visibleUsers.filter((u) => u.status === 'Pending').length;

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Reports', path: '/reports', icon: FileText, badge: reportsUnreadCount },
    { name: 'Map', path: '/map', icon: MapPin },
    { name: 'Report Archive', path: '/archive', icon: History },
    { name: 'Residents', path: '/residents', icon: Users, badge: pendingResidentsCount },
    { name: 'Notification', path: '/notifications', icon: Bell },
    { name: 'Hotlines', path: '/hotlines', icon: PhoneCall },
  ];

  const confirmLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-content-wrapper">
          <div className="sidebar-brand-logo-circle">
            <img src={drainageLogo} alt="DrainAlert" className="sidebar-brand-logo-img" />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">DrainAlert</span>
            <span className="sidebar-brand-subtitle">Drainage Reports Monitoring</span>
          </div>
        </div>
      </div>
      
      <div className="sidebar-menu-panel">
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const hasBadge = typeof item.badge === 'number' && item.badge > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
                {hasBadge && (
                  <span className="sidebar-badge">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          
          <div className="sidebar-footer">
            <button 
              onClick={() => setShowLogoutModal(true)}
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
              <button className="logout-modal-cancel" onClick={() => setShowLogoutModal(false)}>
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
