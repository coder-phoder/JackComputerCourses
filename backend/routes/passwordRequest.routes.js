const express = require('express');
const {
    createPasswordRequest,
    getPasswordRequestsByAdmin,
    approvePasswordRequestByAdmin,
    declinePasswordRequestByAdmin,
    deletePasswordRequestByAdmin
} = require('../controllers/passwordRequest.controller');

// Raising a request happens from the login page, so that router stays public and
// only the decisions sit behind the admin middleware.
const publicPasswordRequestRoutes = express.Router();
const adminPasswordRequestRoutes = express.Router();

publicPasswordRequestRoutes.post('/', createPasswordRequest);

adminPasswordRequestRoutes.get('/', getPasswordRequestsByAdmin);
adminPasswordRequestRoutes.patch('/:requestId/approve', approvePasswordRequestByAdmin);
adminPasswordRequestRoutes.patch('/:requestId/decline', declinePasswordRequestByAdmin);
adminPasswordRequestRoutes.delete('/:requestId', deletePasswordRequestByAdmin);

module.exports = {
    publicPasswordRequestRoutes,
    adminPasswordRequestRoutes
};
