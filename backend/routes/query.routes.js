const express = require('express');
const {
    closeFacultyQuery,
    createQuery,
    decideReviewedQuery,
    getFacultyQueries,
    getUserQueries,
    respondToFacultyQuery,
    searchFacultiesForQuery,
    searchUserCodeFiles
} = require('../controllers/query.controller');

const userQueryRoutes = express.Router();
const facultyQueryRoutes = express.Router();

userQueryRoutes.get('/queries', getUserQueries);
userQueryRoutes.get('/queries/files/search', searchUserCodeFiles);
userQueryRoutes.get('/queries/faculties/search', searchFacultiesForQuery);
userQueryRoutes.post('/queries', createQuery);
userQueryRoutes.patch('/queries/:queryId/decision', decideReviewedQuery);

facultyQueryRoutes.get('/queries', getFacultyQueries);
facultyQueryRoutes.patch('/queries/:queryId/respond', respondToFacultyQuery);
facultyQueryRoutes.patch('/queries/:queryId/close', closeFacultyQuery);

module.exports = {
    userQueryRoutes,
    facultyQueryRoutes
};
