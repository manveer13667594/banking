const mongoose   = require('mongoose');
const Transaction = require('../models/Transaction');
const Account    = require('../models/Account');

// ── Helpers ────────────────────────────────────────────────────────────────────
const findOwnedAccount = async (accountId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(accountId))
    throw { status: 400, message: 'Invalid account ID' };
  const account = await Account.findById(accountId);
  if (!account || !account.isActive) throw { status: 404, message: 'Account not found or inactive' };
  if (account.user.toString() !== userId) throw { status: 403, message: 'Account does not belong to you' };
  return account;
};

const parseAmount = (raw) => {
  const n = Number(raw);
  if (!isFinite(n) || n <= 0) throw { status: 400, message: 'Amount must be a positive finite number' };
  return Math.round(n * 100) / 100; // always 2 decimal places
};

const safeDesc = (d) => (d || '').toString().slice(0, 200);

// POST /api/transactions/deposit
exports.deposit = async (req, res) => {
  try {
    const { accountId, amount: raw, description } = req.body;
    const amount  = parseAmount(raw);
    const account = await findOwnedAccount(accountId, req.user.id);
    account.balance = Math.round((account.balance + amount) * 100) / 100;
    await account.save();
    const txn = await Transaction.create({
      toAccount: account._id, type: 'deposit', amount,
      description: safeDesc(description), balanceAfter: account.balance,
    });
    res.status(201).json({ message: 'Deposit successful', balance: account.balance, transaction: txn });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// POST /api/transactions/withdraw
exports.withdraw = async (req, res) => {
  try {
    const { accountId, amount: raw, description } = req.body;
    const amount  = parseAmount(raw);
    const account = await findOwnedAccount(accountId, req.user.id);
    if (account.balance < amount) return res.status(400).json({ message: 'Insufficient funds' });
    account.balance = Math.round((account.balance - amount) * 100) / 100;
    await account.save();
    const txn = await Transaction.create({
      fromAccount: account._id, type: 'withdrawal', amount,
      description: safeDesc(description), balanceAfter: account.balance,
    });
    res.status(201).json({ message: 'Withdrawal successful', balance: account.balance, transaction: txn });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// POST /api/transactions/transfer
exports.transfer = async (req, res) => {
  try {
    const { fromAccountId, toAccountNumber, amount: raw, description } = req.body;
    const amount = parseAmount(raw);
    if (!toAccountNumber || !String(toAccountNumber).trim())
      return res.status(400).json({ message: 'Recipient account number is required' });

    const sender = await findOwnedAccount(fromAccountId, req.user.id);
    if (sender.balance < amount) return res.status(400).json({ message: 'Insufficient funds' });

    // Exact match — no regex, prevents injection
    const receiver = await Account.findOne({ accountNumber: String(toAccountNumber).trim(), isActive: true });
    if (!receiver) return res.status(404).json({ message: 'Recipient account not found' });
    if (sender._id.equals(receiver._id)) return res.status(400).json({ message: 'Cannot transfer to the same account' });

    sender.balance   = Math.round((sender.balance   - amount) * 100) / 100;
    receiver.balance = Math.round((receiver.balance + amount) * 100) / 100;
    await sender.save();
    await receiver.save();

    const txn = await Transaction.create({
      fromAccount: sender._id, toAccount: receiver._id, type: 'transfer', amount,
      description: safeDesc(description), balanceAfter: sender.balance,
    });
    res.status(201).json({ message: 'Transfer successful', balance: sender.balance, transaction: txn });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// GET /api/transactions/my?accountId=&page=&limit=&search=&type=
exports.getMyTransactions = async (req, res) => {
  try {
    const { accountId, page = 1, limit = 10, search, type } = req.query;
    const account = await findOwnedAccount(accountId, req.user.id);

    const filter = { $or: [{ fromAccount: account._id }, { toAccount: account._id }] };

    // Whitelist type values
    if (type && ['deposit', 'withdrawal', 'transfer'].includes(type)) filter.type = type;

    // Escape regex special chars to prevent ReDoS / injection
    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
      filter.description = { $regex: safe, $options: 'i' };
    }

    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

    const total        = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('fromAccount toAccount', 'accountNumber accountType');

    res.json({ total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, transactions });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// GET /api/transactions (admin only)
exports.getAllTransactions = async (req, res) => {
  try {
    const pageNum  = Math.max(1, parseInt(req.query.page)  || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const total    = await Transaction.countDocuments();
    const transactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('fromAccount toAccount', 'accountNumber');
    res.json({ total, page: pageNum, pages: Math.ceil(total / limitNum), transactions });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
