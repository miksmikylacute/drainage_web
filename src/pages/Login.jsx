import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/useApp';
import '../css/login.css';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
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

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { resetPassword, signIn } = useApp();
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

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Enter your email before requesting a password reset.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await resetPassword(username.trim());
      setDialog({
        type: 'success',
        title: 'Password Reset Sent',
        message: 'If this email is registered, a password reset link will arrive shortly.'
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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <LoginDialog dialog={dialog} onClose={() => setDialog(null)} />
      <div className="login-card">
        <div className="login-header">
          <img src={drainageLogo} alt="Drainage Reporting" className="login-logo" />
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
            <a href="#forgot" className="forgot-pwd-link" onClick={handlePasswordReset}>
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
