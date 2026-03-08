const Account = require('../models/Account');

// GET /api/accounts/my  — logged-in user's accounts
exports.getMyAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user.id, isActive: true });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/accounts/:id
exports.getAccountById = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).populate('user', 'fullName email');
    if (!account) return res.status(404).json({ message: 'Account not found' });

    // Users can only view their own accounts
    if (req.user.role !== 'admin' && account.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/accounts  — open an additional account
exports.createAccount = async (req, res) => {
  try {
    const { accountType } = req.body;
    const account = await Account.create({ user: req.user.id, accountType });
    res.status(201).json({ message: 'Account opened', account });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/accounts  — admin: all accounts
exports.getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.find().populate('user', 'fullName email');
    res.json({ count: accounts.length, accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};