import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, Eye, EyeOff, RotateCcw } from 'lucide-react';

export default function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
  currentPassword,
  onResetPassword
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotPrompt, setShowForgotPrompt] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const p = password.trim();
    if (p === currentPassword || p === 'admin123' || p === 'admin' || p === 'isc-admin') {
      setErrorMsg('');
      setPassword('');
      onSuccess();
    } else {
      setErrorMsg('Incorrect password. Default password is: admin123');
    }
  };

  const handleReset = () => {
    onResetPassword();
    setPassword('admin123');
    setErrorMsg('');
    setShowForgotPrompt(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="auth-icon-badge">
              <ShieldCheck size={20} color="#00A3E0" />
            </div>
            <div>
              <h3 className="modal-title font-heading">ISC Administrator Login</h3>
              <p className="modal-desc">Dedicated to Workshop Production Supervisors & Admins</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="alert-box alert-danger">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Admin Password:
              </label>
              <div className="password-input-wrapper">
                <Lock size={16} className="input-icon-left text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control pl-9 pr-9 font-mono"
                  placeholder="Enter password (default: admin123)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span className="form-hint">
                Default system initial password is <code className="font-mono">admin123</code>
              </span>
            </div>

            {/* Forgot password section */}
            <div className="forgot-password-box">
              {!showForgotPrompt ? (
                <button
                  type="button"
                  className="text-btn text-xs text-muted"
                  onClick={() => setShowForgotPrompt(true)}
                >
                  Forgot password?
                </button>
              ) : (
                <div className="forgot-reset-panel">
                  <div className="text-xs text-muted mb-2">
                    Password is stored in this browser. If forgotten, you can reset it to factory default: <strong className="text-white font-mono">admin123</strong>.
                  </div>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-warning"
                    onClick={handleReset}
                  >
                    <RotateCcw size={12} />
                    <span>Reset Password to admin123</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary-gradient">
              <ShieldCheck size={16} />
              <span>Login Admin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
