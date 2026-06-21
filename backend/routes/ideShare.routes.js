const express = require('express');
const {
    getShareContacts,
    createIDEShare,
    getCreatedIDEShares,
    getReceivedIDEShares,
    getIDEShareByToken
} = require('../controllers/ideShare.controller');

const router = express.Router();

router.get('/contacts', getShareContacts);
router.post('/exports', createIDEShare);
router.get('/exports', getCreatedIDEShares);
router.get('/imports', getReceivedIDEShares);
router.get('/shared/:token', getIDEShareByToken);

module.exports = router;
