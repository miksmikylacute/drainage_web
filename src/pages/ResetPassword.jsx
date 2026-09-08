import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { supabase } from '../lib/supabaseClient';
import '../css/login.css';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import drainageLogo from '../assets/drainage_clean.png';

function ResetPasswordDialog({ dialog, onClose }) {
  if (!dialog) return null;

  return (
    <div className="login-dialog-backdrop" role="presentation">
      <div className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title">
        <div className={`login-dialog-icon ${dialog.type === 'success' ? 'is-success' : 'is-error'}`}>
          {dialog.type === 'success' ? '✓' : '!'}
        </div>
        <h2 id="reset-dialog-title">{dialog.title}</h2>
        <p>{dialog.message}</p>
        <button
          type="button"
          onClick={() => {
            onClose();
            if (dialog.onConfirm) dialog.onConfirm();
          }}
        >
          {dialog.buttonText || 'OK'}
        </button>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [hasSession, setHasSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updatePassword } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        setHasSession(true);
      }
      setCheckingSession(false);
    });

    // Listen for auth state change from email reset link redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordStrong = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong) {
      setError('Please fulfill all password requirements below.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      setDialog({
        type: 'success',
        title: 'Password Changed Successfully',
        message: 'Your password has been updated. You can now log in with your new password.',
        buttonText: 'Proceed to Login',
        onConfirm: () => navigate('/'),
      });
    } catch (err) {
      const msg = String(err?.message || err || '').toLowerCase();
      let friendlyMessage = 'We could not update your password. Please try again.';
      if (msg.includes('same password') || msg.includes('different')) {
        friendlyMessage = 'Your new password should be different from your old password.';
      }
      setDialog({
        type: 'error',
        title: 'Update Failed',
        message: friendlyMessage,
        buttonText: 'OK',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <ResetPasswordDialog dialog={dialog} onClose={() => setDialog(null)} />

      <div className="login-card">
        <div className="login-header">
          <img src={drainageLogo} alt="DrainAlert" className="login-logo" />
          <h1 className="login-title">Set New Password</h1>
          <p className="login-subtitle">
            Enter your new password below to update your account.
          </p>
        </div>

        {checkingSession ? (
          <div style={{ color: '#64748b', fontSize: '14px', padding: '24px 0' }}>
            Verifying password reset link...
          </div>
        ) : !hasSession ? (
          <div style={{ padding: '20px 0' }}>
            <div
              style={{
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: '#fee2e2',
                padding: '14px',
                borderRadius: '10px',
                marginBottom: '20px',
                lineHeight: '1.5',
              }}
            >
              No active password reset link found or the link has expired. Please request a new link from the login page.
            </div>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#2196F3',
                fontSize: '14px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div
                style={{
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: '600',
                  textAlign: 'left',
                  backgroundColor: '#fee2e2',
                  padding: '10px 14px',
                  borderRadius: '8px',
                }}
              >
                {error}
              </div>
            )}

            {/* New Password Field */}
            <div className="input-group">
              <span className="input-prefix-icon">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-suffix-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm Password Field */}
            <div className="input-group">
              <span className="input-prefix-icon">
                <Lock size={18} />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm New Password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-suffix-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Criteria Checklist */}
            <div
              style={{
                textAlign: 'left',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <span style={{ fontWeight: '600', color: '#475569', marginBottom: '2px' }}>
                Password must contain:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMinLength ? '#10b981' : '#94a3b8' }}>
                <CheckCircle size={14} /> At least 8 characters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasUpperCase ? '#10b981' : '#94a3b8' }}>
                <CheckCircle size={14} /> At least 1 uppercase letter (A-Z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasLowerCase ? '#10b981' : '#94a3b8' }}>
                <CheckCircle size={14} /> At least 1 lowercase letter (a-z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasNumber ? '#10b981' : '#94a3b8' }}>
                <CheckCircle size={14} /> At least 1 number (0-9)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasSymbol ? '#10b981' : '#94a3b8' }}>
                <CheckCircle size={14} /> At least 1 special symbol (!@#$%^&*)
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-btn"
              disabled={isSubmitting}
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                fontWeight: '600',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
            </button>

            <div style={{ marginTop: '8px' }}>
              <Link
                to="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#64748b',
                  fontSize: '13px',
                  textDecoration: 'none',
                  fontWeight: '500',
                }}
              >
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
