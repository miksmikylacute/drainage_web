import { useState, useEffect, useRef } from 'react';
import { User, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { useApp } from '../context/useApp';
import { supabase } from '../lib/supabase';
import '../css/profile.css';

export default function Profile() {
  const { session } = useApp();

  const [fullName, setFullName]             = useState('');
  const [email, setEmail]                   = useState('');
  const [contactNumber, setContactNumber]   = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl]           = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [toast, setToast]                   = useState(null);
  const fileInputRef                        = useRef(null);

  // Pre-fill from session on mount
  useEffect(() => {
    if (session?.user) {
      const meta = session.user.user_metadata || {};
      setFullName(meta.full_name || meta.name || '');
      setEmail(session.user.email || '');
      setContactNumber(meta.contact_no || meta.contact || '');
      if (meta.avatar_url) setAvatarUrl(meta.avatar_url);
    }
  }, [session]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          contact_no: contactNumber.trim(),
        }
      };

      if (newPassword) {
        updates.password = newPassword;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      showToast('success', 'Profile updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast('error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (session?.user) {
      const meta = session.user.user_metadata || {};
      setFullName(meta.full_name || meta.name || '');
      setEmail(session.user.email || '');
      setContactNumber(meta.contact_no || meta.contact || '');
    }
    setNewPassword('');
    setConfirmPassword('');
    setToast(null);
  };

  return (
    <div className="profile-page">

      {/* Toast */}
      {toast && (
        <div className={`profile-toast ${toast.type}`}>
          {toast.type === 'success'
            ? <CheckCircle size={16} />
            : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="profile-card">
        {/* Blue header — centered, matches Flutter inner screens */}
        <div className="profile-card-header profile-card-header--center">
          {/* Clickable avatar */}
          <div
            className="profile-avatar-wrap"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change profile picture"
          >
            <div className="profile-avatar-circle">
              {avatarUrl
                ? <img src={avatarUrl} alt="Profile" className="profile-avatar-img" />
                : <User size={36} color="#fff" />}
            </div>
            {/* Camera badge */}
            <div className="profile-avatar-badge">
              <Camera size={13} color="#fff" />
            </div>
          </div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setAvatarUrl(ev.target.result);
                reader.readAsDataURL(file);
              }
            }}
          />
          <div className="profile-header-info">
            <h3>{fullName || 'Admin User'}</h3>
            <p>Administrator</p>
          </div>
        </div>

        {/* Form body */}
        <div className="profile-card-body">
          <form onSubmit={handleSave}>

            {/* ── Personal Information ── */}
            <div className="profile-section-label">Personal Information</div>

            <div className="profile-fields-grid">
              <div className="profile-field">
                <label htmlFor="prof-fullname">Full Name</label>
                <input
                  id="prof-fullname"
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="prof-email">Email</label>
                <input
                  id="prof-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  disabled
                  title="Email cannot be changed here"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="prof-role">Role</label>
                <input
                  id="prof-role"
                  type="text"
                  value="Administrator"
                  disabled
                />
              </div>

              <div className="profile-field">
                <label htmlFor="prof-contact">Contact Number</label>
                <input
                  id="prof-contact"
                  type="tel"
                  placeholder="Enter contact number"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>
            </div>

            {/* ── Update Account Information ── */}
            <div className="profile-update-section">
              <div className="profile-update-title">Update your account information</div>
              <div className="profile-update-subtitle">
                Leave the password fields empty if you don&apos;t want to change your password.
              </div>

              <div className="profile-fields-grid">
                <div className="profile-field">
                  <label htmlFor="prof-newpwd">New Password</label>
                  <input
                    id="prof-newpwd"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="prof-confirmpwd">Confirm Password</label>
                  <input
                    id="prof-confirmpwd"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="profile-actions">
              <button
                type="button"
                className="profile-btn-cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="profile-btn-save"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
