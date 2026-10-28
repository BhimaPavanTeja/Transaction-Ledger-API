const express = require('express');
const {
  createAccount,
  getAccountBalance,
  getAccountTransactions
} = require('../controllers/accountsController');

const router = express.Router();

router.post('/', createAccount);
router.get('/:id/balance', getAccountBalance);
router.get('/:id/transactions', getAccountTransactions);

module.exports = router;
