import React, { useState, useMemo } from 'react';
import andritzBg from '../assets/andritz-workshop-bg.png';
import andritzLogo from '../assets/andritz-logo.png';
import { isDummyPersonnel } from '../utils/initialData';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Scan,
  Users,
  Cpu,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function LoginView({
  personnel = [],
  adminPassword,
  userPassword,
  onLoginSuccess,
  onResetAdminPassword
}) {
  // Tabs: 'admin' or 'user'
  const [roleTab, setRoleTab] = useState('admin');

  // Filter out any dummy operators
  const cleanPersonnel = useMemo(() => {
    return (personnel || []).filter((p) => !isDummyPersonnel(p));
  }, [personnel]);

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Operator direct access state (No username or password required)
  const [selectedOperatorNo, setSelectedOperatorNo] = useState(cleanPersonnel[0]?.NoPersonal || '');

  // UI state
  const [errorMsg, setErrorMsg] = useState('');

  // Form Submit for Admin
  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const u = adminUsername.trim().toLowerCase();
    const p = adminPass.trim();

    const validAdminUsers = ['admin', 'supervisor', 'isc-admin'];
    const validAdminPass = ['admin', 'isc-admin', 'admin123', adminPassword];

    if (!validAdminUsers.includes(u)) {
      setErrorMsg('Username administrator tidak ditemukan.');
      return;
    }

    if (validAdminPass.includes(p)) {
      onLoginSuccess({
        role: 'admin',
        username: 'Supervisor Admin',
        operator: null
      });
    } else {
      setErrorMsg('Password administrator tidak sesuai.');
    }
  };

  // Direct Entry Handler for Operator (No password required)
  const handleDirectOperatorLogin = () => {
    setErrorMsg('');
    const op = cleanPersonnel.find((item) => String(item.NoPersonal) === String(selectedOperatorNo));
    onLoginSuccess({
      role: 'user',
      username: op ? op.Nama : 'Operator Bengkel',
      operator: op || null
    });
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
              <div className="tab-sub">Akses Manajemen ISC</div>
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
              <div className="tab-sub text-emerald-400 font-semibold">Tautan Langsung (Tanpa Password)</div>
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
              <label className="form-label">Username Administrator:</label>
              <div className="password-input-wrapper">
                <User size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-control pl-9 font-mono font-bold"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Masukkan username admin"
                  autoFocus
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
                  placeholder="Masukkan password admin"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
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
            </div>

            <button
              type="submit"
              className="btn btn-primary-gradient w-full mt-3"
              style={{ height: '44px', fontSize: '0.95rem' }}
            >
              <ShieldCheck size={18} />
              <span>Masuk sebagai Administrator</span>
            </button>
          </form>
        )}

        {/* TAB 2: OPERATOR DIRECT LOGIN (NO USERNAME & NO PASSWORD NEEDED) */}
        {roleTab === 'user' && (
          <div className="login-form-body">
            {/* Quick Informational Notice */}
            <div className="alert-box alert-info flex items-start gap-2.5">
              <Sparkles size={18} className="text-cyan flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong>Akses Bebas Operator Bengkel:</strong>
                <div>Tidak diperlukan username atau kata sandi. Silakan langsung masuk ke Terminal Scanner SAP di bawah.</div>
              </div>
            </div>

            {/* Profile selection if personnel available */}
            {cleanPersonnel.length > 0 && (
              <div className="form-group">
                <label className="form-label">Pilih Profil Operator (Opsional):</label>
                <select
                  className="form-control font-heading font-semibold"
                  value={selectedOperatorNo}
                  onChange={(e) => setSelectedOperatorNo(e.target.value)}
                >
                  <option value="">-- Masuk sebagai Operator Umum (Default) --</option>
                  {cleanPersonnel.map((op) => (
                    <option key={op.NoPersonal} value={op.NoPersonal}>
                      {op.Nama} — No. Personal: {op.NoPersonal} ({op.ProductGroup || 'PKW'})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted mt-1">
                  *Anda dapat memilih nama untuk otomatis mengisi barcode operator di scanner.
                </span>
              </div>
            )}

            {/* Direct Login Button */}
            <button
              type="button"
              className="btn btn-primary-gradient w-full flex items-center justify-center gap-2 mt-2"
              style={{ height: '48px', fontSize: '1rem', fontWeight: 700 }}
              onClick={handleDirectOperatorLogin}
            >
              <Scan size={20} />
              <span>Masuk Langsung sebagai Operator</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Industrial Machine Watermark Tag */}
      <div className="login-machine-tag">
        <Cpu size={14} color="#00A3E0" />
        <span>ANDRITZ PrimeLine™ Compact — Workshop Production Facility</span>
      </div>
    </div>
  );
}
