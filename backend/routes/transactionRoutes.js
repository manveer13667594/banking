const router = require('express').Router();
const {
  deposit, withdraw, transfer,
  getMyTransactions, getAllTransactions,
} = require('../controllers/transactionController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.post('/deposit',    deposit);
router.post('/withdraw',   withdraw);
router.post('/transfer',   transfer);
router.get('/my',          getMyTransactions);
router.get('/',            restrictTo('admin'), getAllTransactions);

module.exports = router;