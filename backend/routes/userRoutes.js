const router = require('express').Router();
const { getAllUsers, getUserById, updateUser, deleteUser, getDashboard,
  getMyLoans, applyLoan, payLoan, changePassword } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', getDashboard);
router.post('/change-password', changePassword);
router.get('/loans/my', getMyLoans);
router.post('/loans', applyLoan);
router.patch('/loans/:id/pay', payLoan);

router.get('/',      restrictTo('admin'), getAllUsers);
router.get('/:id',   getUserById);
router.patch('/:id', updateUser);
router.delete('/:id', restrictTo('admin'), deleteUser);

module.exports = router;
