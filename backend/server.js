require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const db      = require('./config/db');
const logger  = require('./utils/logger');

const authRoutes        = require('./routes/authRoutes');
const userRoutes        = require('./routes/userRoutes');
const accountRoutes     = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const supportRoutes     = require('./routes/supportRoutes');
const adminRoutes       = require('./routes/adminRoutes');

const app = express();

// ── Security Middleware (graceful — works even before npm install) ─────────────
try {
  const rateLimit = require('express-rate-limit');
  // Strict limit on auth endpoints — blocks brute-force login attacks
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 20,
    message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  });
  app.use('/api/auth/login',          authLimiter);
  app.use('/api/auth/admin-login',    authLimiter);
  app.use('/api/auth/register',       authLimiter);
  app.use('/api/auth/register-admin', authLimiter);
  // Global: 300 req / 15 min per IP
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { message: 'Too many requests' } }));
  logger.info('Rate limiting enabled');
} catch (e) { logger.warn('express-rate-limit not installed — run: npm install'); }

try {
  const helmet = require('helmet');
  app.use(helmet({ contentSecurityPolicy: false })); // CSP off since we serve static files from disk
  logger.info('Helmet security headers enabled');
} catch (e) { logger.warn('helmet not installed — run: npm install'); }

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50kb' }));            // blocks huge JSON body attacks
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

try {
  const mongoSanitize = require('express-mongo-sanitize');
  app.use(mongoSanitize()); // strips $ and . from input — prevents NoSQL injection
  logger.info('Mongo sanitize enabled');
} catch (e) { logger.warn('express-mongo-sanitize not installed — run: npm install'); }

// ── Database ──────────────────────────────────────────────────────────────────
db.connect()
  .then(() => logger.info('MongoDB Connected'))
  .catch((err) => { logger.error(`MongoDB Error: ${err.message}`); process.exit(1); });

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Banking API running' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/accounts',     accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/support',      supportRoutes);
app.use('/api/admin',        adminRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found` }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}
module.exports = app;
