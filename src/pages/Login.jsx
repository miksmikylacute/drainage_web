import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/useApp';
import '../css/login.css';
import { User, Lock, Eye, EyeOff, Mail } from 'lucide-react';
import drainageLogo from '../assets/drainage_clean.png';

function getFriendlyAuthMessage(error, fallback) {
  const message = String(error?.message || error || '').toLowerCase();

  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'No matching admin account was found. Please check your email and password.';
  }

  if (message.includes('resident accounts cannot access')) {
    return 'This account is registered for the mobile app and cannot access the admin dashboard.';
  }

  if (message.includes('disabled')) {
    return 'This admin account is disabled. Please contact the super admin.';
  }

  if (message.includes('unable to load') || message.includes('no rows')) {
    return 'Your admin profile was not found. Please contact the super admin.';
  }

  if (message.includes('email')) {
    return 'Please enter a valid registered email address.';
  }

  return fallback;
}

function LoginDialog({ dialog, onClose }) {
  if (!dialog) return null;

  return (
    <div className="login-dialog-backdrop" role="presentation">
      <div className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-dialog-title">
        <div className={`login-dialog-icon ${dialog.type === 'success' ? 'is-success' : 'is-error'}`}>
          {dialog.type === 'success' ? '✓' : '!'}
        </div>
        <h2 id="login-dialog-title">{dialog.title}</h2>
        <p>{dialog.message}</p>
        <button type="button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

function ForgotPasswordModal({ isOpen, initialEmail, onClose, onSubmit, isSubmitting }) {
  const [email, setEmail] = useState(initialEmail || '');

  if (!isOpen) return null;

  return (
    <div className="login-dialog-backdrop" role="presentation">
      <div className="login-dialog" role="dialog" aria-modal="true" style={{ maxWidth: '400px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Reset Password</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          Enter your registered email address to receive a password reset link.
        </p>
        <div className="input-group" style={{ marginBottom: '16px' }}>
          <span className="input-prefix-icon">
            <Mail size={18} />
          </span>
          <input
            type="email"
            placeholder="Registered Email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#e2e8f0',
              color: '#334155',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !email.trim()}
            onClick={() => onSubmit(email.trim())}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              cursor: isSubmitting || !email.trim() ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Sending...' : 'Send Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { signIn, resetPassword } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signIn(username.trim(), password);
      navigate('/dashboard');
    } catch (loginError) {
      setDialog({
        type: 'error',
        title: 'Login Failed',
        message: getFriendlyAuthMessage(
          loginError,
          'We could not sign you in. Please try again.'
        )
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetLink = async (targetEmail) => {
    setIsSendingReset(true);
    setError('');

    try {
      await resetPassword(targetEmail);
      setForgotModalOpen(false);
      setDialog({
        type: 'success',
        title: 'Reset Link Sent',
        message: `A password reset link has been sent to ${targetEmail}. Please check your email inbox to change your password.`
      });
    } catch (resetError) {
      setDialog({
        type: 'error',
        title: 'Reset Failed',
        message: getFriendlyAuthMessage(
          resetError,
          'We could not send a password reset email. Please try again.'
        )
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const onForgotPasswordClick = (e) => {
    e.preventDefault();
    if (username.trim()) {
      handleSendResetLink(username.trim());
    } else {
      setForgotModalOpen(true);
    }
  };

  return (
    <div className="login-container">
      <LoginDialog dialog={dialog} onClose={() => setDialog(null)} />
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        initialEmail={username.trim()}
        onClose={() => setForgotModalOpen(false)}
        onSubmit={handleSendResetLink}
        isSubmitting={isSendingReset}
      />
      <div className="login-card">
        <div className="login-header">
          <img src={drainageLogo} alt="DrainAlert" className="login-logo" />
          <h1 className="login-title">Admin Login</h1>
          <p className="login-subtitle">Please login to continue</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '600', textAlign: 'left', marginBottom: '-10px' }}>
              {error}
            </div>
          )}

          <div className="input-group">
            <span className="input-prefix-icon">
              <User size={20} />
            </span>
            <input
              type="text"
              placeholder="Email"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="input-group">
            <span className="input-prefix-icon">
              <Lock size={20} />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="input-suffix-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="login-forgot-pwd">
            <a
              href="#forgot"
              className="forgot-pwd-link"
              onClick={onForgotPasswordClick}
              style={{ color: "#2196F3" }}
            >
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="login-btn">
            {isSubmitting ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
