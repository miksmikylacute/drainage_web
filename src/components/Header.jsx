import { useLocation, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useApp } from '../context/useApp';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useApp();

  const getTitle = (path) => {
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/reports':
        return 'All Reports';
      case '/map':
        return 'Reports Map View';
      case '/residents':
        return 'Residents Management';
      case '/notifications':
        return 'Send Notification';
      case '/profile':
        return 'Edit Profile';
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
      case '/map':
        return 'Visualize report locations on the map';
      case '/residents':
        return 'Manage registered residents';
      case '/notifications':
        return 'Send notifications to residents';
      default:
        return '';
    }
  };

  return (
    <header className="app-header">
      <div className="header-title-group">
        <h2 className="header-title">
          {getTitle(location.pathname)}
        </h2>
        <p className="header-subtitle">
          {getSubtitle(location.pathname)}
        </p>
      </div>
      <div
        className="header-user"
        onClick={() => navigate('/profile')}
        style={{ cursor: 'pointer' }}
        title="Edit Profile"
      >
        <div className="header-avatar">
          <User size={26} />
        </div>
        <div className="header-user-info">
          <span className="header-user-name">Admin User</span>
          <span className="header-user-role">Administrator</span>
        </div>
      </div>
    </header>
  );
}
