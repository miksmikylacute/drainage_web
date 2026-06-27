import { useCallback, useEffect, useState } from 'react';
import { residentAuthClient, supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppContext } from './app-context';

const REPORTS_TABLE = 'reports';
const RESIDENTS_TABLE = 'residents';
const NOTIFICATIONS_TABLE = 'notifications';

const formatDate = (value) => {
  if (!value) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(value));
};

const normalizeStatus = (status) => status || 'In Progress';

const mapReportFromDb = (report) => {
  const dateValue = report.date_submitted || report.created_at;

  return {
    id: report.id,
    displayId: report.report_no ? `#${report.report_no}` : String(report.id).slice(0, 8),
    issue: report.issue || report.issue_type || 'Drainage Report',
    location: report.location || '',
    status: normalizeStatus(report.status),
    dateSubmitted: formatDate(dateValue),
    submittedBy: report.submitted_by || report.submittedBy || 'Anonymous',
    contactNo: report.contact_no || report.contactNo || 'N/A',
    description: report.description || '',
    remarks: report.remarks || '',
    mapCoords: report.map_coords || report.mapCoords || null,
    latLngLabel: report.lat_lng_label || report.latLngLabel || report.location || '',
    imageUrl: report.image_url || report.imageUrl || '',
    latitude: report.latitude ?? report.lat ?? null,
    longitude: report.longitude ?? report.lng ?? report.lon ?? null,
    createdAt: dateValue
  };
};

const mapResidentFromDb = (resident) => ({
  id: resident.id,
  name: resident.name || resident.full_name || 'Unnamed Resident',
  contact: resident.contact || resident.contact_no || '',
  email: resident.email || '',
  status: resident.status || 'Active'
});

export function AppProvider({ children }) {
  const [reports, setReports] = useState([]);
  const [residents, setResidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    isSupabaseConfigured
      ? ''
      : 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );

  const loadReports = useCallback(async () => {
    if (!supabase) return;

    const { data, error: reportsError } = await supabase
      .from(REPORTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (reportsError) throw reportsError;
    setReports((data || []).map(mapReportFromDb));
  }, []);

  const loadResidents = useCallback(async () => {
    if (!supabase) return;

    const { data, error: residentsError } = await supabase
      .from(RESIDENTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (residentsError) throw residentsError;
    setResidents((data || []).map(mapResidentFromDb));
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!supabase) return;

    const { data, error: notificationsError } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (notificationsError) {
      setNotifications([]);
      return;
    }

    setNotifications(data || []);
  }, []);

  const refreshData = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    setError('');

    try {
      await Promise.all([loadReports(), loadResidents(), loadNotifications()]);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load Supabase data.');
    } finally {
      setLoading(false);
    }
  }, [loadNotifications, loadReports, loadResidents]);

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
      if (data.session) {
        refreshData();
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoading(false);
      if (newSession) {
        refreshData();
      } else {
        setReports([]);
        setResidents([]);
        setNotifications([]);
      }
    });

    const reportsChannel = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: REPORTS_TABLE }, loadReports)
      .subscribe();

    const residentsChannel = supabase
      .channel('residents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: RESIDENTS_TABLE }, loadResidents)
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(residentsChannel);
    };
  }, [loadReports, loadResidents, refreshData]);

  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    setSession(data.session);
    await refreshData();
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  const updateReportDetails = async (id, newStatus, newRemarks) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { error: updateError } = await supabase
      .from(REPORTS_TABLE)
      .update({ status: newStatus, remarks: newRemarks })
      .eq('id', id);

    if (updateError) throw updateError;

    setReports((prevReports) =>
      prevReports.map((report) =>
        report.id === id ? { ...report, status: newStatus, remarks: newRemarks } : report
      )
    );
  };

  const addResident = async (newResident) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (!residentAuthClient) throw new Error('Resident auth is not configured.');

    const { data: authData, error: signUpError } = await residentAuthClient.auth.signUp({
      email: newResident.email,
      password: newResident.password,
      options: {
        data: {
          name: newResident.name,
          contact: newResident.contact,
          contact_no: newResident.contact
        }
      }
    });

    if (signUpError) throw signUpError;

    const authUserId = authData.user?.id;
    if (!authUserId) {
      throw new Error('Resident auth account was not created.');
    }

    const { data, error: insertError } = await supabase
      .from(RESIDENTS_TABLE)
      .insert({
        id: authUserId,
        name: newResident.name,
        contact: newResident.contact,
        email: newResident.email,
        status: 'Active'
      })
      .select()
      .single();

    if (insertError) throw insertError;
    setResidents((prev) => [mapResidentFromDb(data), ...prev]);
  };

  const deleteResident = async (id) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data, error: deleteError } = await supabase.functions.invoke('delete-resident', {
      body: { id }
    });

    if (deleteError) throw deleteError;
    if (data?.error) throw new Error(data.error);

    setResidents((prev) => prev.filter((resident) => resident.id !== id));
  };

  const toggleResidentStatus = async (id) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    const resident = residents.find((item) => item.id === id);
    if (!resident) return;

    const nextStatus = resident.status === 'Active' ? 'Inactive' : 'Active';
    const { error: updateError } = await supabase
      .from(RESIDENTS_TABLE)
      .update({ status: nextStatus })
      .eq('id', id);

    if (updateError) throw updateError;

    setResidents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
  };

  const sendNotification = async (recipientIds, message) => {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data, error: insertError } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .insert({
        recipient_ids: recipientIds,
        message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    setNotifications((prev) => [data, ...prev]);
    return data;
  };

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
