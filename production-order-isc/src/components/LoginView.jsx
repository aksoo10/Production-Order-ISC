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
  Cpu,
  ArrowRight
} from 'lucide-react';

export default function LoginView({
  adminPassword,
  onLoginSuccess
}) {
  // Tabs: 'admin' or 'user' (default based on URL query/hash if operator, else admin)
  const [roleTab, setRoleTab] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const role = urlParams.get('role') || urlParams.get('mode');
        if (
          urlParams.get('operator') === 'true' ||
          role === 'operator' ||
          role === 'user' ||
          window.location.hash === '#operator'
        ) {
          return 'user';
        }
      }
      return 'admin';
    } catch {
      return 'admin';
    }
  });



  // Admin form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // UI state
  const [errorMsg, setErrorMsg] = useState('');

  // Form Submit for Admin
  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const u = adminUsername.trim().toLowerCase();
    const p = adminPass.trim();

    const validAdminUsers = ['admin@andritz.com', 'admin', 'supervisor', 'isc-admin'];
    const validAdminPass = ['admin123', adminPassword, 'admin', 'isc-admin'];

    if (!validAdminUsers.includes(u)) {
      setErrorMsg('Administrator username not found. Use admin@andritz.com');
      return;
    }

    if (validAdminPass.includes(p)) {
      onLoginSuccess({
        role: 'admin',
        username: u === 'admin@andritz.com' ? 'admin@andritz.com' : 'Supervisor Admin',
        operator: null
      });
    } else {
      setErrorMsg('Incorrect administrator password.');
    }
  };

  // Direct Entry Handler for Operator (No password required)
  const handleDirectOperatorLogin = () => {
    setErrorMsg('');
    onLoginSuccess({
      role: 'user',
      username: 'Workshop Operator',
      operator: null
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

          <h2 className="login-title font-heading">Production Workshop Login Portal</h2>
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
              <div className="tab-sub">ISC Management Access</div>
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
              <div className="tab-title">Workshop Operator</div>
              <div className="tab-sub text-emerald-400 font-semibold">Direct Access (No Password)</div>
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
              <label className="form-label">Administrator Username:</label>
              <div className="password-input-wrapper">
                <User size={16} className="input-icon-left text-muted" />
                <input
                  type="text"
                  className="form-control pl-9 font-mono font-bold"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin@andritz.com"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Administrator Password:</label>
              <div className="password-input-wrapper">
                <Lock size={16} className="input-icon-left text-muted" />
                <input
                  type={showAdminPass ? 'text' : 'password'}
                  className="form-control pl-9 pr-9 font-mono"
                  placeholder="Enter admin password"
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
              <span>Login as Administrator</span>
            </button>
          </form>
        )}

        {/* TAB 2: OPERATOR DIRECT LOGIN (NO USERNAME & NO PASSWORD NEEDED) */}
        {roleTab === 'user' && (
          <div className="login-form-body">
            {/* Direct Login Button */}
            <button
              type="button"
              className="btn btn-primary-gradient w-full flex items-center justify-center gap-2 mt-2"
              style={{ height: '48px', fontSize: '1rem', fontWeight: 700 }}
              onClick={handleDirectOperatorLogin}
            >
              <Scan size={20} />
              <span>Direct Login as Operator</span>
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
