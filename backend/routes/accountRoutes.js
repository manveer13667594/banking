const router = require('express').Router();
const { getMyAccounts, getAccountById, createAccount, getAllAccounts } = require('../controllers/accountController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/my',   getMyAccounts);
router.post('/',    createAccount);
router.get('/',     restrictTo('admin'), getAllAccounts);
router.get('/:id',  getAccountById);

module.exports = router;