/**
 * ONE-TIME FIX — run this once after updating to v3 if you already have data.
 * It assigns unique reference IDs to any transactions that have null/missing references,
 * which caused the E11000 duplicate key error.
 *
 * Usage:  node fixdb.js
 * Delete this file after running.
 */
require('dotenv').config();
const mongoose    = require('mongoose');
const crypto      = require('crypto');
const Transaction = require('./models/Transaction');

async function fix() {
  const uri = process.env.DB_URI || 'mongodb://127.0.0.1:27017/bankingDB';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const bad = await Transaction.find({
    $or: [{ reference: null }, { reference: { $exists: false } }]
  });
  console.log(`Found ${bad.length} transactions with missing reference`);

  for (const tx of bad) {
    tx.reference = 'TXN' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
    await tx.save();
    await new Promise(r => setTimeout(r, 2)); // tiny delay to avoid same-ms collision
  }

  console.log('All fixed! You can delete this file now.');
  await mongoose.disconnect();
}

fix().catch(err => { console.error(err); process.exit(1); });
