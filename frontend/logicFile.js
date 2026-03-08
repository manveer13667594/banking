const API = 'http://localhost:5000/api';

// ============ AUTH HELPERS ============
function getToken() { return localStorage.getItem('token'); }

function isLoggedIn() { return !!getToken(); }

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() };
}

function handleLogout() {
  localStorage.clear();
  window.location.replace('../loginPage/login.html');
}

// ============ NAVIGATION ============
function navigateTo(page) { window.location.href = page; }

// ============ PAGE AUTH GUARD ============
const PROTECTED = ['dashboard.html','transactions.html','profile.html',
  'cards.html','accounts.html','transfer.html','loans.html','support.html',''];

document.addEventListener('DOMContentLoaded', async function () {
  const page = window.location.pathname.split('/').pop();

  if (PROTECTED.includes(page)) {
    if (!isLoggedIn()) {
      window.location.replace('../loginPage/login.html');
      return;
    }
    // Verify token is still valid
    try {
      const r = await fetch(API + '/auth/me', { headers: authHeaders() });
      if (!r.ok) { localStorage.clear(); window.location.replace('../loginPage/login.html'); return; }
    } catch (e) { /* server might be loading, allow through */ }
  }

  // Page-specific loaders
  if (page === 'accounts.html')      { fetchAccounts(); }
  if (page === 'profile.html')       { fetchMe().then(fillProfile); }
  if (page === 'dashboard.html')     { fetchDashboard(); }
  if (page === 'transactions.html')  { initTransactionsPage(); }
  if (page === 'transfer.html')      { fetchMe().then(d => { if (d) populateAccountOptions('from-account', d.accounts); }); }
  if (page === 'loans.html')         { fetchLoans(); }
  if (page === 'support.html')       { fetchMyTickets(); }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      if (this.getAttribute('href') !== '#') {
        e.preventDefault();
        document.querySelector(this.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

// ============ API HELPERS ============
async function fetchMe() {
  try {
    const r = await fetch(API + '/auth/me', { headers: authHeaders() });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// ============ PROFILE ============
function fillProfile(data) {
  if (!data || !data.user) return;
  const u = data.user;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('full-name', u.fullName);
  set('email-address', u.email);
  set('phone-number', u.phone);
  if (u.address && typeof u.address === 'object') {
    set('address', [u.address.street, u.address.city, u.address.state, u.address.zip].filter(Boolean).join(', '));
  } else { set('address', u.address); }
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  const userId = localStorage.getItem('userId');
  const body = {
    fullName: document.getElementById('full-name')?.value,
    email:    document.getElementById('email-address')?.value,
    phone:    document.getElementById('phone-number')?.value,
  };
  try {
    const r = await fetch(`${API}/users/${userId}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body)
    });
    const d = await r.json();
    if (r.ok) { showToast('Profile updated successfully', 'success'); }
    else { showToast(d.message || 'Update failed', 'error'); }
  } catch { showToast('Server error', 'error'); }
}

function handlePasswordChange(event) {
  event.preventDefault();
  const currentPwd = document.getElementById('current-pwd').value;
  const newPwd     = document.getElementById('new-pwd').value;
  const confirmPwd = document.getElementById('confirm-pwd').value;
  if (newPwd !== confirmPwd) { showToast('New passwords do not match', 'error'); return; }
  if (newPwd.length < 6)    { showToast('Password must be at least 6 characters', 'error'); return; }

  fetch(API + '/users/change-password', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
  }).then(r => r.json()).then(d => {
    if (d.message === 'Password updated successfully') {
      showToast('Password updated!', 'success');
      document.querySelector('.settings-form')?.reset();
    } else { showToast(d.message || 'Failed to update password', 'error'); }
  }).catch(() => showToast('Server error', 'error'));
}

// ============ PROFILE TABS ============
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabName + '-tab')?.classList.add('active');
  event.target.classList.add('active');
}

// ============ DASHBOARD ============
async function fetchDashboard() {
  try {
    const r = await fetch(API + '/users/dashboard', { headers: authHeaders() });
    if (!r.ok) return;
    const data = await r.json();
    populateDashboard(data);
  } catch (err) { console.error('Dashboard error:', err); }
}

function populateDashboard(data) {
  if (!data || !data.user) return;
  const welcome = document.querySelector('.welcome-card h2');
  if (welcome) welcome.textContent = `Welcome Back, ${data.user.fullName || ''}!`;

  const grid = document.querySelector('.accounts-overview .accounts-grid');
  if (grid && data.accounts) {
    grid.innerHTML = '';
    if (data.accounts.length === 0) {
      grid.innerHTML = '<p>No accounts found.</p>';
    } else {
      data.accounts.forEach(acc => {
        const card = document.createElement('div');
        card.className = 'account-card';
        card.innerHTML = `
          <div class="account-header">
            <span class="account-type">${capitalize(acc.accountType)} Account</span>
            <span class="account-number">****${String(acc.accountNumber).slice(-4)}</span>
          </div>
          <div class="account-balance"><p>Total Balance</p><h2>${formatCurrency(acc.balance)}</h2></div>
          <div class="account-footer">
            <button class="btn-small" onclick="window.location.href='../accountsPage/accounts.html?id=${acc._id}'">View Details</button>
          </div>`;
        grid.appendChild(card);
      });
    }
  }

  // Recent transactions
  const list = document.querySelector('.transactions-list');
  if (list && data.transactions) {
    list.innerHTML = '';
    if (data.transactions.length === 0) {
      list.innerHTML = '<p style="padding:1rem;color:#6b7280">No transactions yet.</p>';
    } else {
      data.transactions.slice(0, 5).forEach(tx => {
        const isDebit = tx.type === 'withdrawal' || tx.type === 'transfer';
        const icon = tx.type === 'deposit' ? '💰' : tx.type === 'transfer' ? '↔️' : '💸';
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.innerHTML = `
          <div class="transaction-info">
            <span class="transaction-icon">${icon}</span>
            <div class="transaction-details">
              <p class="transaction-name">${tx.description || capitalize(tx.type)}</p>
              <p class="transaction-date">${new Date(tx.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
            </div>
          </div>
          <span class="transaction-amount ${isDebit ? 'negative' : 'positive'}">
            ${isDebit ? '-' : '+'}${formatCurrency(tx.amount)}
          </span>`;
        list.appendChild(item);
      });
    }
  }
}

// ============ ACCOUNTS PAGE ============
async function fetchAccounts() {
  const data = await fetchMe();
  const container = document.getElementById('accounts-list');
  if (!container) return;
  if (!data) { container.innerHTML = '<p>Please log in to see your accounts.</p>'; return; }
  renderAccounts(data.accounts || []);
}

function renderAccounts(accounts) {
  const container = document.getElementById('accounts-list');
  container.innerHTML = '';
  if (!accounts || accounts.length === 0) {
    container.innerHTML = '<p>No accounts found.</p>'; return;
  }
  accounts.forEach(acc => {
    const card = document.createElement('div');
    card.className = 'account-detailed-card';
    card.innerHTML = `
      <div class="account-card-header">
        <h3>${capitalize(acc.accountType)} Account</h3>
        <span class="account-number">Account No: ${acc.accountNumber}</span>
      </div>
      <div class="account-card-content">
        <div class="account-info-row"><span class="label">Balance:</span><span class="value">${formatCurrency(acc.balance)}</span></div>
        <div class="account-info-row"><span class="label">Interest Rate:</span><span class="value">${acc.interestRate || 3.5}% p.a.</span></div>
        <div class="account-info-row"><span class="label">Status:</span>
          <span class="value status-${acc.isActive ? 'active' : 'inactive'}">${acc.isActive ? '✓ Active' : 'Inactive'}</span>
        </div>
      </div>
      <div class="account-card-actions">
        <button class="btn-secondary" onclick="openDepositModal('${acc._id}','${acc.accountNumber}')">💰 Deposit</button>
        <button class="btn-secondary" onclick="openWithdrawModal('${acc._id}','${acc.accountNumber}',${acc.balance})">💸 Withdraw</button>
        <button class="btn-secondary" onclick="window.location.href='../transactionPage/transactions.html'">View Transactions</button>
      </div>`;
    container.appendChild(card);
  });
}

// ── Deposit / Withdraw modals ──
function openDepositModal(accountId, accountNumber) {
  showModal(`
    <h3>Deposit Funds</h3>
    <p style="color:#6b7280;margin-bottom:1rem">To account: ****${String(accountNumber).slice(-4)}</p>
    <div class="form-group"><label>Amount</label>
      <input type="number" id="modal-amount" placeholder="0.00" min="1" style="width:100%;padding:.5rem;border:1px solid #d1d5db;border-radius:.5rem">
    </div>
    <div class="form-group"><label>Description (optional)</label>
      <input type="text" id="modal-desc" placeholder="e.g. Cash deposit" style="width:100%;padding:.5rem;border:1px solid #d1d5db;border-radius:.5rem">
    </div>
    <div style="display:flex;gap:.5rem;margin-top:1rem">
      <button class="btn-primary" onclick="submitDeposit('${accountId}')">Deposit</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function submitDeposit(accountId) {
  const amount = parseFloat(document.getElementById('modal-amount').value);
  const desc   = document.getElementById('modal-desc').value;
  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
  try {
    const r = await fetch(API + '/transactions/deposit', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ accountId, amount, description: desc })
    });
    const d = await r.json();
    if (r.ok) { closeModal(); showToast('Deposit successful!', 'success'); setTimeout(() => fetchAccounts(), 800); }
    else { showToast(d.message || d.error || 'Deposit failed', 'error'); }
  } catch { showToast('Server error', 'error'); }
}

function openWithdrawModal(accountId, accountNumber, balance) {
  showModal(`
    <h3>Withdraw Funds</h3>
    <p style="color:#6b7280;margin-bottom:.25rem">From account: ****${String(accountNumber).slice(-4)}</p>
    <p style="color:#16a34a;font-weight:600;margin-bottom:1rem">Available: ${formatCurrency(balance)}</p>
    <div class="form-group"><label>Amount</label>
      <input type="number" id="modal-amount" placeholder="0.00" min="1" max="${balance}" style="width:100%;padding:.5rem;border:1px solid #d1d5db;border-radius:.5rem">
    </div>
    <div class="form-group"><label>Description (optional)</label>
      <input type="text" id="modal-desc" placeholder="e.g. ATM withdrawal" style="width:100%;padding:.5rem;border:1px solid #d1d5db;border-radius:.5rem">
    </div>
    <div style="display:flex;gap:.5rem;margin-top:1rem">
      <button class="btn-primary" onclick="submitWithdraw('${accountId}')">Withdraw</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function submitWithdraw(accountId) {
  const amount = parseFloat(document.getElementById('modal-amount').value);
  const desc   = document.getElementById('modal-desc').value;
  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
  try {
    const r = await fetch(API + '/transactions/withdraw', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ accountId, amount, description: desc })
    });
    const d = await r.json();
    if (r.ok) { closeModal(); showToast('Withdrawal successful!', 'success'); setTimeout(() => fetchAccounts(), 800); }
    else { showToast(d.message || d.error || 'Withdrawal failed', 'error'); }
  } catch { showToast('Server error', 'error'); }
}

async function handleAddNewAccount() {
  showModal(`
    <h3>Open New Account</h3>
    <div class="form-group"><label>Account Type</label>
      <select id="modal-acc-type" style="width:100%;padding:.5rem;border:1px solid #d1d5db;border-radius:.5rem">
        <option value="savings">Savings</option>
        <option value="checking">Checking</option>
        <option value="fixed-deposit">Fixed Deposit</option>
      </select>
    </div>
    <div style="display:flex;gap:.5rem;margin-top:1rem">
      <button class="btn-primary" onclick="submitNewAccount()">Open Account</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function submitNewAccount() {
  const accountType = document.getElementById('modal-acc-type').value;
  try {
    const r = await fetch(API + '/accounts', {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ accountType })
    });
    const d = await r.json();
    if (r.ok) { closeModal(); showToast('Account created!', 'success'); setTimeout(() => fetchAccounts(), 800); }
    else { showToast(d.message || d.error || 'Failed', 'error'); }
  } catch { showToast('Server error', 'error'); }
}

// ============ TRANSACTIONS PAGE ============
let txState = { page: 1, totalPages: 1, accountId: '', search: '', type: '' };

async function initTransactionsPage() {
  const data = await fetchMe();
  if (!data || !data.accounts) return;
  populateAccountOptions('transaction-account', data.accounts);
  const sel = document.getElementById('transaction-account');
  if (data.accounts.length > 0) {
    txState.accountId = data.accounts[0]._id;
    sel.value = data.accounts[0]._id;
    loadTransactions();
  }
  sel?.addEventListener('change', () => { txState.accountId = sel.value; txState.page = 1; loadTransactions(); });

  // Search
  const searchInput = document.querySelector('.search-input');
  const searchBtn   = document.querySelector('.search-btn');
  if (searchBtn) searchBtn.addEventListener('click', () => { txState.search = searchInput?.value || ''; txState.page = 1; loadTransactions(); });
  if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { txState.search = searchInput.value; txState.page = 1; loadTransactions(); } });

  // Type filter
  const typeFilter = document.querySelectorAll('.filter-select')[1];
  if (typeFilter) typeFilter.addEventListener('change', () => {
    const v = typeFilter.value.toLowerCase();
    txState.type = v === 'credit' ? 'deposit' : v === 'debit' ? 'withdrawal' : '';
    txState.page = 1; loadTransactions();
  });

  // Pagination
  document.querySelector('.btn-pagination:first-of-type')?.addEventListener('click', () => {
    if (txState.page > 1) { txState.page--; loadTransactions(); }
  });
  document.querySelector('.btn-pagination:last-of-type')?.addEventListener('click', () => {
    if (txState.page < txState.totalPages) { txState.page++; loadTransactions(); }
  });
}

async function loadTransactions() {
  if (!txState.accountId) return;
  const params = new URLSearchParams({ accountId: txState.accountId, page: txState.page, limit: 10 });
  if (txState.search) params.append('search', txState.search);
  if (txState.type)   params.append('type', txState.type);

  try {
    const r = await fetch(`${API}/transactions/my?${params}`, { headers: authHeaders() });
    const d = await r.json();
    if (r.ok) {
      txState.totalPages = d.pages || 1;
      renderTransactions(d.transactions || []);
      const info = document.querySelector('.pagination-info');
      if (info) info.textContent = `Page ${txState.page} of ${txState.totalPages}`;
    }
  } catch (err) { console.error('Transactions error:', err); }
}

function renderTransactions(transactions) {
  const tbody = document.querySelector('.transactions-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#6b7280">No transactions found.</td></tr>';
    return;
  }
  transactions.forEach(tx => {
    const row = document.createElement('tr');
    const date = new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const isDebit = tx.type === 'withdrawal' || tx.type === 'transfer';
    row.innerHTML = `
      <td>${date}</td>
      <td>${tx.description || capitalize(tx.type)}</td>
      <td>${isDebit ? formatCurrency(tx.amount) : '<span class="empty">--</span>'}</td>
      <td>${!isDebit ? formatCurrency(tx.amount) : '<span class="empty">--</span>'}</td>
      <td>${formatCurrency(tx.balanceAfter || 0)}</td>`;
    tbody.appendChild(row);
  });
}

// For dashboard recent transactions list (also used there)
async function loadTransactionsForFirstAccount() {
  const data = await fetchMe();
  if (!data || !data.accounts || data.accounts.length === 0) return;
  const r = await fetch(`${API}/transactions/my?accountId=${data.accounts[0]._id}&limit=10`, { headers: authHeaders() });
  const d = await r.json();
  if (r.ok && d.transactions) renderTransactions(d.transactions);
}

// ============ TRANSFER PAGE ============
async function handleTransfer(event) {
  event.preventDefault();
  const fromAccountId  = document.getElementById('from-account')?.value;
  const toAccountNumber = document.getElementById('beneficiary')?.value.trim();
  const amount         = parseFloat(document.getElementById('amount')?.value);
  const description    = document.getElementById('description')?.value || '';

  if (!fromAccountId || !toAccountNumber || !amount) {
    showToast('Please fill all required fields', 'error'); return;
  }
  if (isNaN(amount) || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

  // Check balance client side
  const sel = document.getElementById('from-account');
  if (sel?.selectedOptions[0]?.dataset?.balance) {
    if (parseFloat(sel.selectedOptions[0].dataset.balance) < amount) {
      showToast('Insufficient funds', 'error'); return;
    }
  }

  try {
    const r = await fetch(API + '/transactions/transfer', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ fromAccountId, toAccountNumber, amount, description })
    });
    const d = await r.json();
    if (r.ok) {
      showToast(d.message || 'Transfer successful!', 'success');
      setTimeout(() => window.location.href = '../transactionPage/transactions.html', 1200);
    } else { showToast(d.message || d.error || 'Transfer failed', 'error'); }
  } catch { showToast('Server error', 'error'); }
}

function selectBeneficiary(element) {
  const acctEl = element.querySelector('.beneficiary-account');
  document.getElementById('beneficiary').value = acctEl ? acctEl.textContent.replace(/\*/g,'').trim() : '';
}

// ============ LOANS PAGE ============
async function fetchLoans() {
  try {
    const r = await fetch(API + '/users/loans/my', { headers: authHeaders() });
    const d = await r.json();
    if (r.ok && d.loans) { renderLoans(d.loans); renderLoanSummary(d.loans); }
  } catch (err) { console.error('Loans error:', err); }
}

function renderLoanSummary(loans) {
  const grid = document.querySelector('.loan-summary .summary-grid');
  if (!grid) return;
  const active = loans.filter(l => l.status === 'active');
  grid.innerHTML = `
    <div class="summary-card"><span class="summary-label">Total Loans</span><span class="summary-value">${loans.length}</span></div>
    <div class="summary-card"><span class="summary-label">Active Loans</span><span class="summary-value">${active.length}</span></div>
    <div class="summary-card"><span class="summary-label">Total Outstanding</span><span class="summary-value">${formatCurrency(active.reduce((s,l)=>s+(l.outstanding||0),0))}</span></div>
    <div class="summary-card"><span class="summary-label">Monthly EMI</span><span class="summary-value">${formatCurrency(active.reduce((s,l)=>s+(l.emi||0),0))}</span></div>`;
}

function renderLoans(loans) {
  const grid = document.querySelector('.loans-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (loans.length === 0) { grid.innerHTML = '<p style="color:#6b7280">No loans found.</p>'; return; }
  loans.forEach(l => {
    const statusColor = { pending:'#f59e0b', active:'#16a34a', closed:'#6b7280', rejected:'#dc2626' };
    const card = document.createElement('div');
    card.className = 'loan-card';
    card.innerHTML = `
      <div class="loan-header">
        <h4>Loan #${l._id.slice(-6)}</h4>
        <span class="loan-status" style="color:${statusColor[l.status]||'#374151'}">${capitalize(l.status)}</span>
      </div>
      <div class="loan-details">
        <div class="detail-row"><span class="label">Principal:</span><span class="value">${formatCurrency(l.principal)}</span></div>
        <div class="detail-row"><span class="label">Outstanding:</span><span class="value">${formatCurrency(l.outstanding)}</span></div>
        <div class="detail-row"><span class="label">Interest Rate:</span><span class="value">${l.interestRate}% p.a.</span></div>
        <div class="detail-row"><span class="label">Monthly EMI:</span><span class="value">${formatCurrency(l.emi)}</span></div>
        ${l.description ? `<div class="detail-row"><span class="label">Purpose:</span><span class="value">${l.description}</span></div>` : ''}
      </div>
      ${l.status === 'pending' ? '<p style="color:#f59e0b;font-size:.85rem;padding:.5rem 0">⏳ Awaiting admin approval</p>' : ''}
      ${l.status === 'active' ? `
        <div class="loan-actions">
          <button class="btn-secondary" onclick="openPayEMIModal('${l._id}',${l.emi},${l.outstanding})">Pay EMI</button>
        </div>` : ''}`;
    grid.appendChild(card);
  });
}

function showApplyLoanForm() {
  const section = document.getElementById('apply-loan-form');
  if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

async function handleApplyLoan(event) {
  if (event) event.preventDefault();
  const principal = parseFloat(document.getElementById('loan-principal')?.value);
  const term      = parseInt(document.getElementById('loan-term')?.value, 10);
  const rate      = parseFloat(document.getElementById('loan-rate')?.value) || 7.5;
  const purpose   = document.getElementById('loan-purpose')?.value || '';

  if (!principal || principal <= 0) { showToast('Enter a valid principal amount', 'error'); return; }
  if (!term || term <= 0)           { showToast('Enter a valid loan term', 'error'); return; }

  try {
    const r = await fetch(API + '/users/loans', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ principal, termMonths: term, interestRate: rate, purpose })
    });
    const d = await r.json();
    if (r.ok) {
      showToast('Loan application submitted! Awaiting admin approval.', 'success');
      document.getElementById('apply-loan-form').style.display = 'none';
      document.getElementById('apply-loan-form').querySelector('form')?.reset();
      setTimeout(fetchLoans, 800);
    } else { showToast(d.message || d.error || 'Application failed', 'error'); }
  } catch { showToast('Server error', 'error'); }
}

function openPayEMIModal(loanId, emi, outstanding) {
  showModal(`
    <h3>Pay EMI</h3>
    <p style="color:#6b7280;margin-bottom:.5rem">Outstanding: ${formatCurrency(outstanding)}</p>
    <p style="margin-bottom:1rem">Suggested EMI: <strong>${formatCurrency(emi)}</strong></p>
    <div class="form-group"><label>Select Account</label>
      <select id="modal-emi-acc" style="width:100%;padding:.5rem;border:1px solid #d1d5db;border-radius:.5rem">
        <option value="">Loading...</option>
      </select>
    </div>
    <div class="form-group"><label>Amount</label>
      <input type="number" id="modal-emi-amount" value="${emi}" min="1" style="width:100%;padding:.5rem;border:1px solid #d1d5db;border-radius:.5rem">
    </div>
    <div style="display:flex;gap:.5rem;margin-top:1rem">
      <button class="btn-primary" onclick="submitPayEMI('${loanId}')">Pay</button>
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>`);
  // Populate accounts
  fetchMe().then(d => {
    const sel = document.getElementById('modal-emi-acc');
    if (!sel || !d) return;
    sel.innerHTML = d.accounts.map(a => `<option value="${a._id}">****${String(a.accountNumber).slice(-4)} - ${formatCurrency(a.balance)}</option>`).join('');
  });
}

async function submitPayEMI(loanId) {
  const amount    = parseFloat(document.getElementById('modal-emi-amount').value);
  const accountId = document.getElementById('modal-emi-acc').value;
  if (!amount || amount <= 0) { showToast('Invalid amount', 'error'); return; }
  try {
    const r = await fetch(`${API}/users/loans/${loanId}/pay`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ amount, accountId })
    });
    const d = await r.json();
    if (r.ok) { closeModal(); showToast('EMI paid!', 'success'); setTimeout(fetchLoans, 800); }
    else { showToast(d.message || d.error || 'Payment failed', 'error'); }
  } catch { showToast('Server error', 'error'); }
}

// ============ SUPPORT PAGE ============
async function fetchMyTickets() {
  try {
    const r = await fetch(API + '/support/my', { headers: authHeaders() });
    const d = await r.json();
    if (r.ok && d.tickets) renderMyTickets(d.tickets);
  } catch (err) { console.error('Support error:', err); }
}

function renderMyTickets(tickets) {
  const container = document.getElementById('my-tickets-list');
  if (!container) return;
  if (tickets.length === 0) { container.innerHTML = '<p style="color:#6b7280">No tickets yet.</p>'; return; }
  container.innerHTML = '';
  tickets.forEach(t => {
    const statusColor = { open:'#f59e0b', 'in-progress':'#3b82f6', resolved:'#16a34a' };
    const div = document.createElement('div');
    div.className = 'ticket-card';
    div.style.cssText = 'background:#f9fafb;border:1px solid #e5e7eb;border-radius:.75rem;padding:1rem;margin-bottom:.75rem';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
        <strong>${t.subject}</strong>
        <span style="color:${statusColor[t.status]};font-size:.8rem;font-weight:600">${capitalize(t.status)}</span>
      </div>
      <p style="color:#6b7280;font-size:.85rem">${t.message}</p>
      <p style="color:#9ca3af;font-size:.75rem;margin-top:.25rem">${new Date(t.createdAt).toLocaleDateString()}</p>
      ${t.adminReply ? `
        <div style="margin-top:.75rem;padding:.75rem;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:0 .5rem .5rem 0">
          <p style="font-size:.8rem;font-weight:600;color:#1d4ed8">Admin Reply:</p>
          <p style="font-size:.85rem;color:#374151">${t.adminReply}</p>
          <p style="font-size:.75rem;color:#9ca3af">${new Date(t.repliedAt).toLocaleDateString()}</p>
        </div>` : ''}`;
    container.appendChild(div);
  });
}

async function handleSupportForm(event) {
  event.preventDefault();
  const issueType = document.getElementById('issue-type')?.value;
  const subject   = document.getElementById('subject')?.value;
  const message   = document.getElementById('message')?.value;
  if (!subject || !message) { showToast('Please fill all required fields', 'error'); return; }
  try {
    const r = await fetch(API + '/support', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ issueType, subject, message })
    });
    const d = await r.json();
    if (r.ok) {
      showToast('Ticket submitted! We will get back to you soon.', 'success');
      document.querySelector('.support-form')?.reset();
      fetchMyTickets();
    } else { showToast(d.message || 'Submission failed', 'error'); }
  } catch { showToast('Server error', 'error'); }
}

function toggleFAQ(element) { element.parentElement.classList.toggle('open'); }
function handleStartChat()  { showToast('Live chat coming soon!', 'info'); }
function handleCallSupport(){ showToast('Call 1-800-BANK-NOW for support', 'info'); }
function handleEmailSupport(){ showToast('Email: support@bankname.com', 'info'); }
function handleTicketStatus(){ document.getElementById('my-tickets-list')?.scrollIntoView({ behavior:'smooth' }); }

// ============ UTILITY FUNCTIONS ============
function populateAccountOptions(selectId, accounts) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select account</option>';
  (accounts || []).forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc._id;
    opt.textContent = `${capitalize(acc.accountType)} - ****${String(acc.accountNumber).slice(-4)} - ${formatCurrency(acc.balance)}`;
    opt.dataset.balance = acc.balance;
    sel.appendChild(opt);
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function validateAmount(amount) { return !isNaN(amount) && parseFloat(amount) > 0; }

// ============ MODAL SYSTEM ============
function showModal(html) {
  let overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center';
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div style="background:white;border-radius:1rem;padding:1.5rem;min-width:320px;max-width:480px;width:90%;max-height:90vh;overflow-y:auto">${html}</div>`;
  overlay.style.display = 'flex';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:2000;display:flex;flex-direction:column;gap:.5rem';
    document.body.appendChild(container);
  }
  const colors = { success:'#16a34a', error:'#dc2626', info:'#3b82f6', warning:'#f59e0b' };
  const toast = document.createElement('div');
  toast.style.cssText = `background:${colors[type]||colors.info};color:white;padding:.75rem 1.25rem;border-radius:.75rem;font-size:.9rem;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:320px;animation:slideIn .3s ease`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ============ RANGE SLIDERS ============
document.querySelectorAll('.limit-slider').forEach(slider => {
  slider.addEventListener('input', function() {
    const pct = (this.value / this.max) * 100;
    this.style.background = `linear-gradient(to right,#16a34a 0%,#16a34a ${pct}%,#e5e7eb ${pct}%,#e5e7eb 100%)`;
    const lv = this.closest('.limit-item')?.querySelector('.limit-value');
    if (lv) lv.textContent = '$' + parseFloat(this.value).toLocaleString('en-US');
  });
});

// Toast animation
const toastStyle = document.createElement('style');
toastStyle.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`;
document.head.appendChild(toastStyle);

// Cards page - show user name
window.addEventListener('load', () => {
  if (window.location.pathname.endsWith('cards.html')) {
    const n = localStorage.getItem('userFullName');
    if (n) document.querySelectorAll('.card-holder-name,.detail-text').forEach(el => {
      if (el.textContent.trim().toUpperCase() === 'JOHN DOE') el.textContent = n;
    });
  }
});
