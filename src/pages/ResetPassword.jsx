import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { supabase } from '../lib/supabaseClient';
import '../css/login.css';
import { Lock, Eye, EyeOff, Mail, KeyRound, CheckCircle, ArrowLeft, Send } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [dialog, setDialog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword, updatePassword, verifyOtpAndResetPassword } = useApp();
  const navigate = useNavigate();

  // Listen for active recovery session (if user arrived from clicking email link)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasActiveSession(true);
        if (session.user?.email) {
          setEmail(session.user.email);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasActiveSession(true);
        if (session.user?.email) {
          setEmail(session.user.email);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Countdown timer for resending code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordStrong = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol;

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Please enter your registered email address first.');
      return;
    }

    setError('');
    setIsSendingCode(true);

    try {
      await resetPassword(email.trim());
      setCodeSent(true);
      setResendCooldown(60);
      setInfoMessage(`Verification code sent to ${email.trim()}. Please check your email inbox.`);
    } catch (err) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Too many requests. Please wait a few moments before trying again.');
      } else {
        setError('Could not send verification code. Please check your email and try again.');
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!hasActiveSession && !token.trim()) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

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
      if (hasActiveSession) {
        // Direct update via authenticated recovery session from email link
        await updatePassword(password);
      } else {
        // Verification via 6-digit code entered by user
        await verifyOtpAndResetPassword({
          email: email.trim(),
          token: token.trim(),
          newPassword: password,
        });
      }

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
      if (msg.includes('token has expired') || msg.includes('expired')) {
        friendlyMessage = 'This verification code has expired. Please click "Resend Code" for a new one.';
      } else if (msg.includes('invalid') || msg.includes('token') || msg.includes('otp')) {
        friendlyMessage = 'Invalid verification code. Please check the 6-digit code in your email.';
      } else if (msg.includes('same password') || msg.includes('different')) {
        friendlyMessage = 'Your new password should be different from your old password.';
      }
      setDialog({
        type: 'error',
        title: 'Reset Failed',
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

      <div className="login-card" style={{ maxWidth: '440px' }}>
        <div className="login-header">
          <img src={drainageLogo} alt="DrainAlert" className="login-logo" />
          <h1 className="login-title">Reset Password</h1>
          <p className="login-subtitle">
            Enter your email to receive a code, then set your new password.
          </p>
        </div>

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

          {infoMessage && !error && (
            <div
              style={{
                color: '#0284c7',
                fontSize: '13px',
                fontWeight: '500',
                textAlign: 'left',
                backgroundColor: '#e0f2fe',
                padding: '10px 14px',
                borderRadius: '8px',
              }}
            >
              {infoMessage}
            </div>
          )}

          {/* Email input with inline Send Code button */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <span className="input-prefix-icon">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="Registered Email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={isSendingCode || resendCooldown > 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: resendCooldown > 0 ? '#94a3b8' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: resendCooldown > 0 || isSendingCode ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Send size={14} />
              {isSendingCode
                ? 'Sending...'
                : resendCooldown > 0
                ? `${resendCooldown}s`
                : codeSent
                ? 'Resend'
                : 'Send Code'}
            </button>
          </div>

          {/* 6-Digit Code input (hidden only if user arrived via active session link) */}
          {!hasActiveSession && (
            <div className="input-group">
              <span className="input-prefix-icon">
                <KeyRound size={18} />
              </span>
              <input
                type="text"
                placeholder="6-Digit Verification Code"
                className="input-field"
                maxLength={8}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required={!hasActiveSession}
                style={{ letterSpacing: token ? '3px' : 'normal', fontWeight: '600' }}
              />
            </div>
          )}

          {/* New Password input */}
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

          {/* Confirm Password input */}
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

          {/* Password checklist */}
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
            {isSubmitting ? 'Updating Password...' : 'Reset Password'}
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
      </div>
    </div>
  );
}
