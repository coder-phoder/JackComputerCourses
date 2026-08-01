const express = require('express');
const {
    createBug,
    getMyBugs,
    getBugImages,
    getAllBugsByAdmin,
    resolveBugByAdmin,
    declineBugByAdmin,
    deleteBugByAdmin
} = require('../controllers/bug.controller');

// Users and faculties get the exact same board, so one router is mounted behind
// both role middlewares and the controllers read the reporter from the request.
const reporterBugRoutes = express.Router();
const adminBugRoutes = express.Router();

reporterBugRoutes.get('/', getMyBugs);
reporterBugRoutes.post('/', createBug);
reporterBugRoutes.get('/:bugId/images', getBugImages);

adminBugRoutes.get('/', getAllBugsByAdmin);
adminBugRoutes.get('/:bugId/images', getBugImages);
adminBugRoutes.patch('/:bugId/resolve', resolveBugByAdmin);
adminBugRoutes.patch('/:bugId/decline', declineBugByAdmin);
adminBugRoutes.delete('/:bugId', deleteBugByAdmin);

module.exports = {
    reporterBugRoutes,
    adminBugRoutes
};
