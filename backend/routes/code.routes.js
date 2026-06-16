const express = require('express');
const { runCode } = require('../controllers/code.controller');

const router = express.Router();

router.post('/run', runCode);

module.exports = router;
