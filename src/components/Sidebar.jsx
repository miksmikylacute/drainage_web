import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, MapPin, Users, Bell, LogOut } from 'lucide-react';
import { useApp } from '../context/useApp';
import drainageLogo from '../assets/drainage.png';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useApp();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Map', path: '/map', icon: MapPin },
    { name: 'User Management', path: '/residents', icon: Users },
    { name: 'Notification', path: '/notifications', icon: Bell },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={drainageLogo} alt="Drainage" className="sidebar-logo" />
        <span>Drainage<br />Monitoring System</span>
      </div>
      
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
              <Icon size={22} />
              <span>{item.name}</span>
            </Link>
          );
        })}
        
        <div className="sidebar-footer">
          <button 
            onClick={handleLogout} 
            className="sidebar-item" 
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
          >
            <LogOut size={22} />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
