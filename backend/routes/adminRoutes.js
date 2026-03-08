const router = require('express').Router();
const { getStats, getAllLoans, approveLoan, rejectLoan,
  adminDeposit, adminWithdraw,
  getAllTickets, replyToTicket,
  getUsers, getAccounts } = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', getStats);
router.get('/loans', getAllLoans);
router.patch('/loans/:id/approve', approveLoan);
router.patch('/loans/:id/reject', rejectLoan);
router.post('/deposit', adminDeposit);
router.post('/withdraw', adminWithdraw);
router.get('/tickets', getAllTickets);
router.patch('/tickets/:id/reply', replyToTicket);
router.get('/users', getUsers);
router.get('/accounts', getAccounts);

module.exports = router;
