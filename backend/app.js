const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;
const cors = require('cors');
const cookieParser = require('cookie-parser');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const facultyRoutes = require('./routes/faculty.routes');

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CONNECTION TO DATABASE
const connectToDb = require('./db/db');
connectToDb();

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Backend is running',
        data: {}
    });
});

app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.use('/faculty', facultyRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        data: {}
    });
});

app.use((error, req, res, next) => {
    const statusCode = error.statusCode || error.status || 500;

    res.status(statusCode).json({
        success: false,
        message: statusCode >= 500 ? 'Internal server error' : error.message,
        data: {}
    });
});

const http = require('http');
const { Server } = require('socket.io');
const { initSocket } = require('./services/socket.service');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
    }
});

initSocket(io);

if (require.main === module) {
    server.listen(PORT, (error) => {
        if (error) {
            console.log('error in server connection: ', error);
            return;
        }

        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
