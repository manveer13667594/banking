// dashboardScript.js
// NOTE: logicFile.js is loaded BEFORE this file.
// Do NOT re-declare fetchDashboard or populateDashboard here —
// those live in logicFile.js. Only add dashboard-specific extras below.

// Override handleAddNewAccount for the dashboard (uses modal from logicFile.js)
function handleAddNewAccount() {
  showModal(`
    <h3 style="margin-bottom:1rem">Open New Account</h3>
    <div class="form-group" style="margin-bottom:1rem">
      <label style="display:block;margin-bottom:.4rem;font-weight:500">Account Type</label>
      <select id="modal-acc-type" style="width:100%;padding:.6rem;border:1px solid #d1d5db;border-radius:.5rem;font-size:1rem">
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
    const r = await fetch('http://localhost:5000/api/accounts', {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ accountType })
    });
    const d = await r.json();
    if (r.ok) {
      closeModal();
      showToast('Account created successfully!', 'success');
      setTimeout(() => fetchDashboard(), 800);
    } else { showToast(d.message || d.error || 'Failed to create account', 'error'); }
  } catch { showToast('Server error', 'error'); }
}
