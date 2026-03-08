const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Account = require('../models/Account');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'changeme_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phone, dateOfBirth, address, accountType } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ fullName, email, password, phone, dateOfBirth, address });
    const account = await Account.create({ user: user._id, accountType: accountType || 'savings' });
    const token = signToken(user);
    res.status(201).json({
      message: 'Registration successful', token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role },
      account: { accountNumber: account.accountNumber, accountType: account.accountType, balance: account.balance },
    });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// POST /api/auth/register-admin
exports.registerAdmin = async (req, res) => {
  try {
    const { fullName, email, password, phone, employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: 'Employee ID is required' });
    const exists = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (exists) return res.status(409).json({ message: 'Email or Employee ID already registered' });
    const user = await User.create({ fullName, email, password, phone, role: 'admin', employeeId });
    const token = signToken(user);
    res.status(201).json({
      message: 'Admin account created', token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, employeeId: user.employeeId },
    });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is disabled' });
    const token = signToken(user);
    res.json({ message: 'Login successful', token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/auth/admin-login
exports.adminLogin = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) return res.status(400).json({ message: 'Employee ID and password are required' });
    const user = await User.findOne({ employeeId, role: 'admin' }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid Employee ID or password' });
    if (!user.isActive) return res.status(403).json({ message: 'Account is disabled' });
    const token = signToken(user);
    res.json({ message: 'Admin login successful', token,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, employeeId: user.employeeId } });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const accounts = await Account.find({ user: user._id, isActive: true });
    res.json({ user, accounts });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
