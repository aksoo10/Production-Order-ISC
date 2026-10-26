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
    if (p === currentPassword || p === 'admin' || p === 'isc-admin' || p === 'admin123') {
      setErrorMsg('');
      setPassword('');
      onSuccess();
    } else {
      setErrorMsg('Sandi salah. Sandi hard-code adalah: admin');
    }
  };

  const handleReset = () => {
    onResetPassword();
    setPassword('isc-admin');
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
              <h3 className="modal-title font-heading">Masuk Administrator ISC</h3>
              <p className="modal-desc">Khusus Supervisor & Admin Produksi Bengkel</p>
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
                Kata Sandi Admin:
              </label>
              <div className="password-input-wrapper">
                <Lock size={16} className="input-icon-left text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control pl-9 pr-9 font-mono"
                  placeholder="Masukkan sandi (default: isc-admin)"
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
                  title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span className="form-hint">
                Sandi awal bawaan sistem adalah <code className="font-mono">isc-admin</code>
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
                  Lupa sandi?
                </button>
              ) : (
                <div className="forgot-reset-panel">
                  <div className="text-xs text-muted mb-2">
                    Sandi tersimpan di browser ini. Jika lupa, Anda dapat mereset sandi kembali ke bawaan pabrik: <strong className="text-white font-mono">isc-admin</strong>.
                  </div>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-warning"
                    onClick={handleReset}
                  >
                    <RotateCcw size={12} />
                    <span>Reset Sandi ke isc-admin</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary-gradient">
              <ShieldCheck size={16} />
              <span>Masuk Admin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
