import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Monitor,
  ShieldCheck,
  CheckCircle2,
  Scan,
  RefreshCw,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

export default function GuideView() {
  const [activeSection, setActiveSection] = useState('A');

  const sections = [
    { id: 'A', title: 'A. Excel Data Preparation', icon: FileSpreadsheet },
    { id: 'B', title: 'B. Page Setup & Offline Mode', icon: Monitor },
    { id: 'C', title: 'C. Initial Admin Setup', icon: ShieldCheck },
    { id: 'D', title: 'D. Pre-Deployment Testing', icon: CheckCircle2 },
    { id: 'E', title: 'E. Workshop Monitor Installation', icon: Monitor },
    { id: 'F', title: 'F. Routine Operator Usage', icon: Scan },
    { id: 'G', title: 'G. Regular Admin Updates', icon: RefreshCw },
    { id: 'H', title: 'H. Common Issues & Troubleshooting', icon: AlertTriangle }
  ];

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <h2 className="view-title">Official ISC Workshop Operational & SOP Guide</h2>
          <p className="view-subtitle">
            Standard operational procedures for SAP data preparation, scanner monitor setup, and order administration
          </p>
        </div>
      </div>

      <div className="guide-view-layout">
        {/* Section List Left */}
        <div className="guide-nav-column">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                className={`guide-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{sec.title}</span>
                <ChevronRight size={14} className="opacity-40" />
              </button>
            );
          })}
        </div>

        {/* Section Detail Right */}
        <div className="guide-content-column">
          {activeSection === 'A' && (
            <div className="guide-card">
              <h3 className="guide-card-title">A. Data Preparation (SAP Export to Excel)</h3>
              <ul className="help-bullet-list">
                <li><strong>Export from SAP to Excel:</strong> Extract production order number, step sequence, confirmation number, and status.</li>
                <li><strong>Row Filtering:</strong> One row = one operation step from one order. Exclude unneeded background steps to focus on primary workshop tasks.</li>
                <li><strong>Order Sheet:</strong> Name the sheet exactly <code className="font-mono">Order</code> with columns:
                  <div className="code-snippet font-mono">NoProduksi, ProductGroup, Langkah, NamaLangkah, NoKonfirmasi, Status</div>
                </li>
                <li><strong>Steps:</strong> Sequential numbers (1, 2, 3, etc.).</li>
                <li><strong>Status:</strong> Use <code className="font-mono text-emerald-600 font-bold">Completed</code> (or <code className="font-mono text-emerald-600 font-bold">Selesai</code>) or <code className="font-mono text-cyan-600 font-bold">In Progress</code> (or <code className="font-mono text-cyan-600 font-bold">Berjalan</code>). Values other than Completed/Selesai are treated as incomplete.</li>
                <li><strong>Number Format:</strong> Must be formatted as <strong className="text-main">Text</strong> in Excel so leading zeros (e.g. 00123) are preserved.</li>
                <li><strong>Personnel Sheet:</strong> Name the sheet exactly <code className="font-mono">Personel</code> with columns:
                  <div className="code-snippet font-mono">NoPersonal, Nama, ProductGroup</div>
                  <em>Example: NoPersonal (1001, PKW), NoPersonal (1002, PULP).</em>
                </li>
                <li><strong>Spelling Notice:</strong> Sheet names and column headers must match exactly; otherwise, file validation will fail.</li>
              </ul>
            </div>
          )}

          {activeSection === 'B' && (
            <div className="guide-card">
              <h3 className="guide-card-title">B. Page Setup & Offline Mode</h3>
              <ul className="help-bullet-list">
                <li>Designed for easy access by workshop terminals via the local network (LAN) or directly in a local browser.</li>
                <li><strong>Full Offline Mode:</strong> Excel parsing libraries (SheetJS) and barcode generators (JsBarcode) are bundled locally. Runs 100% offline without internet access.</li>
                <li>Deployable directly on the ISC local server or local Laragon instance (<code>c:\laragon\www\Production-Order-ISC\</code>).</li>
              </ul>
            </div>
          )}

          {activeSection === 'C' && (
            <div className="guide-card">
              <h3 className="guide-card-title">C. Admin Setup (Initial Setup)</h3>
              <ol className="help-step-list">
                <li>Open the application URL in your browser.</li>
                <li>Click the <strong className="text-cyan">Admin Login</strong> button in the bottom sidebar.</li>
                <li>Enter username: <code className="font-mono font-bold text-main">admin@andritz.com</code> and password: <code className="font-mono font-bold text-main">admin123</code>, then click <strong>Login</strong>.</li>
                <li>Change Password: Click <strong className="text-main">Change Password</strong> in the sidebar, input a new password (min. 6 characters), and save.</li>
                <li>Click <strong className="text-main">Import Orders (Excel)</strong>, select the Excel file prepared in Section A.</li>
                <li>Verify that order and operator lists populate correctly in the Scanner Terminal.</li>
              </ol>
            </div>
          )}

          {activeSection === 'D' && (
            <div className="guide-card">
              <h3 className="guide-card-title">D. Pre-Deployment Test Procedure</h3>
              <ul className="help-bullet-list">
                <li>Open the <strong>SAP Scanner Terminal</strong> view.</li>
                <li>Select an operator in Column 1, and an order in Column 2.</li>
                <li>Ensure only <strong>one step</strong> is marked with <em>“Current Active Step”</em>.</li>
                <li><strong>Scan with the workshop handheld scanner into SAP:</strong>
                  <ol className="sub-step-list mt-1">
                    <li>Scan the operator's Personnel No. barcode into the SAP screen.</li>
                    <li>Scan the active step's Confirmation No. barcode into the SAP screen.</li>
                  </ol>
                </li>
                <li>Verify data reads clearly on the shop floor display. Use the <strong>Fullscreen Enlarge</strong> button if needed for long-distance scanning.</li>
                <li>Click <strong className="text-emerald-600 font-bold">Mark Completed</strong> on the active step and verify the next step automatically advances.</li>
                <li>Click <strong className="text-cyan font-bold">Download Orders (Excel)</strong> to ensure latest status records can be exported cleanly.</li>
              </ul>
            </div>
          )}

          {activeSection === 'E' && (
            <div className="guide-card">
              <h3 className="guide-card-title">E. Workshop Monitor Installation</h3>
              <ul className="help-bullet-list">
                <li>Admin clicks the <strong className="text-red-500 font-bold">Logout</strong> button to return the terminal to operator mode (import and administrative controls will be hidden).</li>
                <li>Bookmark the application page or create a <strong>Desktop Shortcut</strong> on the workshop PC.</li>
                <li><strong>Display Configuration (Dual-Monitor):</strong> Place SAP on one monitor and this ISC Barcode Portal on the adjacent monitor side-by-side.</li>
              </ul>
            </div>
          )}

          {activeSection === 'F' && (
            <div className="guide-card">
              <h3 className="guide-card-title">F. Routine Operator Usage (Operator Mode)</h3>
              <ul className="help-bullet-list">
                <li>Search or select your name or personnel number in Column 1.</li>
                <li>Select the production order being processed in Column 2 (use group filters if necessary).</li>
                <li>Direct the scanner at the screen:
                  <ul className="mt-1">
                    <li>Scan the <strong>Personnel No.</strong> barcode into SAP.</li>
                    <li>Scan the <strong>Confirmation No.</strong> barcode for the active step into SAP.</li>
                  </ul>
                </li>
                <li>Operators simply view and scan. Operation step statuses are managed through central admin updates and SAP syncing.</li>
              </ul>
            </div>
          )}

          {activeSection === 'G' && (
            <div className="guide-card">
              <h3 className="guide-card-title">G. Regular Admin Maintenance</h3>
              <ul className="help-bullet-list">
                <li>Log in as administrator with your credentials.</li>
                <li>Import updated SAP exports periodically to batch-update order progress across the workshop.</li>
                <li>Click <strong className="text-cyan font-bold">Download Orders</strong> to create backups, then click <strong>Logout</strong>.</li>
                <li>To add new operators, simply append a row in the <code>Personel</code> sheet in Excel and re-import.</li>
              </ul>
            </div>
          )}

          {activeSection === 'H' && (
            <div className="guide-card">
              <h3 className="guide-card-title">H. Common Issues & Troubleshooting</h3>
              <div className="faq-item">
                <div className="faq-q">Message: "File must contain both Personel and Order sheets..."</div>
                <div className="faq-a">Sheet names in Excel are incorrect. Ensure exact capitalization: <code>Personel</code> and <code>Order</code>.</div>
              </div>
              <div className="faq-item">
                <div className="faq-q">Names or orders do not appear in the list</div>
                <div className="faq-a">The group filter in the navigation header might be restricting viewable data. Set the dropdown to <strong>"All Groups"</strong>.</div>
              </div>
              <div className="faq-item">
                <div className="faq-q">Data is not synchronized on another workshop PC</div>
                <div className="faq-a">Data is stored in local browser storage (localStorage). Re-import the Excel file on the target workshop browser or connect to the shared network server.</div>
              </div>
              <div className="faq-item">
                <div className="faq-q">Forgot admin password</div>
                <div className="faq-a">Open the Admin Login dialog, click <em>"Forgot password?"</em>, and click <strong>"Reset Password to admin123"</strong> to restore default credentials.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
