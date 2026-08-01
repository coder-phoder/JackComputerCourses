const express = require('express');
const {
    getAllTopicNotesByAdmin,
    createTopicNoteByAdmin,
    updateTopicNoteByAdmin,
    deleteTopicNoteByAdmin,
    syncTopicNoteByAdmin,
    getAllTopicNotesByFaculty
} = require('../controllers/topicNote.controller');

const adminTopicNoteRoutes = express.Router();
const facultyTopicNoteRoutes = express.Router();

adminTopicNoteRoutes.get('/', getAllTopicNotesByAdmin);
adminTopicNoteRoutes.post('/', createTopicNoteByAdmin);
adminTopicNoteRoutes.put('/:topicNoteId', updateTopicNoteByAdmin);
adminTopicNoteRoutes.delete('/:topicNoteId', deleteTopicNoteByAdmin);
adminTopicNoteRoutes.post('/:topicNoteId/sync', syncTopicNoteByAdmin);

facultyTopicNoteRoutes.get('/', getAllTopicNotesByFaculty);

module.exports = {
    adminTopicNoteRoutes,
    facultyTopicNoteRoutes
};
