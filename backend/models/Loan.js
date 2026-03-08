const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    principal: { type: Number, required: true },
    outstanding: { type: Number, required: true },
    interestRate: { type: Number, default: 7.5 },
    termMonths: { type: Number, required: true },
    emi: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'active', 'closed', 'rejected', 'defaulted'], default: 'pending' },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);
