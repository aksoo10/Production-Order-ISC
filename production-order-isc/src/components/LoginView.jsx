import React, { useState } from 'react';
import andritzBg from '../assets/andritz-workshop-bg.png';
import andritzLogo from '../assets/andritz-logo.png';
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
  Key,
  Cpu,
  Zap,
  ArrowRight
} from 'lucide-react';

export default function LoginView({
  personnel,
  adminPassword,
  userPassword,
  onLoginSuccess,
  onResetAdminPassword
}) {
  // Tabs: 'admin' or 'user'
  const [roleTab, setRoleTab] = useState('admin');

  // Admin form state (Hardcoded default: admin / admin)
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPass, setAdminPass] = useState('admin');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Operator form state (Hardcoded default: user / user)
  const [operatorUsername, setOperatorUsername] = useState('user');
  const [selectedOperatorNo, setSelectedOperatorNo] = useState(personnel[0]?.NoPersonal || '');
  const [operatorPass, setOperatorPass] = useState('user');
  const [showOperatorPass, setShowOperatorPass] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState('');

  // ---------------------------------------------------------------------------
  // HARD-CODED LOGIN LOGIC
  // ---------------------------------------------------------------------------

  // Direct 1-Click Fast Login
  const handleQuickLogin = (role) => {
    setErrorMsg('');
    if (role === 'admin') {
      onLoginSuccess({
        role: 'admin',
        username: 'Supervisor Admin',
        operator: null
      });
    } else {
      const defaultOp = personnel.find((p) => String(p.NoPersonal) === String(selectedOperatorNo)) ||
        personnel[0] || {
          Nama: 'Operator Bengkel',
          NoPersonal: '2324',
          ProductGroup: 'PKW'
        };
      onLoginSuccess({
        role: 'user',
        username: defaultOp.Nama,
        operator: defaultOp
      });
    }
  };

  // Form Submit for Admin
  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const u = adminUsername.trim().toLowerCase();
    const p = adminPass.trim();

    // Hard-coded checks for Admin
    const validAdminUsers = ['admin', 'supervisor', 'isc-admin'];
    const validAdminPass = ['admin', 'isc-admin', 'admin123', adminPassword];

    if (!validAdminUsers.includes(u)) {
      setErrorMsg('Username admin salah. Gunakan username: admin');
      return;
    }

    if (validAdminPass.includes(p)) {
      onLoginSuccess({
        role: 'admin',
        username: 'Supervisor Admin',
        operator: null
      });
    } else {
      setErrorMsg('Password admin salah. Password hard-code adalah: admin (atau isc-admin)');
    }
  };

  // Form Submit for Operator
  const handleOperatorSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const u = operatorUsername.trim().toLowerCase();
    const p = operatorPass.trim();

    // Check operator profile if selected
    const op = personnel.find((item) => String(item.NoPersonal) === String(selectedOperatorNo)) ||
      personnel[0] || {
        Nama: 'Operator Bengkel',
        NoPersonal: '2324',
        ProductGroup: 'PKW'
      };

    // Hard-coded checks for Operator/User
    const validOperatorUsers = ['user', 'operator', 'bengkel', 'isc-user', 'isc-operator', String(op.NoPersonal).toLowerCase(), op.Nama.toLowerCase()];
    const validOperatorPass = ['user', 'operator', '1234', '123456', 'isc-operator', 'isc-user', String(op.NoPersonal), userPassword];

    // Accept standard 'user' / 'user' or 'operator' / 'operator' or valid PIN
    if (
      validOperatorPass.includes(p) ||
      p === 'user' ||
      p === 'operator' ||
      p === '1234'
    ) {
      onLoginSuccess({
        role: 'user',
        username: op.Nama,
        operator: op
      });
    } else {
      setErrorMsg('Password operator salah. Password hard-code adalah: user (atau 1234)');
    }
  };

  return (
    <div
      className="login-page-wrapper"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(0, 26, 48, 0.78) 0%, rgba(0, 15, 30, 0.72) 100%), url(${andritzBg})`,
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
          <div className="andritz-logo-container justify-center mb-3">
            <img
              src={andritzLogo}
              alt="ANDRITZ"
              className="andritz-brand-logo-img-lg"
            />
            <span className="andritz-logotype-cyan" style={{ fontSize: '1.6rem', fontWeight: 800 }}>ISC</span>
          </div>

          <h2 className="login-title font-heading">Portal Masuk Bengkel Produksi</h2>
          <p className="login-subtitle">
            Sistem Pelacak Order Produksi & Barcode Konfirmasi SAP
          </p>
        </div>

        {/* Hardcoded Credentials Quick Info Box */}
        <div
          style={{
            backgroundColor: 'rgba(0, 163, 224, 0.12)',
            border: '1px solid rgba(0, 163, 224, 0.35)',
            borderRadius: '8px',
            padding: '10px 14px',
            margin: '0 0 14px 0',
            fontSize: '0.8rem'
          }}
        >
          <div className="flex items-center gap-1.5 font-bold text-cyan mb-1.5" style={{ fontSize: '0.78rem' }}>
            <Key size={14} />
            <span>AKUN LOGIN HARD-CODED (SIAP PAKAI):</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              style={{
                background: 'rgba(0, 26, 48, 0.6)',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: roleTab === 'admin' ? '1px solid var(--atz-cyan)' : '1px solid rgba(255,255,255,0.08)'
              }}
              onClick={() => {
                setRoleTab('admin');
                setAdminUsername('admin');
                setAdminPass('admin');
                setErrorMsg('');
              }}
              title="Klik untuk memilih akun Admin"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>👑 Admin</span>
                <span className="text-cyan font-mono text-xs">PILIH</span>
              </div>
              <div className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>
                user: <strong className="text-cyan">admin</strong> / pass: <strong className="text-cyan">admin</strong>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 26, 48, 0.6)',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: roleTab === 'user' ? '1px solid var(--atz-cyan)' : '1px solid rgba(255,255,255,0.08)'
              }}
              onClick={() => {
                setRoleTab('user');
                setOperatorUsername('user');
                setOperatorPass('user');
                setErrorMsg('');
              }}
              title="Klik untuk memilih akun Operator"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>👷 Operator</span>
                <span className="text-cyan font-mono text-xs">PILIH</span>
              </div>
              <div className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>
                user: <strong className="text-cyan">user</strong> / pass: <strong className="text-cyan">user</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Role Switcher Tabs */}
        <div className="login-role-tabs">
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
              <div className="tab-sub">admin / admin</div>
            </div>
          </button>

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
              <div className="tab-sub">user / user</div>
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

        {/* TAB 1: ADMIN LOGIN FORM */}
        {roleTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="login-form-body">
            <div className="form-group">
              <label className="form-label">Username Admin:</label>
              <div className="password-input-wrapper">
                <User size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-control pl-9 font-mono font-bold"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password Administrator:</label>
              <div className="password-input-wrapper">
                <Lock size={16} className="input-icon-left text-muted" />
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  className="form-control pl-9 pr-9 font-mono"
                  placeholder="admin"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowAdminPass(!showAdminPass)}
                >
                  {showAdminPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span className="form-hint">
                Password hard-code: <code className="font-mono text-cyan">admin</code> (atau <code>isc-admin</code>)
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary-gradient w-full mt-2"
              style={{ height: '44px', fontSize: '0.95rem' }}
            >
              <ShieldCheck size={18} />
              <span>Masuk sebagai Administrator</span>
            </button>

            {/* 1-Click Instant Login */}
            <button
              type="button"
              className="btn btn-outline w-full mt-2 flex items-center justify-center gap-1.5 text-xs"
              style={{ height: '36px' }}
              onClick={() => handleQuickLogin('admin')}
            >
              <Zap size={14} className="text-amber-400" />
              <span>1-Klik Masuk Langsung (Bypass Admin)</span>
            </button>
          </form>
        )}

        {/* TAB 2: OPERATOR LOGIN FORM */}
        {roleTab === 'user' && (
          <form onSubmit={handleOperatorSubmit} className="login-form-body">
            <div className="form-group">
              <label className="form-label">Username Operator:</label>
              <div className="password-input-wrapper">
                <User size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-control pl-9 font-mono font-bold"
                  value={operatorUsername}
                  onChange={(e) => setOperatorUsername(e.target.value)}
                  placeholder="user"
                  required
                />
              </div>
            </div>

            {/* Optional profile selection */}
            <div className="form-group">
              <label className="form-label">Profil Operator (Opsional):</label>
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
              <label className="form-label">Password Operator:</label>
              <div className="password-input-wrapper">
                <Lock size={16} className="input-icon-left text-muted" />
                <input
                  type={showOperatorPass ? 'text' : 'password'}
                  className="form-control pl-9 pr-9 font-mono"
                  placeholder="user"
                  value={operatorPass}
                  onChange={(e) => setOperatorPass(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowOperatorPass(!showOperatorPass)}
                >
                  {showOperatorPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span className="form-hint">
                Password hard-code: <code className="font-mono text-cyan">user</code> (atau <code>1234</code>)
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary-gradient w-full mt-2"
              style={{ height: '44px', fontSize: '0.95rem' }}
            >
              <Scan size={18} />
              <span>Masuk sebagai Operator</span>
            </button>

            {/* 1-Click Instant Login */}
            <button
              type="button"
              className="btn btn-outline w-full mt-2 flex items-center justify-center gap-1.5 text-xs"
              style={{ height: '36px' }}
              onClick={() => handleQuickLogin('user')}
            >
              <Zap size={14} className="text-amber-400" />
              <span>1-Klik Masuk Langsung (Bypass Operator)</span>
            </button>
          </form>
        )}

        {/* Credentials Helper Pill Footer */}
        <div className="login-card-footer">
          <div className="credentials-info-box">
            <Key size={14} className="text-cyan flex-shrink-0" />
            <div className="credentials-text">
              <span><strong>Admin:</strong> <code>admin</code> / <code>admin</code></span>
              <span className="bullet-sep">•</span>
              <span><strong>Operator:</strong> <code>user</code> / <code>user</code></span>
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
