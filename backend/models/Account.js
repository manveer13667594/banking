const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accountNumber: {
      type: String,
      unique: true,
      required: true,
    },
    accountType: {
      type: String,
      enum: ['savings', 'checking', 'fixed-deposit'],
      default: 'savings',
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    interestRate: {
      type: Number,
      default: 3.5,
    },
  },
  { timestamps: true }
);

// Auto-generate a unique 12-digit account number before first save
accountSchema.pre('validate', async function (next) {
  if (!this.isNew) return next();
  const random = Math.floor(100000000000 + Math.random() * 900000000000).toString();
  this.accountNumber = random;
  next();
});

module.exports = mongoose.model('Account', accountSchema);