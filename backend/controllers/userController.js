const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');

// GET /api/users  (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.json({ count: users.length, users });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id)
      return res.status(403).json({ message: 'Access denied' });
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/users/:id  (self or admin)
exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id)
      return res.status(403).json({ message: 'Access denied' });
    const { password, role, ...safeFields } = req.body;
    const updated = await User.findByIdAndUpdate(req.params.id, safeFields, { new: true, runValidators: true }).select('-__v');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Profile updated', user: updated });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// POST /api/users/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/users/:id  (admin soft delete)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await Account.updateMany({ user: req.params.id }, { isActive: false });
    res.json({ message: 'User deactivated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/users/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-__v -password');
    const accounts = await Account.find({ user: userId, isActive: true }).select('-__v');
    const accountIds = accounts.map((a) => a._id);
    const transactions = await Transaction.find({
      $or: [{ fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } }],
    }).sort({ createdAt: -1 }).limit(10)
      .populate('fromAccount toAccount', 'accountNumber accountType');
    const loans = await Loan.find({ user: userId }).select('-__v');
    res.json({ user, accounts, transactions, loans });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Loan Endpoints ──────────────────────────────────────────────────────────
// GET /api/users/loans/my
exports.getMyLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user.id });
    res.json({ loans });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/users/loans
exports.applyLoan = async (req, res) => {
  try {
    const { principal, termMonths, interestRate, purpose } = req.body;
    if (!principal || !termMonths)
      return res.status(400).json({ message: 'Principal and term are required' });
    const rate = interestRate || 7.5;
    const monthlyRate = rate / 100 / 12;
    const emi = Number((principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths))).toFixed(2));
    const loan = await Loan.create({
      user: req.user.id, principal, outstanding: principal,
      interestRate: rate, termMonths, emi, description: purpose || '',
      status: 'pending',
    });
    res.status(201).json({ message: 'Loan application submitted. Pending admin approval.', loan });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// PATCH /api/users/loans/:id/pay
exports.payLoan = async (req, res) => {
  try {
    const { amount, accountId } = req.body;
    const loan = await Loan.findById(req.params.id);
    if (!loan || loan.user.toString() !== req.user.id)
      return res.status(404).json({ message: 'Loan not found' });
    if (loan.status !== 'active')
      return res.status(400).json({ message: 'Can only pay an active loan' });
    if (!amount || amount <= 0)
      return res.status(400).json({ message: 'Invalid amount' });

    // Deduct from account if provided
    if (accountId) {
      const account = await Account.findById(accountId);
      if (!account || account.user.toString() !== req.user.id)
        return res.status(404).json({ message: 'Account not found' });
      if (account.balance < amount)
        return res.status(400).json({ message: 'Insufficient funds' });
      account.balance -= Number(amount);
      await account.save();
      // Record as a transaction
      await Transaction.create({
        fromAccount: account._id,
        type: 'withdrawal',
        amount,
        description: `EMI payment for Loan #${loan._id.toString().slice(-6)}`,
        balanceAfter: account.balance,
      });
    }

    loan.outstanding = Math.max(0, loan.outstanding - Number(amount));
    if (loan.outstanding === 0) loan.status = 'closed';
    await loan.save();
    res.json({ message: 'EMI payment recorded', loan });
  } catch (err) { res.status(400).json({ error: err.message }); }
};
