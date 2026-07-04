import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, MapPin, Users, Bell, LogOut } from 'lucide-react';
import { useApp } from '../context/useApp';
import drainageLogo from '../assets/drainage_clean.png';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useApp();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Map', path: '/map', icon: MapPin },
    { name: 'Residents', path: '/residents', icon: Users },
    { name: 'Notification', path: '/notifications', icon: Bell },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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
              onClick={handleLogout}
              className="sidebar-item"
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}
