import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/useApp';
import '../css/login.css';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import drainageLogo from '../assets/drainage_clean.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useApp();
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
      setError(loginError.message || 'Unable to login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
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
            <a href="#forgot" className="forgot-pwd-link" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to your registered email.'); }}>
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
