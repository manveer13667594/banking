const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issueType: { type: String, default: 'other' },
    subject:   { type: String, required: true, trim: true },
    message:   { type: String, required: true, trim: true },
    status:    { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
    adminReply:{ type: String, default: '' },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
