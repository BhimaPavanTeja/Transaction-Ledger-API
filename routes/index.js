const express = require('express');
const accountRoutes = require('./accountsRoutes');
const healthRoutes = require('./healthRoutes');
const transactionRoutes = require('./transactionsRoutes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Transaction Ledger API is running!' });
});

router.use('/health', healthRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);

module.exports = router;
