import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import '../css/login.css';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, Mail, KeyRound } from 'lucide-react';
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
  const [step, setStep] = useState(1); // 1 = Request 6-digit OTP, 2 = Enter OTP & Set New Password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [step1Error, setStep1Error] = useState('');
  const [step1Success, setStep1Success] = useState('');
  const [step2Error, setStep2Error] = useState('');
  const [dialog, setDialog] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { resetPassword, verifyOtpAndResetPassword } = useApp();
  const navigate = useNavigate();

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordStrong = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol;

  // Step 1: Request 6-digit verification code
  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setStep1Error('');
    setStep1Success('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStep1Error('Please enter your account email address.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(cleanEmail);
      setStep1Success('Verification code sent! Please check your email.');
      setStep(2);
    } catch (err) {
      setStep1Error(err?.message || 'Could not send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and update password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setStep2Error('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!cleanEmail) {
      setStep2Error('Please enter your account email address.');
      return;
    }

    if (!cleanOtp || cleanOtp.length < 6) {
      setStep2Error('Please enter the verification code sent to your email.');
      return;
    }

    if (!isPasswordStrong) {
      setStep2Error('Please fulfill all password requirements below.');
      return;
    }

    if (password !== confirmPassword) {
      setStep2Error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtpAndResetPassword({
        email: cleanEmail,
        token: cleanOtp,
        newPassword: password,
      });

      setDialog({
        type: 'success',
        title: 'Password Changed Successfully',
        message: `The password for ${cleanEmail} has been updated. You can now log in with your new password.`,
        buttonText: 'Proceed to Login',
        onConfirm: () => navigate('/'),
      });
    } catch (err) {
      const msg = String(err?.message || err || '').toLowerCase();
      let friendlyMessage = 'We could not update your password. Please try again.';

      if (msg.includes('invalid') || msg.includes('token') || msg.includes('otp')) {
        friendlyMessage = 'The verification code is invalid or has expired. Please check your email or request a new code.';
      } else if (msg.includes('different') || msg.includes('same password')) {
        friendlyMessage = 'Your new password should be different from your old password.';
      } else if (err?.message) {
        friendlyMessage = err.message;
      }

      setStep2Error(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <ResetPasswordDialog dialog={dialog} onClose={() => setDialog(null)} />

      <div className="login-card">
        <div className="login-header">
          <img src={drainageLogo} alt="DrainAlert" className="login-logo" />
          <h1 className="login-title">
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </h1>
          <p className="login-subtitle">
            {step === 1
              ? 'Enter your registered email to receive a verification code.'
              : `Enter the verification code sent to ${email || 'your email'} and set your new password.`}
          </p>
        </div>

        {/* ===================== STEP 1: REQUEST CODE ===================== */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="login-form">
            {step1Error && (
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
                {step1Error}
              </div>
            )}
            {step1Success && (
              <div
                style={{
                  color: '#15803d',
                  fontSize: '13px',
                  fontWeight: '600',
                  textAlign: 'left',
                  backgroundColor: '#dcfce7',
                  padding: '10px 14px',
                  borderRadius: '8px',
                }}
              >
                {step1Success}
              </div>
            )}

            <div className="input-group">
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
                required
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading}
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                fontWeight: '600',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Sending Code...' : 'Send Verification Code'}
            </button>

            {/* Jump to step 2 if code already received */}
            <div style={{ marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2196F3',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Already have a verification code? Enter it here
              </button>
            </div>

            <div style={{ marginTop: '12px' }}>
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

        {/* ===================== STEP 2: ENTER OTP & NEW PASSWORD ===================== */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="login-form">
            {step2Error && (
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
                {step2Error}
              </div>
            )}

            {/* Email Field */}
            <div className="input-group">
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

            {/* Verification Code Field */}
            <div className="input-group">
              <span className="input-prefix-icon">
                <KeyRound size={18} />
              </span>
              <input
                type="text"
                placeholder="Verification Code"
                className="input-field"
                value={otpCode}
                maxLength={10}
                onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                required
                style={{ letterSpacing: '4px', fontWeight: '700', fontSize: '16px' }}
              />
            </div>

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
              disabled={isLoading}
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                fontWeight: '600',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </button>

            {/* Step navigation links */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2196F3',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Resend Code
              </button>
            </div>

            <div style={{ marginTop: '12px' }}>
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
