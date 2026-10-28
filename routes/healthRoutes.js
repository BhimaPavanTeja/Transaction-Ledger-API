const express = require('express');
const { checkDatabase } = require('../controllers/healthController');

const router = express.Router();

router.get('/db', checkDatabase);

module.exports = router;
