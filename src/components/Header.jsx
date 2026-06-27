import { useLocation } from 'react-router-dom';
import { User } from 'lucide-react';
import { useApp } from '../context/useApp';

export default function Header() {
  const location = useLocation();
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
      default:
        return 'Drainage Monitoring System';
    }
  };

  return (
    <header className="app-header">
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
        {getTitle(location.pathname)}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          backgroundColor: '#f1f5f9', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#64748b' 
        }}>
          <User size={18} />
        </div>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>
          {session?.user?.email || 'Admin'}
        </span>
      </div>
    </header>
  );
}
