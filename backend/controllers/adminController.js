const mongoose     = require('mongoose');
const User         = require('../models/User');
const Account      = require('../models/Account');
const Transaction  = require('../models/Transaction');
const Loan         = require('../models/Loan');
const SupportTicket = require('../models/SupportTicket');

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const parseAmt = (raw) => {
  const n = Number(raw);
  if (!isFinite(n) || n <= 0) throw { status: 400, message: 'Invalid amount' };
  return Math.round(n * 100) / 100;
};

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalAccounts, totalTransactions, pendingLoans, openTickets, accounts] =
      await Promise.all([
        User.countDocuments({ role: 'customer' }),
        Account.countDocuments(),
        Transaction.countDocuments(),
        Loan.countDocuments({ status: 'pending' }),
        SupportTicket.countDocuments({ status: 'open' }),
        Account.find({}, 'balance'),
      ]);
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    res.json({ totalUsers, totalAccounts, totalTransactions, pendingLoans, openTickets, totalBalance });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Loans ────────────────────────────────────────────────────────────────────
exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find().populate('user', 'fullName email').sort({ createdAt: -1 });
    res.json({ loans });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.approveLoan = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid loan ID' });
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    if (loan.status !== 'pending') return res.status(400).json({ message: 'Loan is not pending' });
    loan.status = 'active';
    await loan.save();
    res.json({ message: 'Loan approved', loan });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.rejectLoan = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid loan ID' });
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    loan.status = 'rejected';
    await loan.save();
    res.json({ message: 'Loan rejected', loan });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── Manual Transactions ──────────────────────────────────────────────────────
exports.adminDeposit = async (req, res) => {
  try {
    const { accountId, amount: raw, description } = req.body;
    if (!validId(accountId)) return res.status(400).json({ message: 'Invalid account ID' });
    const amount  = parseAmt(raw);
    const account = await Account.findById(accountId);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    account.balance = Math.round((account.balance + amount) * 100) / 100;
    await account.save();
    const txn = await Transaction.create({
      toAccount: account._id, type: 'deposit', amount,
      description: (description || 'Admin deposit').toString().slice(0, 200),
      balanceAfter: account.balance,
    });
    res.json({ message: 'Deposit successful', balance: account.balance, transaction: txn });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

exports.adminWithdraw = async (req, res) => {
  try {
    const { accountId, amount: raw, description } = req.body;
    if (!validId(accountId)) return res.status(400).json({ message: 'Invalid account ID' });
    const amount  = parseAmt(raw);
    const account = await Account.findById(accountId);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    if (account.balance < amount) return res.status(400).json({ message: 'Insufficient funds' });
    account.balance = Math.round((account.balance - amount) * 100) / 100;
    await account.save();
    const txn = await Transaction.create({
      fromAccount: account._id, type: 'withdrawal', amount,
      description: (description || 'Admin withdrawal').toString().slice(0, 200),
      balanceAfter: account.balance,
    });
    res.json({ message: 'Withdrawal successful', balance: account.balance, transaction: txn });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// ── Support Tickets ──────────────────────────────────────────────────────────
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'fullName email').sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.replyToTicket = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ticket ID' });
    const { reply, status } = req.body;
    if (!reply) return res.status(400).json({ message: 'Reply text is required' });
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    ticket.adminReply = reply.toString().slice(0, 1000);
    ticket.repliedBy  = req.user.id;
    ticket.repliedAt  = new Date();
    ticket.status     = status || 'resolved';
    await ticket.save();
    res.json({ message: 'Reply sent', ticket });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'customer' }).select('-__v').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find().populate('user', 'fullName email').sort({ createdAt: -1 });
    res.json({ accounts });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
