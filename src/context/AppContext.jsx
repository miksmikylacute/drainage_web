import { useCallback, useState } from 'react';
import { AppContext } from './app-context';

const SESSION_STORAGE_KEY = 'drainage-admin-preview-session';

const backendNotConnected = () => {
  throw new Error('Backend integration is not connected yet.');
};

function readStoredSession() {
  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

function storeSession(session) {
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AppProvider({ children }) {
  const [reports, setReports] = useState([]);
  const [residents, setResidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [session, setSession] = useState(() => readStoredSession());
  const [authLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refreshData = useCallback(async () => {
    setLoading(false);
    setError('');
  }, []);

  const signIn = async (email, password) => {
    if (!email.trim() || !password) {
      throw new Error('Email and password are required.');
    }

    const nextSession = {
      user: {
        email: email.trim(),
        role: 'admin'
      }
    };

    setSession(nextSession);
    storeSession(nextSession);
  };

  const signOut = async () => {
    setSession(null);
    storeSession(null);
    setReports([]);
    setResidents([]);
    setNotifications([]);
  };

  const updateReportDetails = async (id, newStatus, newRemarks) => {
    setReports((prevReports) =>
      prevReports.map((report) =>
        report.id === id ? { ...report, status: newStatus, remarks: newRemarks } : report
      )
    );
    backendNotConnected();
  };

  const addResident = async () => backendNotConnected();
  const deleteResident = async () => backendNotConnected();
  const toggleResidentStatus = async () => backendNotConnected();
  const sendNotification = async () => backendNotConnected();

  const value = {
    reports,
    residents,
    notifications,
    session,
    authLoading,
    loading,
    error,
    refreshData,
    signIn,
    signOut,
    updateReportDetails,
    addResident,
    deleteResident,
    toggleResidentStatus,
    sendNotification
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
