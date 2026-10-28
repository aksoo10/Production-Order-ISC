import React, { useState } from 'react';
import { Key, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordModal({
  isOpen,
  onClose,
  currentPassword,
  onUpdatePassword
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (oldPassword !== currentPassword) {
      setErrorMsg('Sandi lama tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Sandi baru harus minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi sandi baru tidak sesuai.');
      return;
    }

    onUpdatePassword(newPassword);
    setSuccessMsg('Sandi berhasil diperbarui!');
    setTimeout(() => {
      onClose();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('');
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="auth-icon-badge">
              <Key size={20} color="#00A3E0" />
            </div>
            <div>
              <h3 className="modal-title font-heading">Ganti Kata Sandi Admin</h3>
              <p className="modal-desc">Perbarui sandi akses administrator bengkel</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div className="alert-box alert-danger">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert-box alert-success">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Sandi Lama Saat Ini:</label>
              <input
                type="password"
                className="form-control font-mono"
                placeholder="Masukkan sandi lama"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sandi Baru (Minimal 6 Karakter):</label>
              <input
                type="password"
                className="form-control font-mono"
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ulangi Sandi Baru:</label>
              <input
                type="password"
                className="form-control font-mono"
                placeholder="Ketik ulang sandi baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary-gradient">
              <Key size={16} />
              <span>Ganti Sandi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
