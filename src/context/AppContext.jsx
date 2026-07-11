import { useCallback, useEffect, useState } from 'react';
import { AppContext } from './app-context';
import { supabase } from '../lib/supabaseClient';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

function mapUserProfile(profile) {
  return {
    id: profile.id,
    name: profile.fullname,
    contact: profile.phone || '',
    email: profile.email,
    avatarUrl: profile.avatar_url || '',
    role: profile.role,
    status: profile.status
  };
}

function statusClass(status) {
  return `${status || ''}`.toLowerCase().replace(/\s+/g, '');
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function mapReport(report) {
  const resident = report.users || {};
  const id = report.id;

  return {
    id,
    displayId: `DR-${id.slice(0, 8).toUpperCase()}`,
    issue: report.title || 'Drainage Issue',
    title: report.title || 'Drainage Issue',
    location: report.location_label || 'Pinned location',
    status: report.status || 'Pending',
    statusClass: statusClass(report.status),
    dateSubmitted: formatDate(report.created_at),
    submittedBy: resident.fullname || 'Unknown resident',
    contactNo: resident.phone || '',
    residentEmail: resident.email || '',
    description: report.description || '',
    imageUrl: report.image_url || '',
    latitude: typeof report.latitude === 'number' ? report.latitude : Number(report.latitude),
    longitude: typeof report.longitude === 'number' ? report.longitude : Number(report.longitude),
    createdAt: report.created_at,
    updatedAt: report.updated_at
  };
}

function mapNotification(notification) {
  return {
    id: notification.id,
    userId: notification.user_id,
    reportId: notification.report_id,
    title: notification.title || 'Notification',
    message: notification.message || '',
    isRead: Boolean(notification.is_read),
    sentBy: notification.sent_by,
    createdAt: notification.created_at
  };
}

function mapReportLog(log) {
  return {
    id: log.id,
    reportId: log.report_id,
    oldStatus: log.old_status,
    newStatus: log.new_status || 'Pending',
    remarks: log.remarks || '',
    changedBy: log.changed_by,
    createdAt: log.created_at,
    createdAtLabel: formatDate(log.created_at)
  };
}

function mapReportRemark(remark) {
  const admin = remark.users || {};

  return {
    id: remark.id,
    reportId: remark.report_id,
    adminId: remark.admin_id,
    adminName: admin.fullname || admin.email || 'Admin',
    remark: remark.remark || '',
    createdAt: remark.created_at,
    createdAtLabel: formatDate(remark.created_at)
  };
}

function buildSession(authSession, profile) {
  if (!authSession?.user || !profile) return null;

  return {
    accessToken: authSession.access_token,
    user: {
      id: authSession.user.id,
      email: authSession.user.email,
      fullname: profile.fullname,
      phone: profile.phone,
      avatarUrl: profile.avatar_url || '',
      role: profile.role,
      status: profile.status
    }
  };
}

export function AppProvider({ children }) {
  const [reports, setReports] = useState([]);
  const [residents, setResidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reportLogs, setReportLogs] = useState([]);
  const [reportRemarks, setReportRemarks] = useState([]);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id,email,fullname,phone,avatar_url,role,status,created_at')
        .in('role', ['resident', 'admin', 'super_admin'])
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setResidents((users || []).map(mapUserProfile));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: reportRows, error: reportsError } = await supabase
        .from('reports')
        .select(`
          id,
          user_id,
          title,
          description,
          image_url,
          latitude,
          longitude,
          location_label,
          status,
          created_at,
          updated_at,
          users:user_id (
            fullname,
            phone,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      setReports((reportRows || []).map(mapReport));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const { data: notificationRows, error: notificationsError } = await supabase
        .from('notifications')
        .select('id,user_id,report_id,title,message,is_read,sent_by,created_at')
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;
      setNotifications((notificationRows || []).map(mapNotification));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load notifications.');
    }
  }, []);

  const loadReportLogs = useCallback(async () => {
    try {
      const { data: logRows, error: logsError } = await supabase
        .from('report_logs')
        .select('id,report_id,old_status,new_status,changed_by,remarks,created_at')
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setReportLogs((logRows || []).map(mapReportLog));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load report timeline.');
    }
  }, []);

  const loadReportRemarks = useCallback(async () => {
    try {
      const { data: remarkRows, error: remarksError } = await supabase
        .from('admin_report_remarks')
        .select(`
          id,
          report_id,
          admin_id,
          remark,
          created_at,
          users:admin_id (
            fullname,
            email
          )
        `)
        .order('created_at', { ascending: true });

      if (remarksError) throw remarksError;
      setReportRemarks((remarkRows || []).map(mapReportRemark));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load report remarks.');
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [
        usersResult,
        reportsResult,
        notificationsResult,
        logsResult,
        remarksResult
      ] = await Promise.all([
        supabase
          .from('users')
          .select('id,email,fullname,phone,avatar_url,role,status,created_at')
          .in('role', ['resident', 'admin', 'super_admin'])
          .order('created_at', { ascending: false }),
        supabase
          .from('reports')
          .select(`
            id,
            user_id,
            title,
            description,
            image_url,
            latitude,
            longitude,
            location_label,
            status,
            created_at,
            updated_at,
            users:user_id (
              fullname,
              phone,
              email,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('id,user_id,report_id,title,message,is_read,sent_by,created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('report_logs')
          .select('id,report_id,old_status,new_status,changed_by,remarks,created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('admin_report_remarks')
          .select(`
            id,
            report_id,
            admin_id,
            remark,
            created_at,
            users:admin_id (
              fullname,
              email
            )
          `)
          .order('created_at', { ascending: false })
      ]);

      if (usersResult.error) throw usersResult.error;
      if (reportsResult.error) throw reportsResult.error;
      if (notificationsResult.error) throw notificationsResult.error;
      if (logsResult.error) throw logsResult.error;
      if (remarksResult.error) throw remarksResult.error;

      setResidents((usersResult.data || []).map(mapUserProfile));
      setReports((reportsResult.data || []).map(mapReport));
      setNotifications((notificationsResult.data || []).map(mapNotification));
      setReportLogs((logsResult.data || []).map(mapReportLog));
      setReportRemarks((remarksResult.data || []).map(mapReportRemark).reverse());
    } catch (loadError) {
      setError(loadError.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAdminSession = useCallback(async (authSession) => {
    if (!authSession?.user) {
      setSession(null);
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id,email,fullname,phone,avatar_url,role,status')
      .eq('id', authSession.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setSession(null);
      throw new Error('Unable to load your account profile.');
    }

    if (!ADMIN_ROLES.has(profile.role)) {
      await supabase.auth.signOut();
      setSession(null);
      throw new Error('Resident accounts cannot access the admin dashboard.');
    }

    if (profile.status !== 'Active') {
      await supabase.auth.signOut();
      setSession(null);
      throw new Error('This admin account is disabled.');
    }

    const nextSession = buildSession(authSession, profile);
    setSession(nextSession);
    await loadDashboardData();
    return nextSession;
  }, [loadDashboardData]);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (isMounted && data.session) {
          await loadAdminSession(data.session);
        }
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Unable to load session.');
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    initializeSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!isMounted) return;
      if (!authSession) {
        setSession(null);
        return;
      }

      loadAdminSession(authSession).catch((loadError) => {
        if (isMounted) setError(loadError.message || 'Unable to load session.');
      });
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAdminSession]);

  const refreshData = useCallback(async () => {
    if (!session?.user) return;
    await loadDashboardData();
  }, [loadDashboardData, session?.user]);

  useEffect(() => {
    if (!session?.user) return undefined;

    const channel = supabase
      .channel('admin-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => {
          loadReports();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          loadNotifications();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'report_logs' },
        () => {
          loadReports();
          loadReportLogs();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_report_remarks' },
        () => {
          loadReportRemarks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, loadReportLogs, loadReportRemarks, loadReports, session?.user]);

  const signIn = async (email, password) => {
    if (!email.trim() || !password) {
      throw new Error('Email and password are required.');
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) throw signInError;
    return loadAdminSession(data.session);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setReports([]);
    setResidents([]);
    setNotifications([]);
    setReportLogs([]);
    setReportRemarks([]);
  };

  const resetPassword = async (email) => {
    if (!email.trim()) {
      throw new Error('Email is required.');
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (resetError) throw resetError;
  };

  const updateCurrentProfile = async ({ fullname, phone, email, avatarFile }) => {
    if (!session?.user) throw new Error('No authenticated user.');

    let avatarUrl = session.user.avatarUrl || '';

    if (avatarFile) {
      const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
      const path = `${session.user.id}/avatar-${Date.now()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = data.publicUrl;
    }

    if (email.trim() !== session.user.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: email.trim() });
      if (authError) throw authError;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .update({
        email: email.trim(),
        fullname: fullname.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl
      })
      .eq('id', session.user.id)
      .select('id,email,fullname,phone,avatar_url,role,status')
      .single();

    if (profileError) throw profileError;

    setSession((currentSession) =>
      currentSession
        ? {
            ...currentSession,
            user: {
              ...currentSession.user,
              email: profile.email,
              fullname: profile.fullname,
              phone: profile.phone,
              avatarUrl: profile.avatar_url || ''
            }
          }
        : currentSession
    );

    await loadUsers();
  };

  const updateReportDetails = async (id, newStatus, newRemarks) => {
    const { data, error: updateError } = await supabase.rpc('update_report_status', {
      p_report_id: id,
      p_new_status: newStatus,
      p_remarks: newRemarks || null
    });

    if (updateError) throw updateError;

    const updatedStatus = data?.status || newStatus;

    setReports((prevReports) =>
      prevReports.map((report) =>
        report.id === id
          ? { ...report, status: updatedStatus, statusClass: statusClass(updatedStatus), remarks: newRemarks }
          : report
      )
    );
    await loadReports();
    await loadReportLogs();
  };

  const addReportRemark = async (reportId, remark) => {
    if (!session?.user) throw new Error('No authenticated admin session.');

    const cleanRemark = `${remark || ''}`.trim();
    if (!cleanRemark) {
      throw new Error('Please enter a remark.');
    }

    const { data, error: remarkError } = await supabase
      .from('admin_report_remarks')
      .insert({
        report_id: reportId,
        admin_id: session.user.id,
        remark: cleanRemark
      })
      .select(`
        id,
        report_id,
        admin_id,
        remark,
        created_at,
        users:admin_id (
          fullname,
          email
        )
      `)
      .single();

    if (remarkError) throw remarkError;

    const mappedRemark = mapReportRemark(data);
    setReportRemarks((prevRemarks) => [...prevRemarks, mappedRemark]);
    return mappedRemark;
  };

  const createUser = async ({ name, contact, email, password, role }) => {
    const requestedRole = role || 'resident';

    if (requestedRole === 'admin' && session?.user?.role !== 'super_admin') {
      throw new Error('Only a super admin can create admin accounts.');
    }

    const { data, error: createError } = await supabase.functions.invoke('create-user', {
      body: {
        fullname: name,
        phone: contact,
        email,
        password,
        role: requestedRole
      }
    });

    if (createError) throw createError;
    if (data?.error) throw new Error(data.error);

    await refreshData();
    return data?.user;
  };

  const addResident = async (resident) => createUser({ ...resident, role: 'resident' });

  const updateUserStatus = async (id, status) => {
    const targetUser = residents.find((user) => user.id === id);

    if (session?.user?.role === 'admin' && targetUser?.role !== 'resident') {
      throw new Error('Regular admins can only modify resident accounts.');
    }

    const { data, error: statusError } = await supabase.functions.invoke('set-user-status', {
      body: {
        user_id: id,
        status
      }
    });

    if (statusError) throw statusError;
    if (data?.error) throw new Error(data.error);

    setResidents((prevUsers) =>
      prevUsers.map((user) => (user.id === id ? { ...user, status } : user))
    );

    return data;
  };

  const deleteResident = async (id) => updateUserStatus(id, 'Disabled');

  const toggleResidentStatus = async (id) => {
    const user = residents.find((item) => item.id === id);
    if (!user) throw new Error('User not found.');
    return updateUserStatus(id, user.status === 'Active' ? 'Disabled' : 'Active');
  };
  const sendNotification = async (residentIds, message) => {
    if (!session?.user) throw new Error('No authenticated admin session.');

    const cleanMessage = `${message || ''}`.trim();
    const recipients = Array.isArray(residentIds)
      ? residentIds.filter(Boolean)
      : [];

    if (recipients.length === 0) {
      throw new Error('Please select at least one resident.');
    }

    if (!cleanMessage) {
      throw new Error('Please enter a message.');
    }

    const rows = recipients.map((userId) => ({
      user_id: userId,
      title: 'Admin Notification',
      message: cleanMessage,
      sent_by: session.user.id
    }));

    const { data, error: notificationError } = await supabase
      .from('notifications')
      .insert(rows)
      .select('id,user_id,report_id,title,message,is_read,sent_by,created_at');

    if (notificationError) throw notificationError;

    setNotifications((prevNotifications) => [
      ...(data || []).map(mapNotification),
      ...prevNotifications
    ]);

    return data;
  };

  const value = {
    reports,
    residents,
    notifications,
    reportLogs,
    reportRemarks,
    session,
    authLoading,
    loading,
    error,
    refreshData,
    signIn,
    signOut,
    resetPassword,
    updateCurrentProfile,
    updateReportDetails,
    addReportRemark,
    createUser,
    addResident,
    deleteResident,
    toggleResidentStatus,
    sendNotification
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
