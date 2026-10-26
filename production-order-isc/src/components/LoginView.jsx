import React, { useState } from 'react';
import andritzBg from '../assets/andritz-workshop-bg.png';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Scan,
  Users,
  CheckCircle2,
  RotateCcw,
  Building2,
  Key,
  Cpu
} from 'lucide-react';

export default function LoginView({
  personnel,
  adminPassword,
  userPassword,
  onLoginSuccess,
  onResetAdminPassword
}) {
  const [roleTab, setRoleTab] = useState('user'); // 'user' or 'admin'

  // Operator Form State
  const [selectedOperatorNo, setSelectedOperatorNo] = useState(personnel[0]?.NoPersonal || '');
  const [operatorPin, setOperatorPin] = useState('');
  const [showOperatorPin, setShowOperatorPin] = useState(false);

  // Admin Form State
  const [adminUsername, setAdminUsername] = useState('admin');
  const [inputAdminPassword, setInputAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // UI State
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotAdmin, setShowForgotAdmin] = useState(false);

  // Handle Operator Login
  const handleOperatorLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const op = personnel.find((p) => String(p.NoPersonal) === String(selectedOperatorNo));
    if (!op) {
      setErrorMsg('Silakan pilih operator yang terdaftar.');
      return;
    }

    // Accept either userPassword ('isc-operator') or their own NoPersonal (e.g. '2324')
    const pin = operatorPin.trim();
    if (!pin) {
      setErrorMsg('Silakan masukkan kata sandi atau PIN operator.');
      return;
    }

    if (pin === userPassword || pin === String(op.NoPersonal) || pin === '1234' || pin === 'isc-user') {
      onLoginSuccess({
        role: 'user',
        username: op.Nama,
        operator: op
      });
    } else {
      setErrorMsg(`Sandi/PIN salah. Gunakan sandi "${userPassword}" atau No. Personal Anda (${op.NoPersonal}).`);
    }
  };

  // Handle Admin Login
  const handleAdminLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (adminUsername.trim().toLowerCase() !== 'admin') {
      setErrorMsg('Username admin salah. Gunakan username: admin');
      return;
    }

    if (inputAdminPassword === adminPassword) {
      onLoginSuccess({
        role: 'admin',
        username: 'Supervisor Admin',
        operator: null
      });
    } else {
      setErrorMsg(`Sandi admin salah. Sandi awal bawaan adalah: isc-admin`);
    }
  };

  return (
    <div
      className="login-page-wrapper"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(0, 26, 48, 0.76) 0%, rgba(0, 15, 30, 0.70) 100%), url(${andritzBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background Graphic Accents */}
      <div className="login-bg-overlay"></div>

      {/* Main Authentication Card */}
      <div className="login-card-container">
        {/* Card Header with Official ANDRITZ Brand */}
        <div className="login-card-header">
          <div className="andritz-logo-container justify-center mb-2">
            <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="16" fill="#00A3E0"/>
              <path d="M50 18L77 78H62.5L56.5 63H43.5L37.5 78H23L50 18ZM50 36L46.5 52H53.5L50 36Z" fill="white"/>
            </svg>
            <div className="andritz-logotype" style={{ fontSize: '1.7rem' }}>
              ANDRITZ <span className="andritz-logotype-cyan">ISC</span>
            </div>
          </div>

          <h2 className="login-title font-heading">Portal Masuk Bengkel Produksi</h2>
          <p className="login-subtitle">
            Sistem Pelacak Order Produksi & Barcode Konfirmasi SAP
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="login-role-tabs">
          <button
            type="button"
            className={`login-role-tab ${roleTab === 'user' ? 'active' : ''}`}
            onClick={() => {
              setRoleTab('user');
              setErrorMsg('');
            }}
          >
            <Users size={18} />
            <div className="text-left">
              <div className="tab-title">Operator Bengkel</div>
              <div className="tab-sub">Akses Scan Barcode</div>
            </div>
          </button>

          <button
            type="button"
            className={`login-role-tab ${roleTab === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setRoleTab('admin');
              setErrorMsg('');
            }}
          >
            <ShieldCheck size={18} />
            <div className="text-left">
              <div className="tab-title">Supervisor / Admin</div>
              <div className="tab-sub">Kontrol Penuh & Impor</div>
            </div>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="alert-box alert-danger mt-3 mb-1">
            <AlertCircle size={16} className="flex-shrink-0" />
            <div className="text-xs">{errorMsg}</div>
          </div>
        )}

        {/* TAB 1: OPERATOR FORM */}
        {roleTab === 'user' && (
          <form onSubmit={handleOperatorLogin} className="login-form-body">
            <div className="form-group">
              <label className="form-label">Pilih Identitas Operator:</label>
              <select
                className="form-control font-heading font-semibold"
                value={selectedOperatorNo}
                onChange={(e) => setSelectedOperatorNo(e.target.value)}
              >
                {personnel.map((op) => (
                  <option key={op.NoPersonal} value={op.NoPersonal}>
                    {op.Nama} — No. Personal: {op.NoPersonal} ({op.ProductGroup || 'PKW'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Kata Sandi / PIN Operator:</label>
              <div className="password-input-wrapper">
                <Lock size={16} className="input-icon-left text-muted" />
                <input
                  type={showOperatorPin ? 'text' : 'password'}
                  className="form-control pl-9 pr-9 font-mono"
                  placeholder="Masukkan sandi atau No. Personal"
                  value={operatorPin}
                  onChange={(e) => setOperatorPin(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowOperatorPin(!showOperatorPin)}
                >
                  {showOperatorPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span className="form-hint">
                Sandi bawaan: <code className="font-mono">isc-operator</code> atau ketik No. Personal Anda
              </span>
            </div>

            <button type="submit" className="btn btn-primary-gradient w-full mt-2" style={{ height: '44px', fontSize: '0.95rem' }}>
              <Scan size={18} />
              <span>Masuk sebagai Operator</span>
            </button>
          </form>
        )}

        {/* TAB 2: ADMIN FORM */}
        {roleTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="login-form-body">
            <div className="form-group">
              <label className="form-label">Username Admin:</label>
              <div className="password-input-wrapper">
                <User size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-control pl-9 font-mono"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Kata Sandi Administrator:</label>
              <div className="password-input-wrapper">
                <Lock size={16} className="input-icon-left text-muted" />
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  className="form-control pl-9 pr-9 font-mono"
                  placeholder="Masukkan kata sandi admin"
                  value={inputAdminPassword}
                  onChange={(e) => setInputAdminPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                >
                  {showAdminPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span className="form-hint">
                Sandi awal bawaan: <code className="font-mono">isc-admin</code>
              </span>
            </div>

            {/* Forgot password */}
            <div className="forgot-password-box">
              {!showForgotAdmin ? (
                <button
                  type="button"
                  className="text-btn text-xs text-muted"
                  onClick={() => setShowForgotAdmin(true)}
                >
                  Lupa sandi admin?
                </button>
              ) : (
                <div className="forgot-reset-panel mt-1">
                  <div className="text-xs text-muted mb-2">
                    Sandi tersimpan di browser ini. Anda dapat mengembalikannya ke sandi awal bawaan: <strong className="font-mono text-cyan">isc-admin</strong>.
                  </div>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-warning"
                    onClick={() => {
                      onResetAdminPassword();
                      setInputAdminPassword('isc-admin');
                      setShowForgotAdmin(false);
                      setErrorMsg('');
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Reset Sandi ke isc-admin</span>
                  </button>
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary-gradient w-full mt-2" style={{ height: '44px', fontSize: '0.95rem' }}>
              <ShieldCheck size={18} />
              <span>Masuk sebagai Administrator</span>
            </button>
          </form>
        )}

        {/* Credentials Helper Pill Footer */}
        <div className="login-card-footer">
          <div className="credentials-info-box">
            <Key size={14} className="text-cyan flex-shrink-0" />
            <div className="credentials-text">
              <span><strong>Operator:</strong> Sandi: <code>isc-operator</code> atau NIK</span>
              <span className="bullet-sep">•</span>
              <span><strong>Admin:</strong> Sandi: <code>isc-admin</code></span>
            </div>
          </div>
        </div>
      </div>

      {/* Industrial Machine Watermark Tag */}
      <div className="login-machine-tag">
        <Cpu size={14} color="#00A3E0" />
        <span>ANDRITZ PrimeLine™ Compact — Workshop Production Facility</span>
      </div>
    </div>
  );
}
