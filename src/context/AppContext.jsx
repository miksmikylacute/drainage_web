import { useCallback, useEffect, useState } from 'react';
import { AppContext } from './app-context';
import { supabase } from '../lib/supabaseClient';

const backendNotConnected = () => {
  throw new Error('Backend integration is not connected yet.');
};

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
    await loadUsers();
    return nextSession;
  }, [loadUsers]);

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
    await loadUsers();
  }, [loadUsers, session?.user]);

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
    setReports((prevReports) =>
      prevReports.map((report) =>
        report.id === id ? { ...report, status: newStatus, remarks: newRemarks } : report
      )
    );
    backendNotConnected();
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
    resetPassword,
    updateCurrentProfile,
    updateReportDetails,
    createUser,
    addResident,
    deleteResident,
    toggleResidentStatus,
    sendNotification
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
