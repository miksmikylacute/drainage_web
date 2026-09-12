import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import '../css/layout.css';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className="app-container">
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={handleCloseMobileMenu} 
      />
      {isMobileMenuOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={handleCloseMobileMenu} 
          aria-hidden="true"
        />
      )}
      <div className="content-wrapper">
        <Header onToggleMobileMenu={handleToggleMobileMenu} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
