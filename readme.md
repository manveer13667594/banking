# 🏦 BankName — Full-Stack Banking Web App

> **This project is built as a college project for learning purposes.**

A full-stack banking web application with real authentication, account management, transactions, loan processing, an admin panel, and a support ticket system.

---

## 📸 Preview

| Dashboard | Accounts | Admin Panel |
|-----------|----------|-------------|
| View account balances and recent transactions | Deposit, withdraw, manage accounts | Approve loans, reply to tickets, manage users |

---

## ✨ Features

### 👤 Customer
- Register and log in securely (JWT-based auth)
- View personal dashboard with account summary and recent transactions
- Manage multiple accounts (Savings, Checking, Fixed Deposit)
- Deposit and withdraw funds
- Transfer money to other accounts by account number
- Apply for loans and track status
- Pay EMI directly from an account
- View full transaction history with search and filters
- Update profile info and change password
- Submit support tickets and view admin replies

### 🛠️ Admin
- Separate employee login with Employee ID
- Dashboard with live stats (users, accounts, transactions, balances)
- Approve or reject pending loan applications
- Manually deposit or withdraw from any account
- View and reply to customer support tickets
- Browse all registered customers and accounts

---

## 🗂️ Project Structure

```
project/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # Register, login, admin login
│   │   ├── userController.js      # Profile, dashboard, loans, password
│   │   ├── accountController.js   # Account CRUD
│   │   ├── transactionController.js # Deposit, withdraw, transfer
│   │   ├── adminController.js     # Admin actions
│   │   └── supportController.js   # Support tickets
│   ├── middleware/
│   │   └── auth.js                # JWT protect + role restrict
│   ├── models/
│   │   ├── User.js
│   │   ├── Account.js
│   │   ├── Transaction.js
│   │   ├── Loan.js
│   │   └── SupportTicket.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── accountRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── adminRoutes.js
│   │   └── supportRoutes.js
│   ├── utils/
│   │   └── logger.js
│   ├── fixdb.js                   # One-time DB migration script
│   ├── server.js
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── loginPage/
    │   ├── login.html             # Customer + Employee login (pill toggle)
    │   ├── openAccount.html       # Customer registration
    │   ├── adminSignup.html       # Admin registration
    │   ├── loginScript.js
    │   ├── signupScript.js
    │   └── loginStyles.css
    ├── dashboardPage/
    │   ├── dashboard.html
    │   ├── dashboardScript.js
    │   └── dashboardStyles.css
    ├── accountsPage/
    │   └── accounts.html
    ├── transactionPage/
    │   └── transactions.html
    ├── transferPage/
    │   └── transfer.html
    ├── loansPage/
    │   └── loans.html
    ├── profilePage/
    │   └── profile.html
    ├── supportPage/
    │   └── support.html
    ├── cardsPage/
    │   └── cards.html
    ├── adminPage/
    │   └── admin.html
    ├── landingPage/
    │   ├── landingPage.html
    │   ├── landingPageJs.js
    │   └── landinPageCss.css
    ├── logicFile.js               # All page logic, API calls, modals, toasts
    └── styles.css
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JSON Web Tokens (JWT) |
| Password Hashing | bcryptjs |
| Security | helmet, express-rate-limit, express-mongo-sanitize |

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) running locally on port `27017`
- A static file server for the frontend (e.g. VS Code Live Server)

### 1. Clone or extract the project
```bash
# If using git
git clone https://github.com/manveer13667594/banking.git
cd project

# Or just extract the zip and open the folder
```

### 2. Configure environment variables
The `.env` file is already included. Open `backend/.env` and update if needed:
```env
PORT=5000
DB_URI=mongodb://127.0.0.1:27017/bankingDB
JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=7d
```
> ⚠️ Change `JWT_SECRET` to something long and random before sharing the project.

### 3. Install backend dependencies
```bash
cd backend
npm install
```

### 4. (First time only) Fix the database if you have existing data
```bash
node fixdb.js
```
> This patches any transactions with missing reference IDs that would cause E11000 errors. Safe to skip on a fresh install. Delete the file after running.

### 5. Start the backend server
```bash
npm run dev       # development (auto-restarts with nodemon)
# or
npm start         # production
```
The API will be running at `http://localhost:5000`

### 6. Open the frontend
Open `index.html` in a browser — or use **VS Code Live Server** for best results.

> If using Live Server, right-click `index.html` → *Open with Live Server*

---

## 🚀 Usage

### Customer Flow
1. Go to `loginPage/openAccount.html` to register
2. Log in at `loginPage/login.html`
3. You are redirected to your **Dashboard**
4. Use the sidebar to navigate to Accounts, Transactions, Transfer, Loans, Profile, Support

### Admin Flow
1. Register an admin at `loginPage/adminSignup.html` (requires an Employee ID)
2. Log in at `loginPage/login.html` → click **Employee Login** tab
3. You are redirected to the **Admin Panel**

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new customer |
| POST | `/api/auth/register-admin` | Register a new admin (requires employeeId) |
| POST | `/api/auth/login` | Customer login |
| POST | `/api/auth/admin-login` | Admin login with employeeId |
| GET | `/api/auth/me` | Get current logged-in user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/dashboard` | Full dashboard data (accounts, transactions, loans) |
| PATCH | `/api/users/:id` | Update profile info |
| POST | `/api/users/change-password` | Change password |
| GET | `/api/users/loans/my` | Get my loans |
| POST | `/api/users/loans` | Apply for a loan |
| PATCH | `/api/users/loans/:id/pay` | Pay EMI |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/my` | Get my accounts |
| POST | `/api/accounts` | Open a new account |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transactions/deposit` | Deposit funds |
| POST | `/api/transactions/withdraw` | Withdraw funds |
| POST | `/api/transactions/transfer` | Transfer to another account |
| GET | `/api/transactions/my` | My transaction history (supports `?accountId=&search=&type=&page=&limit=`) |

### Support
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/support` | Submit a support ticket |
| GET | `/api/support/my` | Get my tickets |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Overview statistics |
| GET | `/api/admin/loans` | All loan applications |
| PATCH | `/api/admin/loans/:id/approve` | Approve a loan |
| PATCH | `/api/admin/loans/:id/reject` | Reject a loan |
| POST | `/api/admin/deposit` | Manually deposit to any account |
| POST | `/api/admin/withdraw` | Manually withdraw from any account |
| GET | `/api/admin/tickets` | All support tickets |
| PATCH | `/api/admin/tickets/:id/reply` | Reply to a ticket |
| GET | `/api/admin/users` | All customers |
| GET | `/api/admin/accounts` | All accounts |

---

## 📄 License

This project is built for **educational purposes** as part of a BCA college project. Not intended for production use.

---

## 👨‍💻 Author

~ Manveer Singh