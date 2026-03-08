const SupportTicket = require('../models/SupportTicket');

// POST /api/support
exports.createTicket = async (req, res) => {
  try {
    const { issueType, subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required' });
    const ticket = await SupportTicket.create({ user: req.user.id, issueType, subject, message });
    res.status(201).json({ message: 'Ticket submitted successfully', ticket });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// GET /api/support/my
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
