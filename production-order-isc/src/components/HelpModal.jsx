import React, { useState } from 'react';
import {
  HelpCircle,
  FileSpreadsheet,
  Monitor,
  ShieldCheck,
  CheckCircle2,
  Scan,
  RefreshCw,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

export default function HelpModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('A');

  if (!isOpen) return null;

  const tabs = [
    { id: 'A', title: 'A. Excel Data Preparation', icon: FileSpreadsheet },
    { id: 'B', title: 'B. Page & Server Setup', icon: Monitor },
    { id: 'C', title: 'C. Initial Admin Setup', icon: ShieldCheck },
    { id: 'D', title: 'D. Pre-Deployment Testing', icon: CheckCircle2 },
    { id: 'E', title: 'E. Workshop Installation', icon: Monitor },
    { id: 'F', title: 'F. Operator Usage', icon: Scan },
    { id: 'G', title: 'G. Regular Admin Updates', icon: RefreshCw },
    { id: 'H', title: 'H. Troubleshooting & FAQ', icon: AlertTriangle }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="auth-icon-badge">
              <HelpCircle size={20} color="#00A3E0" />
            </div>
            <div>
              <h3 className="modal-title font-heading">Official ISC Operational Guide</h3>
              <p className="modal-desc">Instructions for SAP preparation, scanner usage, and order administration</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Modal Layout: Tabs Left, Content Right */}
        <div className="help-modal-body">
          <div className="help-tabs-sidebar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`help-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.title}</span>
                  <ChevronRight size={14} className="ml-auto opacity-40" />
                </button>
              );
            })}
          </div>

          <div className="help-content-area">
            {activeTab === 'A' && (
              <div className="help-section-card">
                <h4 className="help-section-title">A. Data Preparation (SAP Export to Excel)</h4>
                <ul className="help-bullet-list">
                  <li><strong>Step Row Format:</strong> Must be <strong>1 row per step</strong> (<code className="font-mono">Step 1</code>, <code className="font-mono">Step 2</code>, <code className="font-mono">Step 3</code>, etc., or numbers 1, 2, 3). <em>Not total steps collapsed into a single row.</em></li>
                  <li><strong>Confirmation Number Remains Uniform:</strong> All step rows for the same Production Order No. should share the <strong>same NoKonfirmasi</strong> so that they match the job ticket barcodes.</li>
                  <li><strong>Order Sheet:</strong> Name the sheet exactly <code className="font-mono">Order</code> with columns:
                    <div className="code-snippet font-mono">NoProduksi, ProductGroup, Langkah, NamaLangkah, NoKonfirmasi, Status</div>
                  </li>
                  <li><strong>Status:</strong> Filled with <code className="font-mono text-emerald-400">Completed</code> (or <code className="font-mono text-emerald-400">Selesai</code>) or <code className="font-mono text-cyan-400">In Progress</code> (or <code className="font-mono text-cyan-400">Berjalan</code>). Any value other than "Completed"/"Selesai" is considered unfinished.</li>
                  <li><strong>Number Column Format:</strong> Must be formatted as <strong className="text-white">Text</strong> in Excel so leading zeros (e.g. 00123) are not stripped.</li>
                  <li><strong>Personnel Sheet:</strong> Name the sheet exactly <code className="font-mono">Personel</code> with columns:
                    <div className="code-snippet font-mono">NoPersonal, Nama, ProductGroup</div>
                    <em>Example: NoPersonal (1001, PKW), NoPersonal (1002, PULP).</em>
                  </li>
                  <li><strong>Row Filtering:</strong> Remove auxiliary SAP steps not executed in the workshop to keep the screen focused on primary physical operations.</li>
                </ul>
              </div>
            )}

            {activeTab === 'B' && (
              <div className="help-section-card">
                <h4 className="help-section-title">B. Page Setup & Offline Mode</h4>
                <ul className="help-bullet-list">
                  <li>This application is built to be accessed by workshop PCs across the ISC local network (LAN) or opened directly in a local browser.</li>
                  <li><strong>Full Offline Mode:</strong> Excel parsing libraries (SheetJS) and barcode rendering (JsBarcode) are bundled locally. The application functions 100% offline without requiring internet access.</li>
                  <li>Deployable directly on the ISC local server or local Laragon / web server environments.</li>
                </ul>
              </div>
            )}

            {activeTab === 'C' && (
              <div className="help-section-card">
                <h4 className="help-section-title">C. Admin Setup (Initial Setup)</h4>
                <ol className="help-step-list">
                  <li>Open the application URL in your browser.</li>
                  <li>Click the <strong className="text-cyan">Admin Login</strong> button in the top right corner.</li>
                  <li>Enter username: <code className="font-mono font-bold text-white">admin@andritz.com</code> and password: <code className="font-mono font-bold text-white">admin123</code>, then click <strong className="text-cyan">Login</strong>.</li>
                  <li>Change Password: Click the <strong className="text-white">Change Password</strong> button, enter a new password (min. 6 characters), and submit.</li>
                  <li>Click <strong className="text-white">Import Excel</strong>, select the Excel file prepared in Step A.</li>
                  <li>Verify that the orders and operator personnel immediately appear in Column 1 and Column 2.</li>
                </ol>
              </div>
            )}

            {activeTab === 'D' && (
              <div className="help-section-card">
                <h4 className="help-section-title">D. Pre-Deployment Test Procedure</h4>
                <ul className="help-bullet-list">
                  <li>Select an operator in Column 1, select an order in Column 2.</li>
                  <li>Verify that only <strong>one step</strong> is marked with <em>“Current Active Step”</em>.</li>
                  <li><strong>Scan with the workshop handheld scanner into SAP:</strong>
                    <ol className="sub-step-list mt-1">
                      <li>Scan the operator's Personnel No. barcode into SAP.</li>
                      <li>Scan the active step's Confirmation No. barcode into SAP.</li>
                    </ol>
                  </li>
                  <li>Confirm scanner reads the screen accurately. If distant, click the <strong>Enlarge Fullscreen</strong> icon on the barcode card.</li>
                  <li>Click <strong className="text-emerald-400">Mark Completed</strong> on the active step and verify the next step automatically becomes active.</li>
                  <li>Click <strong className="text-cyan">Download Orders (Excel)</strong> to ensure updated status records can be exported cleanly.</li>
                </ul>
              </div>
            )}

            {activeTab === 'E' && (
              <div className="help-section-card">
                <h4 className="help-section-title">E. Workshop Monitor Installation</h4>
                <ul className="help-bullet-list">
                  <li>Admin clicks the <strong className="text-danger">Logout</strong> button to return the terminal to operator mode (admin-only controls will be hidden).</li>
                  <li>Save the web page as a <strong>Bookmark</strong> or <strong>Desktop Shortcut</strong> on the workshop PC.</li>
                  <li><strong>Display Setup (Dual-Monitor):</strong> One monitor dedicated to SAP terminal inputs, and one monitor displaying this ISC Barcode Portal.</li>
                </ul>
              </div>
            )}

            {activeTab === 'F' && (
              <div className="help-section-card">
                <h4 className="help-section-title">F. Routine Operator Usage (Operator Mode)</h4>
                <ul className="help-bullet-list">
                  <li>Search or select your name/personnel number in Column 1.</li>
                  <li>Select the production order you are working on in Column 2 (filter by product group if necessary).</li>
                  <li>Direct the scanner at the screen:
                    <ul className="mt-1">
                      <li>Scan the <strong>Personnel No.</strong> barcode into SAP.</li>
                      <li>Scan the <strong>Confirmation No.</strong> barcode for the active step into SAP.</li>
                    </ul>
                  </li>
                  <li>Operators simply view and scan. Operation step statuses are managed through the central admin updates and SAP syncing.</li>
                </ul>
              </div>
            )}

            {activeTab === 'G' && (
              <div className="help-section-card">
                <h4 className="help-section-title">G. Regular Admin Maintenance</h4>
                <ul className="help-bullet-list">
                  <li>Log in as administrator using your admin credentials.</li>
                  <li>Periodically import updated SAP export files to batch-update order progress across the workshop.</li>
                  <li>Click <strong className="text-cyan">Download Orders</strong> to create local Excel backups, then click <strong className="text-danger">Logout</strong>.</li>
                  <li>To add new operators, simply add a row to the <code>Personel</code> sheet in Excel and re-import.</li>
                </ul>
              </div>
            )}

            {activeTab === 'H' && (
              <div className="help-section-card">
                <h4 className="help-section-title">H. Common Issues & Troubleshooting</h4>
                <div className="faq-item">
                  <div className="faq-q">Message: "File must contain both Personel and Order sheets..."</div>
                  <div className="faq-a">Sheet names in Excel are incorrect. Ensure exact capitalization: <code>Personel</code> and <code>Order</code>.</div>
                </div>
                <div className="faq-item">
                  <div className="faq-q">Names or orders are not visible in the lists</div>
                  <div className="faq-a">The group filter in the navigation bar might be restricting viewable data. Set the dropdown filter to <strong>"All Groups"</strong>.</div>
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

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
