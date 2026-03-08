const router = require('express').Router();
const { createTicket, getMyTickets } = require('../controllers/supportController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/', createTicket);
router.get('/my', getMyTickets);

module.exports = router;
