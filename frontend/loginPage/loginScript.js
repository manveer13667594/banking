const API = 'http://localhost:5000/api';
let loginType = 'customer';

function setLoginType(type) {
    loginType = type;
    document.getElementById('toggle-customer').classList.toggle('active', type === 'customer');
    document.getElementById('toggle-employee').classList.toggle('active', type === 'employee');
    document.getElementById('customer-fields').style.display = type === 'customer' ? 'block' : 'none';
    document.getElementById('employee-fields').style.display = type === 'employee' ? 'block' : 'none';
    document.getElementById('login-btn').textContent = type === 'customer' ? 'Login' : 'Employee Login';
    // Required attribute
    document.getElementById('email').required = (type === 'customer');
    document.getElementById('employee-id').required = (type === 'employee');
}

async function handleLogin(event) {
    event.preventDefault();
    const password = document.getElementById('password').value;

    try {
        let response, data;
        if (loginType === 'employee') {
            const employeeId = document.getElementById('employee-id').value.trim();
            if (!employeeId) { alert('Employee ID is required'); return; }
            response = await fetch(API + '/auth/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId, password })
            });
        } else {
            const email = document.getElementById('email').value.trim();
            if (!email) { alert('Email is required'); return; }
            response = await fetch(API + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
        }
        data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userFullName', data.user.fullName);
            localStorage.setItem('userRole', data.user.role);

            if (data.user.role === 'admin') {
                window.location.href = '../adminPage/admin.html';
            } else {
                window.location.href = '../dashboardPage/dashboard.html';
            }
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (err) {
        console.error(err);
        alert('Server error. Make sure backend is running.');
    }
}

// Init
setLoginType('customer');
