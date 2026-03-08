const levels = { info: 'INFO', warn: 'WARN', error: 'ERROR' };

const log = (level, message) => {
  const ts = new Date().toISOString();
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${levels[level]}] ${ts} — ${message}`);
};

exports.info  = (msg) => log('info',  msg);
exports.warn  = (msg) => log('warn',  msg);
exports.error = (msg) => log('error', msg);