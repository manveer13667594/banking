const router = require('express').Router();
const { register, registerAdmin, login, adminLogin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.get('/me', protect, getMe);

module.exports = router;
