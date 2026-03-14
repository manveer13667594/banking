const mongoose      = require('mongoose');
const crypto        = require('crypto');
const User          = require('../models/User');
const Account       = require('../models/Account');
const Transaction   = require('../models/Transaction');
const Loan          = require('../models/Loan');
const SupportTicket = require('../models/SupportTicket');

// ── Helpers ───────────────────────────────────────────────────────────────────
const genRef = () =>
  'TXN' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const parseAmt = (raw) => {
  const n = Number(raw);
  if (!isFinite(n) || n <= 0) throw { status: 400, message: 'Invalid amount' };
  return Math.round(n * 100) / 100;
};

// Accepts either a MongoDB ObjectId string OR an account number string
const findAccount = async (identifier) => {
  if (!identifier)
    throw { status: 400, message: 'Account ID or Account Number is required' };
  // Try by _id first
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const acc = await Account.findById(identifier);
    if (acc) return acc;
  }
  // Fallback: exact match on accountNumber
  const acc = await Account.findOne({ accountNumber: String(identifier).trim() });
  if (!acc)
    throw { status: 404, message: 'Account not found. Check the ID or Account Number.' };
  return acc;
};

// ── Stats ─────────────────────────────────────────────────────────────────────
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

// ── Loans ─────────────────────────────────────────────────────────────────────
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

// ── Deposit ───────────────────────────────────────────────────────────────────
exports.adminDeposit = async (req, res) => {
  try {
    const { accountIdentifier, amount: raw, description } = req.body;
    const amount  = parseAmt(raw);
    const account = await findAccount(accountIdentifier);
    account.balance = Math.round((account.balance + amount) * 100) / 100;
    await account.save();
    const txn = await Transaction.create({
      toAccount:    account._id,
      type:         'deposit',
      amount,
      description:  (description || 'Admin deposit').toString().slice(0, 200),
      balanceAfter: account.balance,
      reference:    genRef(),
    });
    res.json({ message: 'Deposit successful', balance: account.balance, transaction: txn });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

// ── Withdraw ──────────────────────────────────────────────────────────────────
exports.adminWithdraw = async (req, res) => {
  try {
    const { accountIdentifier, amount: raw, description } = req.body;
    const amount  = parseAmt(raw);
    const account = await findAccount(accountIdentifier);
    if (account.balance < amount)
      return res.status(400).json({ message: 'Insufficient funds' });
    account.balance = Math.round((account.balance - amount) * 100) / 100;
    await account.save();
    const txn = await Transaction.create({
      fromAccount:  account._id,
      type:         'withdrawal',
      amount,
      description:  (description || 'Admin withdrawal').toString().slice(0, 200),
      balanceAfter: account.balance,
      reference:    genRef(),
    });
    res.json({ message: 'Withdrawal successful', balance: account.balance, transaction: txn });
  } catch (err) { res.status(err.status || 500).json({ message: err.message }); }
};

// ── Transfer ──────────────────────────────────────────────────────────────────
exports.adminTransfer = async (req, res) => {
  try {
    const { fromIdentifier, toIdentifier, amount: raw, description } = req.body;
    const amount = parseAmt(raw);

    const fromAccount = await findAccount(fromIdentifier);
    const toAccount   = await findAccount(toIdentifier);

    if (fromAccount._id.equals(toAccount._id))
      return res.status(400).json({ message: 'From and To accounts cannot be the same' });

    if (fromAccount.balance < amount)
      return res.status(400).json({ message: 'Insufficient funds in source account' });

    fromAccount.balance = Math.round((fromAccount.balance - amount) * 100) / 100;
    toAccount.balance   = Math.round((toAccount.balance   + amount) * 100) / 100;
    await fromAccount.save();
    await toAccount.save();

    const txn = await Transaction.create({
      fromAccount:  fromAccount._id,
      toAccount:    toAccount._id,
      type:         'transfer',
      amount,
      description:  (description || 'Admin transfer').toString().slice(0, 200),
      balanceAfter: fromAccount.balance,
      reference:    genRef(),
    });

    res.json({ message: 'Transfer successful', balance: fromAccount.balance, transaction: txn });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  }
};

// ── Support Tickets ───────────────────────────────────────────────────────────
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

// ── Users & Accounts ──────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'customer' }).select('-__v').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find()
      .populate('user', 'fullName email').sort({ createdAt: -1 });
    res.json({ accounts });
  } catch (err) { res.status(500).json({ error: err.message }); }
};