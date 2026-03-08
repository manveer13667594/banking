const mongoose = require('mongoose');
const logger = require('../utils/logger');

const uri = process.env.DB_URI || 'mongodb://127.0.0.1:27017/bankingDB';

mongoose.connection.on('disconnected', () => logger.error('MongoDB Disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB Reconnected'));

module.exports = {
  uri,
  connect: () =>
    mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }),
};