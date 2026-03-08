const mongoose = require('mongoose');
const crypto   = require('crypto');

const transactionSchema = new mongoose.Schema(
  {
    fromAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    toAccount:   { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be at least 0.01'],
      validate: {
        validator: (v) => isFinite(v) && v > 0,
        message: 'Amount must be a finite positive number',
      },
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    balanceAfter: { type: Number },
    reference: {
      type: String,
      unique: true,
      sparse: true, // FIX: allows multiple docs with no reference without E11000 clash
    },
  },
  { timestamps: true }
);

// Always generate a cryptographically unique reference
transactionSchema.pre('validate', function (next) {
  if (!this.reference) {
    // TXN + timestamp ms + 8 random hex chars → effectively collision-proof
    this.reference = 'TXN' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
