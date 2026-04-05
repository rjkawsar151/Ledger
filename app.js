/* ======================================
   AdBudget — Application Logic
   ====================================== */

// ─── Data Store ───
const DB = {
    get(key) { try { return JSON.parse(localStorage.getItem('adbudget_' + key)) || null; } catch { return null; } },
    set(key, val) { localStorage.setItem('adbudget_' + key, JSON.stringify(val)); },
    getCompanies() { return this.get('companies') || []; },
    setCompanies(c) { this.set('companies', c); },
    getTransactions() { return this.get('transactions') || []; },
    setTransactions(t) { this.set('transactions', t); },
    getBills() { return this.get('bills') || []; },
    setBills(b) { this.set('bills', b); },
    getLoadRequests() { return this.get('loadRequests') || []; },
    setLoadRequests(l) { this.set('loadRequests', l); },
    getAdsBills() { return this.get('adsBills') || []; },
    setAdsBills(a) { this.set('adsBills', a); },
};

// ─── Data Clean Up & Init ───
function cleanTransactions() {
    const txns = DB.getTransactions();
    const seen = new Set();
    const clean = [];
    txns.forEach(t => {
        // ID must be unique
        const idKey = t.id;
        // Also prevent content duplicates added in same millisecond
        const contentKey = `${t.companyId}-${t.date}-${t.type}-${t.amount}-${t.description}`;
        if (!seen.has(idKey) && !seen.has(contentKey)) {
            seen.add(idKey);
            seen.add(contentKey);
            clean.push(t);
        }
    });
    if (clean.length !== txns.length) DB.setTransactions(clean);
}
cleanTransactions();

let currentPage = 'dashboard';
let selectedCompanyId = null;

// ─── Auth ───
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    if (email === 'kawsar@sinodtech.com' && pass === 'admin123') {
        localStorage.setItem('adbudget_session', 'active');
        showApp();
    } else {
        const err = document.getElementById('loginError');
        err.style.display = 'block';
        err.textContent = 'Invalid email or password. Please try again.';
    }
    return false;
}

function handleLogout() {
    localStorage.removeItem('adbudget_session');
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    navigate('dashboard');
}

// ─── Init ───
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('adbudget_session') === 'active') showApp();
});

// ─── Navigation ───
function navigate(page, extra) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const link = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (link) link.classList.add('active');
    const titles = { dashboard: 'Dashboard', companies: 'Companies', ledger: 'Ledger', reports: 'Reports', 'generate-bill': 'Generate Bill', 'load-requests': 'Load Requests', 'saved-bills': 'Saved Bills' };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    const content = document.getElementById('contentArea');
    switch (page) {
        case 'dashboard': renderDashboard(content); break;
        case 'companies': renderCompanies(content); break;
        case 'ledger': renderLedger(content, extra); break;
        case 'reports': renderReports(content); break;
        case 'generate-bill': renderGenerateBill(content); break;
        case 'load-requests': renderLoadRequests(content); break;
        case 'ads-bills': renderAdsBills(content); break;
        case 'saved-bills': renderSavedBills(content); break;
    }
    // close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}

function toggleSettingsMenu(e) {
    e.preventDefault();
    e.currentTarget.classList.toggle('open');
    document.getElementById('settingsSubmenu').classList.toggle('show');
}

// ─── Utils ───
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function fmtBDT(n) { return '৳ ' + Number(n || 0).toLocaleString('en-BD'); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
function monthName(m) { return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]; }

function openModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }
document.getElementById('modalOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

function closeDocViewer() { document.getElementById('docViewerOverlay').style.display = 'none'; }

function fileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

// ─── Dashboard ───
function renderDashboard(container) {
    const companies = DB.getCompanies();
    const transactions = DB.getTransactions();
    const totalIn = transactions.filter(t => t.type === 'IN').reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = transactions.filter(t => t.type === 'OUT').reduce((s, t) => s + Number(t.amount), 0);
    const totalExp = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const net = totalIn - totalOut - totalExp;
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-building"></i></div><div class="stat-info"><h4>Total Companies</h4><div class="stat-value">${companies.length}</div></div></div>
            <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div class="stat-info"><h4>Global Total IN</h4><div class="stat-value amount-in">${fmtBDT(totalIn)}</div></div></div>
            <div class="stat-card"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div><div class="stat-info"><h4>Global Total OUT</h4><div class="stat-value amount-out">${fmtBDT(totalOut)}</div></div></div>
            <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-receipt"></i></div><div class="stat-info"><h4>Global Total Expense</h4><div class="stat-value amount-expense">${fmtBDT(totalExp)}</div></div></div>
            <div class="stat-card"><div class="stat-icon ${net >= 0 ? 'blue' : 'red'}"><i class="fas fa-wallet"></i></div><div class="stat-info"><h4>Global Net Balance</h4><div class="stat-value" style="color:${net >= 0 ? 'var(--accent)' : 'var(--red)'}">${fmtBDT(net)}</div></div></div>
        </div>
        <div class="flex-between mb-20">
            <h3>Companies</h3>
            <button class="btn btn-primary" onclick="openCompanyModal()"><i class="fas fa-plus"></i> Add Company</button>
        </div>
        ${companies.length === 0 ? '<div class="empty-state"><i class="fas fa-building"></i><h3>No companies yet</h3><p>Add a company to get started</p></div>' :
            '<div class="company-grid">' + companies.map(c => `
            <div class="company-card" onclick="navigate('ledger', '${c.id}')">
                <div class="company-card-header">
                    <div class="company-icon">${c.name.charAt(0).toUpperCase()}</div>
                    <div><h3>${esc(c.name)}</h3><p>${esc(c.contact || '')}</p></div>
                </div>
                <div class="company-details">
                    ${c.email ? `<div class="company-detail"><i class="fas fa-envelope"></i>${esc(c.email)}</div>` : ''}
                    ${c.phone ? `<div class="company-detail"><i class="fas fa-phone"></i>${esc(c.phone)}</div>` : ''}
                </div>
                <div class="company-card-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-outline" onclick="openCompanyModal('${c.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCompany('${c.id}')"><i class="fas fa-trash"></i></button>
                    <button class="btn btn-sm btn-primary" onclick="navigate('ledger', '${c.id}')"><i class="fas fa-book"></i> Ledger</button>
                </div>
            </div>
        `).join('') + '</div>'}

        <div class="card mt-20 no-print">
            <div class="card-header"><h3><i class="fas fa-chart-pie"></i> Company Performance Summary</h3></div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Company</th><th>Lifetime IN</th><th>Lifetime OUT</th><th>Lifetime Exp.</th><th>Net Balance</th></tr></thead>
                    <tbody>
                        ${companies.map(c => {
                const cTxns = transactions.filter(t => t.companyId === c.id);
                const cIn = cTxns.filter(t => t.type === 'IN').reduce((s, t) => s + Number(t.amount), 0);
                const cOut = cTxns.filter(t => t.type === 'OUT').reduce((s, t) => s + Number(t.amount), 0);
                const cExp = cTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
                const cNet = cIn - cOut - cExp;
                return `<tr>
                                <td><strong>${esc(c.name)}</strong></td>
                                <td class="amount-in">${fmtBDT(cIn)}</td>
                                <td class="amount-out">${fmtBDT(cOut)}</td>
                                <td class="amount-expense">${fmtBDT(cExp)}</td>
                                <td style="font-weight:700;color:${cNet >= 0 ? 'var(--accent)' : 'var(--red)'}">${fmtBDT(cNet)}</td>
                            </tr>`;
            }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

// ─── Company CRUD ───
function openCompanyModal(id) {
    const c = id ? DB.getCompanies().find(x => x.id === id) : null;
    openModal(`
        <div class="modal-header"><h3>${c ? 'Edit' : 'Add'} Company</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <div class="modal-body">
            <div class="form-group"><label>Company Name *</label><input id="cName" value="${esc(c?.name || '')}" placeholder="Enter company name" required></div>
            <div class="form-row">
                <div class="form-group"><label>Contact Person</label><input id="cContact" value="${esc(c?.contact || '')}" placeholder="Contact name"></div>
                <div class="form-group"><label>Email</label><input id="cEmail" type="email" value="${esc(c?.email || '')}" placeholder="Email"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Phone</label><input id="cPhone" value="${esc(c?.phone || '')}" placeholder="Phone"></div>
                <div class="form-group"><label>Address</label><input id="cAddress" value="${esc(c?.address || '')}" placeholder="Address"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveCompany('${id || ''}')">${c ? 'Update' : 'Create'}</button>
        </div>
    `);
}

function saveCompany(id) {
    const name = document.getElementById('cName').value.trim();
    if (!name) return alert('Company name is required.');
    const companies = DB.getCompanies();
    const data = { name, contact: document.getElementById('cContact').value.trim(), email: document.getElementById('cEmail').value.trim(), phone: document.getElementById('cPhone').value.trim(), address: document.getElementById('cAddress').value.trim() };
    if (id) {
        const idx = companies.findIndex(c => c.id === id);
        if (idx > -1) companies[idx] = { ...companies[idx], ...data };
    } else {
        companies.push({ id: uid(), ...data });
    }
    DB.setCompanies(companies);
    closeModal();
    navigate(currentPage);
}

function deleteCompany(id) {
    openModal(`
        <div class="modal-header"><h3>Confirm Delete</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <div class="modal-body"><p>Are you sure you want to delete this company and all its transactions? This action cannot be undone.</p></div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="confirmDeleteCompany('${id}')">Yes, Delete</button>
        </div>
    `);
}

function confirmDeleteCompany(id) {
    DB.setCompanies(DB.getCompanies().filter(c => c.id !== id));
    DB.setTransactions(DB.getTransactions().filter(t => t.companyId !== id));
    closeModal();
    navigate(currentPage);
}

// ─── Companies Page ───
function renderCompanies(container) {
    const companies = DB.getCompanies();
    container.innerHTML = `
        <div class="flex-between mb-20">
            <h3>All Companies</h3>
            <button class="btn btn-primary" onclick="openCompanyModal()"><i class="fas fa-plus"></i> Add Company</button>
        </div>
        ${companies.length === 0 ? '<div class="empty-state"><i class="fas fa-building"></i><h3>No companies yet</h3><p>Create your first company to begin tracking budgets.</p></div>' :
            '<div class="company-grid">' + companies.map(c => `
            <div class="company-card">
                <div class="company-card-header">
                    <div class="company-icon">${c.name.charAt(0).toUpperCase()}</div>
                    <div><h3>${esc(c.name)}</h3><p>${esc(c.contact || 'No contact')}</p></div>
                </div>
                <div class="company-details">
                    <div class="company-detail"><i class="fas fa-envelope"></i>${esc(c.email || 'N/A')}</div>
                    <div class="company-detail"><i class="fas fa-phone"></i>${esc(c.phone || 'N/A')}</div>
                    <div class="company-detail"><i class="fas fa-map-marker-alt"></i><span class="truncate">${esc(c.address || 'N/A')}</span></div>
                </div>
                <div class="company-card-actions">
                    <button class="btn btn-sm btn-outline" onclick="openCompanyModal('${c.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCompany('${c.id}')"><i class="fas fa-trash"></i> Delete</button>
                    <button class="btn btn-sm btn-primary" onclick="navigate('ledger', '${c.id}')"><i class="fas fa-book"></i> Ledger</button>
                </div>
            </div>
        `).join('') + '</div>'}
    `;
}

// ─── Ledger ───
function renderLedger(container, companyId) {
    const companies = DB.getCompanies();
    if (companyId) selectedCompanyId = companyId;
    const now = new Date();
    const selMonth = selectedCompanyId ? (DB.get('ledger_month') || now.getMonth()) : now.getMonth();
    const selYear = selectedCompanyId ? (DB.get('ledger_year') || now.getFullYear()) : now.getFullYear();

    container.innerHTML = `
        <div class="filter-bar">
            <label>Company:</label>
            <select id="ledgerCompany" onchange="selectedCompanyId=this.value; renderLedgerTable()">
                <option value="">— Select Company —</option>
                ${companies.map(c => `<option value="${c.id}" ${c.id === selectedCompanyId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
            <label>Month:</label>
            <select id="ledgerMonth" onchange="DB.set('ledger_month', +this.value); renderLedgerTable()">
                ${[...Array(12)].map((_, i) => `<option value="${i}" ${i === +selMonth ? 'selected' : ''}>${monthName(i)}</option>`).join('')}
            </select>
            <label>Year:</label>
            <select id="ledgerYear" onchange="DB.set('ledger_year', +this.value); renderLedgerTable()">
                ${[...Array(7)].map((_, i) => { const y = now.getFullYear() - 3 + i; return `<option value="${y}" ${y === +selYear ? 'selected' : ''}>${y}</option>`; }).join('')}
            </select>
            <button class="btn btn-primary no-print" onclick="openTransactionModal()"><i class="fas fa-plus"></i> Add Transaction</button>
        </div>
        <div id="ledgerContent"></div>
    `;
    renderLedgerTable();
}

function renderLedgerTable() {
    const cId = selectedCompanyId || document.getElementById('ledgerCompany')?.value;
    const month = +document.getElementById('ledgerMonth').value;
    const year = +document.getElementById('ledgerYear').value;
    const contentEl = document.getElementById('ledgerContent');
    if (!cId) { contentEl.innerHTML = '<div class="empty-state"><i class="fas fa-hand-pointer"></i><h3>Select a company</h3><p>Choose a company to view its ledger.</p></div>'; return; }
    selectedCompanyId = cId;
    const company = DB.getCompanies().find(c => c.id === cId);
    const allTxns = DB.getTransactions().filter(t => t.companyId === cId);
    const txns = allTxns.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate Opening Balance from previous months
    const prevTxns = allTxns.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() < month);
    });
    const openingBalance = prevTxns.reduce((s, t) => t.type === 'IN' ? s + Number(t.amount) : s - Number(t.amount), 0);

    const totalIn = txns.filter(t => t.type === 'IN').reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = txns.filter(t => t.type === 'OUT').reduce((s, t) => s + Number(t.amount), 0);
    const totalExp = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);

    // Overall Lifetime Balance for the Net Balance card
    const lifetimeIn = allTxns.filter(t => t.type === 'IN').reduce((s, t) => s + Number(t.amount), 0);
    const lifetimeOut = allTxns.filter(t => t.type === 'OUT').reduce((s, t) => s + Number(t.amount), 0);
    const lifetimeExp = allTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const lifetimeNet = lifetimeIn - lifetimeOut - lifetimeExp;

    let balance = openingBalance;
    contentEl.innerHTML = `
        <div class="print-header"><h2>${esc(company?.name || '')} — Ledger</h2><p>${monthName(month)} ${year}</p></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-university"></i></div><div class="stat-info"><h4>Opening Bal.</h4><div class="stat-value">${fmtBDT(openingBalance)}</div></div></div>
            <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div class="stat-info"><h4>Monthly IN</h4><div class="stat-value amount-in">${fmtBDT(totalIn)}</div></div></div>
            <div class="stat-card"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div><div class="stat-info"><h4>Monthly OUT</h4><div class="stat-value amount-out">${fmtBDT(totalOut)}</div></div></div>
            <div class="stat-card"><div class="stat-icon ${lifetimeNet >= 0 ? 'blue' : 'red'}"><i class="fas fa-wallet"></i></div><div class="stat-info"><h4>Total Net Balance</h4><div class="stat-value" style="color:${lifetimeNet >= 0 ? 'var(--accent)' : 'var(--red)'}">${fmtBDT(lifetimeNet)}</div></div></div>
        </div>
        <div class="card">
            <div class="card-header"><h3>Transactions — ${monthName(month)} ${year}</h3></div>
            <div class="table-container">
                ${txns.length === 0 ? '<div class="empty-state" style="padding:40px"><i class="fas fa-inbox"></i><h3>No transactions</h3><p>No entries found for this month.</p></div>' : `
                <table>
                    <thead><tr><th>#</th><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount (BDT)</th><th>Balance</th><th>Doc</th><th class="no-print">Actions</th></tr></thead>
                    <tbody>
                        ${txns.map((t, i) => {
        if (t.type === 'IN') balance += Number(t.amount);
        else balance -= Number(t.amount);
        const rowClass = t.type === 'IN' ? 'row-in' : t.type === 'OUT' ? 'row-out' : 'row-expense';
        const amtClass = t.type === 'IN' ? 'amount-in' : t.type === 'OUT' ? 'amount-out' : 'amount-expense';
        return `<tr class="${rowClass}">
                                <td>${i + 1}</td>
                                <td>${fmtDate(t.date)}</td>
                                <td><span class="badge badge-${t.type.toLowerCase()}">${t.type}</span></td>
                                <td>${esc(t.category || '-')}</td>
                                <td>${esc(t.description || '-')}</td>
                                <td class="${amtClass}">${fmtBDT(t.amount)}</td>
                                <td style="font-weight:700;color:${balance >= 0 ? 'var(--accent)' : 'var(--red)'}">${fmtBDT(balance)}</td>
                                <td>${t.document ? `<button class="btn btn-sm btn-outline" onclick="viewDocument('${t.id}')"><i class="fas fa-eye"></i></button>` : '-'}</td>
                                <td class="no-print">
                                    <button class="btn-icon" onclick="openTransactionModal('${t.id}')"><i class="fas fa-edit"></i></button>
                                    <button class="btn-icon" style="color:var(--red)" onclick="deleteTransaction('${t.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>`;
    }).join('')}
                    </tbody>
                </table>`}
            </div>
        </div>

        <div class="card mt-20 no-print" style="opacity:0.7">
            <div class="card-header"><h3><i class="fas fa-bug"></i> Transaction Audit (Global Ledger)</h3></div>
            <div class="table-container small">
                <table style="font-size:11px">
                    <thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Amount</th><th>Category</th><th>Action</th></tr></thead>
                    <tbody>
                        ${allTxns.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => `
                            <tr>
                                <td><code>${t.id.slice(-5)}</code></td>
                                <td>${t.date}</td>
                                <td><span class="badge badge-${t.type.toLowerCase()}">${t.type}</span></td>
                                <td>${t.amount}</td>
                                <td>${esc(t.category || '-')}</td>
                                <td><button class="btn btn-sm btn-danger" onclick="deleteTransaction('${t.id}')">Delete</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function openTransactionModal(id) {
    if (!selectedCompanyId) return alert('Please select a company first.');
    const t = id ? DB.getTransactions().find(x => x.id === id) : null;
    const today = new Date().toISOString().split('T')[0];
    openModal(`
        <div class="modal-header"><h3>${t ? 'Edit' : 'Add'} Transaction</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <div class="modal-body">
            <div class="form-row">
                <div class="form-group"><label>Date *</label><input type="date" id="tDate" value="${t?.date || today}" required></div>
                <div class="form-group"><label>Type *</label>
                    <select id="tType">
                        <option value="IN" ${t?.type === 'IN' ? 'selected' : ''}>IN</option>
                        <option value="OUT" ${t?.type === 'OUT' ? 'selected' : ''}>OUT</option>
                        <option value="EXPENSE" ${t?.type === 'EXPENSE' ? 'selected' : ''}>EXPENSE</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Amount (BDT) *</label><input type="number" id="tAmount" value="${t?.amount || ''}" placeholder="0.00" min="0" step="0.01" required></div>
                <div class="form-group"><label>Category</label><input id="tCategory" value="${esc(t?.category || '')}" placeholder="e.g. Ads, Salary"></div>
            </div>
            <div class="form-group"><label>Description</label><textarea id="tDesc" rows="2" placeholder="Transaction details">${esc(t?.description || '')}</textarea></div>
            <div class="form-group"><label>Supporting Document (PDF/Image)</label><input type="file" id="tDoc" accept=".pdf,.jpg,.jpeg,.png,.gif"></div>
            ${t?.document ? '<p style="font-size:12px;color:var(--green)"><i class="fas fa-check-circle"></i> Existing document attached</p>' : ''}
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveTransaction('${id || ''}')">${t ? 'Update' : 'Add'}</button>
        </div>
    `);
}

async function saveTransaction(id) {
    const btn = event.currentTarget;
    if (btn.disabled) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    try {
        const date = document.getElementById('tDate').value;
        const type = document.getElementById('tType').value;
        const amount = document.getElementById('tAmount').value;
        if (!date || !amount) return alert('Date and amount are required.');
        const fileInput = document.getElementById('tDoc');
        let doc = id ? (DB.getTransactions().find(t => t.id === id)?.document || null) : null;
        let docName = id ? (DB.getTransactions().find(t => t.id === id)?.docName || null) : null;
        if (fileInput.files[0]) {
            doc = await fileToBase64(fileInput.files[0]);
            docName = fileInput.files[0].name;
        }
        const data = { companyId: selectedCompanyId, date, type, amount: parseFloat(amount), category: document.getElementById('tCategory').value.trim(), description: document.getElementById('tDesc').value.trim(), document: doc, docName };
        const txns = DB.getTransactions();
        if (id) {
            const idx = txns.findIndex(t => t.id === id);
            if (idx > -1) txns[idx] = { ...txns[idx], ...data };
        } else {
            txns.push({ id: uid(), ...data });
        }
        DB.setTransactions(txns);
        closeModal();
        renderLedgerTable();
    } finally {
        btn.disabled = false;
        btn.innerHTML = id ? 'Update' : 'Add';
    }
}

function deleteTransaction(id) {
    openModal(`
        <div class="modal-header"><h3>Confirm Delete</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <div class="modal-body"><p>Are you sure you want to delete this transaction?</p></div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="confirmDeleteTransaction('${id}')">Yes, Delete</button>
        </div>
    `);
}

function confirmDeleteTransaction(id) {
    DB.setTransactions(DB.getTransactions().filter(t => t.id !== id));
    closeModal();
    renderLedgerTable();
}

function viewDocument(txnId) {
    const t = DB.getTransactions().find(x => x.id === txnId);
    if (!t?.document) return;
    const body = document.getElementById('docViewerBody');
    if (t.document.startsWith('data:application/pdf')) {
        body.innerHTML = `<iframe src="${t.document}"></iframe>`;
    } else {
        body.innerHTML = `<img src="${t.document}" alt="Document">`;
    }
    document.getElementById('docViewerOverlay').style.display = 'flex';
}

// ─── Reports ───
function renderReports(container) {
    const companies = DB.getCompanies();
    const now = new Date();
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-file-alt"></i> Generate Monthly Report</h3></div>
            <div class="card-body">
                <div class="form-row">
                    <div class="form-group"><label>Company</label>
                        <select id="rptCompany">
                            <option value="">— Select —</option>
                            <option value="all">All Companies</option>
                            ${companies.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Month</label>
                        <select id="rptMonth">${[...Array(12)].map((_, i) => `<option value="${i}" ${i === now.getMonth() ? 'selected' : ''}>${monthName(i)}</option>`).join('')}</select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Year</label>
                        <select id="rptYear">${[...Array(7)].map((_, i) => { const y = now.getFullYear() - 3 + i; return `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`; }).join('')}</select>
                    </div>
                    <div class="form-group" style="display:flex;align-items:flex-end">
                        <button class="btn btn-primary" onclick="generateReport()"><i class="fas fa-file-pdf"></i> Generate PDF Report</button>
                    </div>
                </div>
                <div style="margin-top:12px"><button class="btn btn-outline" onclick="previewReport()"><i class="fas fa-eye"></i> Preview Report</button></div>
            </div>
        </div>
        <div id="reportPreview" class="mt-20"></div>
    `;
}

function previewReport() {
    const cId = document.getElementById('rptCompany').value;
    if (!cId) return alert('Please select a company.');
    const month = +document.getElementById('rptMonth').value;
    const year = +document.getElementById('rptYear').value;

    let companyName = "All Companies";
    let companyAddress = "";
    let txns = [];

    if (cId === 'all') {
        txns = DB.getTransactions().filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    } else {
        const company = DB.getCompanies().find(c => c.id === cId);
        companyName = company.name;
        companyAddress = company.address;
        txns = DB.getTransactions().filter(t => {
            if (t.companyId !== cId) return false;
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }

    txns.sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalIn = txns.filter(t => t.type === 'IN').reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = txns.filter(t => t.type === 'OUT').reduce((s, t) => s + Number(t.amount), 0);
    const totalExp = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const net = totalIn - totalOut - totalExp;
    let balance = 0;

    document.getElementById('reportPreview').innerHTML = `
        <div class="card">
            <div class="card-body">
                <div style="text-align:center;margin-bottom:24px">
                    <h2>${esc(companyName)}</h2>
                    <p style="color:var(--text-secondary)">Monthly Ledger Report - ${monthName(month)} ${year}</p>
                    ${companyAddress ? `<p style="font-size:12px;color:var(--text-secondary)">${esc(companyAddress)}</p>` : ''}
                </div>
                <div class="stats-grid" style="margin-bottom:24px">
                    <div class="stat-card"><div class="stat-icon green"><i class="fas fa-arrow-down"></i></div><div class="stat-info"><h4>Total IN</h4><div class="stat-value amount-in">${fmtBDT(totalIn)}</div></div></div>
                    <div class="stat-card"><div class="stat-icon red"><i class="fas fa-arrow-up"></i></div><div class="stat-info"><h4>Total OUT</h4><div class="stat-value amount-out">${fmtBDT(totalOut)}</div></div></div>
                    <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-receipt"></i></div><div class="stat-info"><h4>Expense</h4><div class="stat-value amount-expense">${fmtBDT(totalExp)}</div></div></div>
                    <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-wallet"></i></div><div class="stat-info"><h4>Net Balance</h4><div class="stat-value">${fmtBDT(net)}</div></div></div>
                </div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>${cId === 'all' ? 'Company' : '#'}</th><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Balance</th></tr></thead>
                        <tbody>
                            ${txns.map((t, i) => {
        if (t.type === 'IN') balance += Number(t.amount); else balance -= Number(t.amount);
        let prefix = cId === 'all' ? `<td>${esc(DB.getCompanies().find(c => c.id === t.companyId)?.name || 'N/A')}</td>` : `<td>${i + 1}</td>`;
        return `<tr class="row-${t.type.toLowerCase()}">${prefix}<td>${fmtDate(t.date)}</td><td><span class="badge badge-${t.type.toLowerCase()}">${t.type}</span></td><td>${esc(t.category || '-')}</td><td>${esc(t.description || '-')}</td><td>${fmtBDT(t.amount)}</td><td>${fmtBDT(balance)}</td></tr>`;
    }).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top:20px;text-align:center">
                    <button class="btn btn-primary no-print" onclick="window.print()"><i class="fas fa-print"></i> Print Report</button>
                    <button class="btn btn-success no-print" onclick="generateReport()"><i class="fas fa-file-pdf"></i> Download PDF</button>
                </div>
            </div>
        </div>
    `;
}

function generateReport() {
    const cId = document.getElementById('rptCompany').value;
    if (!cId) return alert('Please select a company.');
    const month = +document.getElementById('rptMonth').value;
    const year = +document.getElementById('rptYear').value;

    let companyName = "All Companies";
    let companyAddress = "";
    let txns = [];

    if (cId === 'all') {
        txns = DB.getTransactions().filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    } else {
        const company = DB.getCompanies().find(c => c.id === cId);
        companyName = company.name;
        companyAddress = company.address;
        txns = DB.getTransactions().filter(t => {
            if (t.companyId !== cId) return false;
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    }

    txns.sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalIn = txns.filter(t => t.type === 'IN').reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = txns.filter(t => t.type === 'OUT').reduce((s, t) => s + Number(t.amount), 0);
    const totalExp = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
    const net = totalIn - totalOut - totalExp;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(companyName, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Monthly Ledger Report - ${monthName(month)} ${year}`, 105, 28, { align: 'center' });
    if (companyAddress) { doc.setFontSize(9); doc.text(companyAddress, 105, 34, { align: 'center' }); }
    doc.setFontSize(10);
    const summaryY = 44;
    doc.text(`Total IN: BDT ${Number(totalIn).toLocaleString()}`, 14, summaryY);
    doc.text(`Total OUT: BDT ${Number(totalOut).toLocaleString()}`, 75, summaryY);
    doc.text(`Total Expense: BDT ${Number(totalExp).toLocaleString()}`, 130, summaryY);
    doc.text(`Net Balance: BDT ${Number(net).toLocaleString()}`, 14, summaryY + 7);
    let balance = 0;
    const rows = txns.map((t, i) => {
        if (t.type === 'IN') balance += Number(t.amount); else balance -= Number(t.amount);
        const firstCol = cId === 'all' ? (DB.getCompanies().find(c => c.id === t.companyId)?.name || 'N/A') : (i + 1);
        return [
            firstCol,
            fmtDate(t.date),
            t.type,
            t.category || '-',
            t.description || '-',
            `BDT ${Number(t.amount).toLocaleString()}`,
            `BDT ${Number(balance).toLocaleString()}`
        ];
    });
    const headers = [[cId === 'all' ? 'Company' : '#', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Balance']];
    doc.autoTable({
        head: headers,
        body: rows,
        startY: summaryY + 14,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8, font: 'helvetica' }
    });
    doc.save(`${companyName.replace(/\s+/g, '_')}_Report_${monthName(month)}_${year}.pdf`);
}

// ─── Bill Generator ───
function renderGenerateBill(container) {
    const companies = DB.getCompanies();
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-file-invoice-dollar"></i> Generate Bill</h3></div>
            <div class="card-body">
                <div class="form-row">
                    <div class="form-group"><label>Company *</label>
                        <select id="billCompany"><option value="">— Select —</option>${companies.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
                    </div>
                    <div class="form-group"><label>Budget Amount (BDT) *</label><input type="number" id="billAmount" placeholder="e.g. 50000" min="0"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Week / Date Range</label><input id="billDateRange" placeholder="e.g. 01 Apr - 07 Apr, 2026"></div>
                    <div class="form-group"><label>Status</label>
                        <select id="billStatus"><option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Approved">Approved</option></select>
                    </div>
                </div>
                <div class="form-group"><label>Purpose / Notes</label><textarea id="billNotes" rows="2" placeholder="Additional notes"></textarea></div>
                <div style="display:flex;gap:10px;margin-top:12px">
                    <button class="btn btn-primary" onclick="previewBill()"><i class="fas fa-eye"></i> Preview</button>
                    <button class="btn btn-success" onclick="saveBill()"><i class="fas fa-save"></i> Save Bill</button>
                    <button class="btn btn-warning" onclick="downloadBillPDF()"><i class="fas fa-file-pdf"></i> Download PDF</button>
                </div>
            </div>
        </div>
        <div id="billPreviewArea" class="mt-20"></div>
    `;
}

function getBillLetter(company, amount, dateRange, type) {
    const label = type === 'load' ? 'Budget Load Request' : 'Request for Marketing Budget Approval for One Week';
    return {
        to: `To\nAccounts Officer\n${company.name}`,
        subject: `Subject: ${label}`,
        body: `Dear Sir,\n\nI hope you are doing well.\n\nI would like to request approval for a marketing budget of BDT ${Number(amount).toLocaleString()} for one week to run promotional and advertising activities for ${company.name}. This budget will be used to support our ongoing marketing campaigns and help increase customer reach and service bookings.\n\nKindly approve the requested budget at your earliest convenience so that we can proceed with the planned marketing activities without delay.\n\nThank you for your support and cooperation.`,
        dateRange,
        signature: `Md. Kawsar Hosen\nDigital Marketing Executive\nAdonis Men's Grooming co. Ltd.`
    };
}

function previewBill(type) {
    type = type || 'bill';
    const cId = (type === 'load' ? document.getElementById('lrCompany') : document.getElementById('billCompany'))?.value;
    const amount = (type === 'load' ? document.getElementById('lrAmount') : document.getElementById('billAmount'))?.value;
    const dateRange = (type === 'load' ? document.getElementById('lrDateRange') : document.getElementById('billDateRange'))?.value;
    if (!cId || !amount) return alert('Company and amount are required.');
    const company = DB.getCompanies().find(c => c.id === cId);
    const letter = getBillLetter(company, amount, dateRange, type);
    const previewArea = document.getElementById(type === 'load' ? 'lrPreviewArea' : 'billPreviewArea');
    previewArea.innerHTML = `
        <div class="bill-preview">
            <p style="white-space:pre-line">${esc(letter.to)}</p>
            <p style="margin-top:16px"><strong>${esc(letter.subject)}</strong></p>
            ${dateRange ? `<p style="font-size:13px;color:var(--text-secondary)">Period: ${esc(dateRange)}</p>` : ''}
            <div class="bill-body" style="margin-top:20px;white-space:pre-line">${esc(letter.body)}</div>
            <div class="bill-signature" style="margin-top:40px;white-space:pre-line">${esc(letter.signature)}</div>
        </div>
    `;
}

function saveBill(type) {
    type = type || 'bill';
    const cId = (type === 'load' ? document.getElementById('lrCompany') : document.getElementById('billCompany'))?.value;
    const amount = (type === 'load' ? document.getElementById('lrAmount') : document.getElementById('billAmount'))?.value;
    if (!cId || !amount) return alert('Company and amount are required.');
    const dateRange = (type === 'load' ? document.getElementById('lrDateRange') : document.getElementById('billDateRange'))?.value || '';
    const notes = (type === 'load' ? document.getElementById('lrNotes') : document.getElementById('billNotes'))?.value || '';
    const status = (type === 'load' ? document.getElementById('lrStatus') : document.getElementById('billStatus'))?.value || 'Draft';
    const company = DB.getCompanies().find(c => c.id === cId);
    const entry = { id: uid(), companyId: cId, companyName: company.name, amount: parseFloat(amount), dateRange, notes, status, createdAt: new Date().toISOString() };
    if (type === 'load') {
        const list = DB.getLoadRequests(); list.push(entry); DB.setLoadRequests(list);
        alert('Load Request saved!');
    } else {
        const list = DB.getBills(); list.push(entry); DB.setBills(list);
        alert('Bill saved!');
    }
}

function downloadBillPDF(type, billData) {
    type = type || 'bill';
    let cId, amount, dateRange;
    if (billData) {
        cId = billData.companyId; amount = billData.amount; dateRange = billData.dateRange;
    } else {
        cId = (type === 'load' ? document.getElementById('lrCompany') : document.getElementById('billCompany'))?.value;
        amount = (type === 'load' ? document.getElementById('lrAmount') : document.getElementById('billAmount'))?.value;
        dateRange = (type === 'load' ? document.getElementById('lrDateRange') : document.getElementById('billDateRange'))?.value || '';
    }
    if (!cId || !amount) return alert('Company and amount are required.');
    const company = DB.getCompanies().find(c => c.id === cId);
    const letter = getBillLetter(company, amount, dateRange, type);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(12);
    letter.to.split('\n').forEach(line => { doc.text(line, 14, y); y += 7; });
    y += 6;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(letter.subject, 14, y); y += 10;
    doc.setFont(undefined, 'normal');
    if (dateRange) { doc.setFontSize(10); doc.text('Period: ' + dateRange, 14, y); y += 8; }
    doc.setFontSize(11);
    const bodyLines = doc.splitTextToSize(letter.body, 180);
    doc.text(bodyLines, 14, y);
    y += bodyLines.length * 6 + 20;
    doc.setFontSize(11);
    letter.signature.split('\n').forEach(line => { doc.text(line, 14, y); y += 7; });
    const label = type === 'load' ? 'LoadRequest' : 'Bill';
    doc.save(`${label}_${company.name}.pdf`);
}

// ─── Saved Bills ───
function renderSavedBills(container) {
    const bills = DB.getBills();
    container.innerHTML = `
        <div class="flex-between mb-20">
            <h3>Saved Bills</h3>
            <button class="btn btn-primary" onclick="navigate('generate-bill')"><i class="fas fa-plus"></i> Create New Bill</button>
        </div>
        ${bills.length === 0 ? '<div class="empty-state"><i class="fas fa-archive"></i><h3>No saved bills</h3><p>Generated bills will appear here.</p></div>' : `
        <div class="card"><div class="table-container"><table>
            <thead><tr><th>#</th><th>Company</th><th>Amount</th><th>Date Range</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
                ${bills.map((b, i) => `<tr>
                    <td>${i + 1}</td>
                    <td>${esc(b.companyName)}</td>
                    <td class="amount-out">${fmtBDT(b.amount)}</td>
                    <td>${esc(b.dateRange || '-')}</td>
                    <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
                    <td>${fmtDate(b.createdAt)}</td>
                    <td>
                        <button class="btn-icon" title="Download PDF" onclick="downloadBillById('bill','${b.id}')"><i class="fas fa-download"></i></button>
                        <button class="btn-icon" title="Edit Status" onclick="editBillStatus('bill','${b.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon" style="color:var(--red)" title="Delete" onclick="deleteBill('bill','${b.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table></div></div>`}
    `;
}

function downloadBillById(type, id) {
    const list = type === 'load' ? DB.getLoadRequests() : DB.getBills();
    const bill = list.find(b => b.id === id);
    if (!bill) return alert('Bill not found.');
    downloadBillPDF(type, bill);
}

function editBillStatus(type, id) {
    const list = type === 'load' ? DB.getLoadRequests() : DB.getBills();
    const item = list.find(b => b.id === id);
    if (!item) return;
    openModal(`
        <div class="modal-header"><h3>Update Status</h3><button class="btn-icon" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <div class="modal-body">
            <div class="form-group"><label>Status</label>
                <select id="editStatus">
                    <option value="Draft" ${item.status === 'Draft' ? 'selected' : ''}>Draft</option>
                    <option value="Sent" ${item.status === 'Sent' ? 'selected' : ''}>Sent</option>
                    <option value="Approved" ${item.status === 'Approved' ? 'selected' : ''}>Approved</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveBillStatus('${type}','${id}')">Update</button>
        </div>
    `);
}

function saveBillStatus(type, id) {
    const status = document.getElementById('editStatus').value;
    const list = type === 'load' ? DB.getLoadRequests() : DB.getBills();
    const idx = list.findIndex(b => b.id === id);
    if (idx > -1) list[idx].status = status;
    if (type === 'load') DB.setLoadRequests(list); else DB.setBills(list);
    closeModal();
    navigate(type === 'load' ? 'load-requests' : 'saved-bills');
}

function deleteBill(type, id) {
    if (!confirm('Delete this entry?')) return;
    if (type === 'load') {
        DB.setLoadRequests(DB.getLoadRequests().filter(b => b.id !== id));
    } else {
        DB.setBills(DB.getBills().filter(b => b.id !== id));
    }
    navigate(type === 'load' ? 'load-requests' : 'saved-bills');
}

// ─── Load Requests ───
function renderLoadRequests(container) {
    const companies = DB.getCompanies();
    const requests = DB.getLoadRequests();
    container.innerHTML = `
        <div class="tabs">
            <button class="tab-btn active" onclick="switchLRTab(this, 'create')">Create Load Request</button>
            <button class="tab-btn" onclick="switchLRTab(this, 'list')">Saved Requests (${requests.length})</button>
        </div>
        <div id="lrCreateTab">
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-money-check-alt"></i> Budget Load Request</h3></div>
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group"><label>Company *</label>
                            <select id="lrCompany"><option value="">— Select —</option>${companies.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
                        </div>
                        <div class="form-group"><label>Budget Amount (BDT) *</label><input type="number" id="lrAmount" placeholder="e.g. 50000" min="0"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Week / Date Range</label><input id="lrDateRange" placeholder="e.g. 01 Apr - 07 Apr, 2026"></div>
                        <div class="form-group"><label>Status</label>
                            <select id="lrStatus"><option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Approved">Approved</option></select>
                        </div>
                    </div>
                    <div class="form-group"><label>Purpose / Notes</label><textarea id="lrNotes" rows="2" placeholder="Additional notes"></textarea></div>
                    <div style="display:flex;gap:10px;margin-top:12px">
                        <button class="btn btn-primary" onclick="previewBill('load')"><i class="fas fa-eye"></i> Preview</button>
                        <button class="btn btn-success" onclick="saveBill('load')"><i class="fas fa-save"></i> Save Request</button>
                        <button class="btn btn-warning" onclick="downloadBillPDF('load')"><i class="fas fa-file-pdf"></i> Download PDF</button>
                    </div>
                </div>
            </div>
            <div id="lrPreviewArea" class="mt-20"></div>
        </div>
        <div id="lrListTab" style="display:none">
            ${requests.length === 0 ? '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No load requests</h3><p>Create your first budget load request.</p></div>' : `
            <div class="card"><div class="table-container"><table>
                <thead><tr><th>#</th><th>Company</th><th>Amount</th><th>Date Range</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                    ${requests.map((b, i) => `<tr>
                        <td>${i + 1}</td>
                        <td>${esc(b.companyName)}</td>
                        <td class="amount-out">${fmtBDT(b.amount)}</td>
                        <td>${esc(b.dateRange || '-')}</td>
                        <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
                        <td>${fmtDate(b.createdAt)}</td>
                        <td>
                            <button class="btn-icon" title="Download PDF" onclick="downloadBillById('load','${b.id}')"><i class="fas fa-download"></i></button>
                            <button class="btn-icon" title="Edit Status" onclick="editBillStatus('load','${b.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon" style="color:var(--red)" title="Delete" onclick="deleteBill('load','${b.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table></div></div>`}
        </div>
    `;
}

function switchLRTab(btn, tab) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('lrCreateTab').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('lrListTab').style.display = tab === 'list' ? 'block' : 'none';
}

// ─── Monthly Ads Bills ───
function renderAdsBills(container) {
    const list = DB.getAdsBills();
    container.innerHTML = `
        <div class="tabs">
            <button class="tab-btn active" onclick="switchAdsTab(this, 'create')">Create Ads Bill</button>
            <button class="tab-btn" onclick="switchAdsTab(this, 'list')">Saved Bills (${list.length})</button>
        </div>
        <div id="adsCreateTab"></div>
        <div id="adsListTab" style="display:none"></div>
    `;
    renderAdsBillForm();
    renderAdsBillsList();
}

function switchAdsTab(btn, tab) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('adsCreateTab').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('adsListTab').style.display = tab === 'list' ? 'block' : 'none';
}

function renderAdsBillForm(billId = null) {
    const companies = DB.getCompanies();
    const bill = billId ? DB.getAdsBills().find(b => b.id === billId) : null;
    const now = new Date().toISOString().split('T')[0];

    const container = document.getElementById('adsCreateTab');
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3>${bill ? 'Edit' : 'Create'} Monthly Ads Bill</h3></div>
            <div class="card-body">
                <div class="form-row">
                    <div class="form-group"><label>Company Logo</label>
                        <input type="file" id="adsLogo" accept="image/*" onchange="previewAdsLogo(this)">
                        <div id="adsLogoPreview" style="margin-top:10px; width:150px; height:80px; border:2px dashed var(--border); display:flex; align-items:center; justify-content:center; background:#F4A7B9; color:white; border-radius:8px; font-weight:bold; font-size:18px; overflow:hidden">
                            ${bill?.logo ? `<img src="${bill.logo}" style="max-width:100%; max-height:100%;">` : 'ADONIA'}
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Company Selection (Optional autofill)</label>
                        <select onchange="autofillAdsCompany(this.value)"><option value="">— Select Company —</option>${companies.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
                    </div>
                    <div class="form-group"><label>Date *</label><input type="date" id="adsDate" value="${bill?.date || now}"></div>
                </div>
                <div class="form-row">
                   <div class="form-group"><label>Company Name *</label><input id="adsName" value="${esc(bill?.companyName || '')}" placeholder="e.g. Adonia Men's Grooming"></div>
                   <div class="form-group"><label>Company Phone</label><input id="adsPhone" value="${esc(bill?.phone || '')}" placeholder="e.g. +880 1234..."></div>
                </div>
                <div class="form-group"><label>Company Address</label><textarea id="adsAddress" rows="2">${esc(bill?.address || '')}</textarea></div>
                
                <hr style="margin:24px 0; border:0; border-top:1px solid var(--border)">
                <h4 style="margin-bottom:16px"><i class="fas fa-user"></i> Recipient & Period</h4>
                <div class="form-row">
                    <div class="form-group"><label>To: Name</label><input id="adsRecName" value="${esc(bill?.recipientName || '')}" placeholder="e.g. Hasan Imam Noyan"></div>
                    <div class="form-group"><label>To: Designation</label><input id="adsRecDesig" value="${esc(bill?.recipientDesignation || '')}" placeholder="e.g. Executive to Chairman"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Bill Month Start</label><input id="adsMonthStart" value="${esc(bill?.monthStart || '')}" placeholder="e.g. 1-Mar"></div>
                    <div class="form-group"><label>Bill Month End</label><input id="adsMonthEnd" value="${esc(bill?.monthEnd || '')}" placeholder="e.g. 31-Mar"></div>
                </div>

                <hr style="margin:24px 0; border:0; border-top:1px solid var(--border)">
                <div class="flex-between mb-20">
                    <h4><i class="fas fa-list"></i> Line Items</h4>
                    <div class="form-group" style="width:200px"><label>Global BDT Rate *</label><input type="number" step="0.01" id="adsGlobalRate" value="${bill?.rate || 144.50}" oninput="calcAdsTotals()"></div>
                </div>
                
                <div class="table-container">
                    <table class="ads-table" style="width:100%; border-collapse:collapse; margin-bottom:20px">
                        <thead><tr style="background:var(--bg-sidebar); color:white">
                            <th style="padding:10px; text-align:center; width:60px">SI</th>
                            <th style="padding:10px; text-align:left">Description</th>
                            <th style="padding:10px; text-align:right; width:120px">Cost USD</th>
                            <th style="padding:10px; text-align:right; width:100px">Rate</th>
                            <th style="padding:10px; text-align:right; width:140px">Line Total (BDT)</th>
                            <th style="padding:10px; width:50px"></th>
                        </tr></thead>
                        <tbody id="adsItemsBody"></tbody>
                    </table>
                </div>
                <button class="btn btn-sm btn-outline" onclick="addAdsRow()"><i class="fas fa-plus"></i> Add Line Item</button>

                <div class="stats-grid" style="margin-top:24px">
                    <div class="stat-card" style="margin:0"><div class="stat-info"><h4>Total USD</h4><div class="stat-value" id="adsTotalUSD">0.00</div></div></div>
                    <div class="stat-card" style="margin:0; background:#E8F4F4"><div class="stat-info"><h4>Total BDT</h4><div class="stat-value" id="adsTotalBDT">0.00</div></div></div>
                    <div class="stat-card" style="margin:0; border:2px solid var(--accent)"><div class="stat-info"><h4>Grand Total</h4><div class="stat-value" id="adsGrandTotal">৳ 0</div></div></div>
                </div>

                <div style="margin-top:32px; display:flex; gap:12px">
                    <button class="btn btn-primary" onclick="saveAdsBill('${billId || ''}')"><i class="fas fa-save"></i> Save Bill</button>
                    ${billId ? '<button class="btn btn-outline" onclick="renderAdsBills(document.getElementById(\'contentArea\'))">Cancel Edit</button>' : ''}
                </div>
            </div>
        </div>
    `;
    const initialItems = bill?.items || [{ desc: 'Meta Ads', usd: 233.72 }, { desc: 'Blue Tik', usd: 8 }, { desc: 'GoogleAds', usd: 2.5 }];
    initialItems.forEach(item => addAdsRow(item.desc, item.usd));
    calcAdsTotals();
}

let adsUploadedLogo = '';
function previewAdsLogo(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            adsUploadedLogo = e.target.result;
            document.getElementById('adsLogoPreview').innerHTML = `<img src="${adsUploadedLogo}" style="max-width:100%; max-height:100%">`;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function autofillAdsCompany(id) {
    if (!id) return;
    const c = DB.getCompanies().find(x => x.id === id);
    if (!c) return;
    document.getElementById('adsName').value = c.name;
    document.getElementById('adsAddress').value = c.address || '';
    document.getElementById('adsPhone').value = c.phone || '';
    if (c.logo) {
        adsUploadedLogo = c.logo;
        document.getElementById('adsLogoPreview').innerHTML = `<img src="${c.logo}" style="max-width:100%; max-height:100%">`;
    } else {
        document.getElementById('adsLogoPreview').innerHTML = c.name.charAt(0).toUpperCase();
    }
}

function addAdsRow(desc = '', usd = '') {
    const body = document.getElementById('adsItemsBody');
    const si = body.children.length + 1;
    const rateInput = document.getElementById('adsGlobalRate');
    const rate = rateInput ? rateInput.value : 144.50;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="padding:10px; border-bottom:1px solid var(--border); text-align:center" class="ads-si">${si}</td>
        <td style="padding:10px; border-bottom:1px solid var(--border)"><input class="ads-desc" value="${esc(desc)}" placeholder="Description" style="border:0; width:100%; background:transparent"></td>
        <td style="padding:10px; border-bottom:1px solid var(--border)"><input type="number" step="0.01" class="ads-usd" value="${usd}" placeholder="0.00" oninput="calcAdsTotals()" style="border:0; width:100%; text-align:right; background:transparent"></td>
        <td style="padding:10px; border-bottom:1px solid var(--border); text-align:right" class="ads-rate">${rate}</td>
        <td style="padding:10px; border-bottom:1px solid var(--border); text-align:right; font-weight:700" class="ads-total">0.00</td>
        <td style="padding:10px; border-bottom:1px solid var(--border); text-align:center"><button class="btn-icon" style="color:var(--red)" onclick="this.closest('tr').remove(); reorderAdsSI(); calcAdsTotals()"><i class="fas fa-times"></i></button></td>
    `;
    body.appendChild(tr);
    calcAdsTotals();
}

function reorderAdsSI() {
    document.querySelectorAll('.ads-si').forEach((td, i) => td.textContent = i + 1);
}

function calcAdsTotals() {
    const rateInput = document.getElementById('adsGlobalRate');
    if (!rateInput) return;
    const rate = parseFloat(rateInput.value) || 0;
    document.querySelectorAll('.ads-rate').forEach(td => td.textContent = rate.toFixed(2));

    let totalUsd = 0;
    let totalBdt = 0;

    document.querySelectorAll('#adsItemsBody tr').forEach(tr => {
        const usdValue = tr.querySelector('.ads-usd').value;
        const usd = parseFloat(usdValue) || 0;
        const lineBdt = usd * rate;
        tr.querySelector('.ads-total').textContent = lineBdt.toFixed(2);

        totalUsd += usd;
        totalBdt += lineBdt;
    });

    const usdEl = document.getElementById('adsTotalUSD');
    const bdtEl = document.getElementById('adsTotalBDT');
    const grandEl = document.getElementById('adsGrandTotal');

    if (usdEl) usdEl.textContent = totalUsd.toFixed(2);
    if (bdtEl) bdtEl.textContent = totalBdt.toFixed(2);
    if (grandEl) grandEl.textContent = '৳ ' + Math.round(totalBdt).toLocaleString();
}

function saveAdsBill(id) {
    const name = document.getElementById('adsName').value.trim();
    if (!name) return alert('Company Name is required.');

    const items = [];
    document.querySelectorAll('#adsItemsBody tr').forEach(tr => {
        items.push({
            desc: tr.querySelector('.ads-desc').value.trim(),
            usd: parseFloat(tr.querySelector('.ads-usd').value) || 0
        });
    });

    const list = DB.getAdsBills();
    const existing = id ? list.find(b => b.id === id) : null;

    const data = {
        id: id || uid(),
        companyName: name,
        address: document.getElementById('adsAddress').value.trim(),
        phone: document.getElementById('adsPhone').value.trim(),
        date: document.getElementById('adsDate').value,
        logo: adsUploadedLogo || existing?.logo || '',
        recipientName: document.getElementById('adsRecName').value.trim(),
        recipientDesignation: document.getElementById('adsRecDesig').value.trim(),
        monthStart: document.getElementById('adsMonthStart').value.trim(),
        monthEnd: document.getElementById('adsMonthEnd').value.trim(),
        rate: parseFloat(document.getElementById('adsGlobalRate').value) || 0,
        items: items,
        status: existing?.status || 'Draft',
        createdAt: existing?.createdAt || new Date().toISOString()
    };

    if (id) {
        const idx = list.findIndex(b => b.id === id);
        if (idx > -1) list[idx] = data;
    } else {
        list.push(data);
    }
    DB.setAdsBills(list);
    adsUploadedLogo = '';
    alert('Monthly Ads Bill saved successfully!');
    renderAdsBills(document.getElementById('contentArea'));
}

function renderAdsBillsList() {
    const list = DB.getAdsBills();
    const container = document.getElementById('adsListTab');
    if (list.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No Ads Bills yet</h3><p>Create your first bill in the Create tab.</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="card">
            <div class="table-container">
                <table>
                    <thead><tr><th>#</th><th>Company</th><th>Month/Period</th><th>Total BDT</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${list.map((b, i) => {
        const totalBdt = b.items.reduce((s, it) => s + (it.usd * b.rate), 0);
        return `<tr>
                                <td>${i + 1}</td>
                                <td><strong>${esc(b.companyName)}</strong></td>
                                <td>${esc(b.monthStart || '')} - ${esc(b.monthEnd || '')}</td>
                                <td style="font-weight:700">৳ ${Math.round(totalBdt).toLocaleString()}</td>
                                <td>${fmtDate(b.date)}</td>
                                <td>
                                    <select onchange="updateAdsStatus('${b.id}', this.value)" style="padding:4px; border-radius:4px; font-size:12px; border:1px solid var(--border)">
                                        <option value="Draft" ${b.status === 'Draft' ? 'selected' : ''}>Draft</option>
                                        <option value="Sent" ${b.status === 'Sent' ? 'selected' : ''}>Sent</option>
                                        <option value="Paid" ${b.status === 'Paid' ? 'selected' : ''}>Paid</option>
                                    </select>
                                </td>
                                <td>
                                    <button class="btn-icon" title="Preview/Print" onclick="generateAdsBillPDF('${b.id}', true)"><i class="fas fa-eye"></i></button>
                                    <button class="btn-icon" title="Download PDF" onclick="generateAdsBillPDF('${b.id}', false)"><i class="fas fa-download"></i></button>
                                    <button class="btn-icon" title="Edit" onclick="editAdsBill('${b.id}')"><i class="fas fa-edit"></i></button>
                                    <button class="btn-icon" style="color:var(--red)" title="Delete" onclick="deleteAdsBill('${b.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>`;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function editAdsBill(id) {
    switchAdsTab(document.querySelectorAll('.tabs .tab-btn')[0], 'create');
    renderAdsBillForm(id);
}

function updateAdsStatus(id, stat) {
    const list = DB.getAdsBills();
    const idx = list.findIndex(b => b.id === id);
    if (idx > -1) { list[idx].status = stat; DB.setAdsBills(list); }
}

function deleteAdsBill(id) {
    if (!confirm('Delete this bill?')) return;
    DB.setAdsBills(DB.getAdsBills().filter(b => b.id !== id));
    renderAdsBillsList();
}

function generateAdsBillPDF(id, previewOnly) {
    const b = DB.getAdsBills().find(x => x.id === id);
    if (!b) return alert('Bill not found.');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const w = 210;

    // 1. Header Block (Pink #F4A7B9)
    doc.setFillColor(244, 167, 185);
    doc.rect(0, 0, w, 40, 'F');

    if (b.logo) {
        try { doc.addImage(b.logo, 'PNG', w / 2 - 25, 5, 50, 30); } catch (e) { }
    } else {
        doc.setTextColor(45, 106, 106);
        doc.setFontSize(24); doc.setFont(undefined, 'bold');
        doc.text('ADONIA', w / 2, 25, { align: 'center' });
    }

    // 2. To: Section (Light mint #E8F4F4)
    doc.setFillColor(232, 244, 244);
    doc.rect(14, 45, w - 28, 30, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text('To:', 18, 52);
    doc.text(b.companyName, 25, 52);
    doc.setFont(undefined, 'normal');
    doc.text(b.address || '', 25, 57);
    doc.text(b.phone || '', 25, 62);

    doc.setFont(undefined, 'bold');
    doc.text('Date: ' + fmtDate(b.date), w - 18, 52, { align: 'right' });

    // 3. Name/Designation Row
    doc.setFillColor(45, 106, 106);
    doc.rect(14, 80, w - 28, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Name: ' + (b.recipientName || ''), 18, 86);
    doc.text('Designation: ' + (b.recipientDesignation || ''), 80, 86);
    doc.text(`Bill Month: ${b.monthStart || ''} - ${b.monthEnd || ''}`, w - 18, 86, { align: 'right' });

    // 4. Line Items Table
    const totalUsd = b.items.reduce((s, it) => s + (it.usd || 0), 0);
    const totalBdt = b.items.reduce((s, it) => s + (it.usd * b.rate), 0);

    const rows = b.items.map((it, i) => [
        i + 1, it.desc || '-', it.usd.toFixed(2), b.rate.toFixed(2), (it.usd * b.rate).toFixed(2)
    ]);

    while (rows.length < 10) {
        rows.push([rows.length + 1, '', '', '', '']);
    }

    doc.autoTable({
        head: [['SI', 'Description', 'Cost USD', 'BDT Rate', 'Line Total (BDT)']],
        body: rows,
        startY: 90,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        headStyles: { fillColor: [45, 106, 106] },
        alternateRowStyles: { fillColor: [240, 248, 248] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { halign: 'right', cellWidth: 30 },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 40 }
        },
        styles: { fontSize: 8, font: 'helvetica' }
    });

    const finalY = doc.lastAutoTable.finalY + 2;

    // 5. Subtotal Row
    doc.setFillColor(240, 240, 240);
    doc.rect(14, finalY, w - 28, 8, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'italic');
    doc.text('Subtotal', w / 2 - 20, finalY + 5);
    doc.setFont(undefined, 'normal');
    const subUsdY = finalY + 5;
    doc.text(totalUsd.toFixed(2), 154, subUsdY, { align: 'right' });
    doc.text(totalBdt.toFixed(2), w - 18, subUsdY, { align: 'right' });

    // 6. Total Row
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text('Total', 18, finalY + 20);
    doc.text('৳ ' + Math.round(totalBdt).toLocaleString(), w - 18, finalY + 20, { align: 'right' });

    const filename = `${b.companyName.replace(/\s+/g, '_')}_${(b.monthStart || 'Bill').replace(/\s+/g, '_')}_Ads_Bill.pdf`;
    if (previewOnly) {
        window.open(doc.output('bloburl'), '_blank');
    } else {
        doc.save(filename);
    }
}
