# Jack Computer Courses

A full-stack learning management platform for computer course institutes. Jack Computer Courses brings learners, faculty, and administrators into one clean workspace for managing courses, watching lessons, sharing notes, handling queries, and practicing code in an integrated IDE.

## Overview

This project is built as a modern MERN-style application:

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios
- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **Authentication:** JWT stored in secure HTTP-only cookies
- **Realtime features:** Socket.IO-powered IDE/workspace sharing
- **Learning tools:** Course player, notes, queries, video lessons, and coding workspace

## Key Features

### For Learners

- Browse assigned courses from a dedicated learner dashboard
- Watch course videos through a focused course player
- Access course notes and learning material
- Use an in-browser coding IDE for practice
- Share IDE sessions using secure shared links

### For Faculty

- View assigned courses and course details
- Manage course notes for learners
- Browse admin-published topic notes (faculty-only, available with or without a course)
- Respond to learner queries
- Use the same integrated IDE workflow for demonstrations and support

### For Admins

- Manage users and faculty accounts
- Create, update, and organize courses
- Add chapters and sync course videos
- Control course access for learners and faculty
- Manage course notes from the admin dashboard
- Create, update, sync, and delete topic notes for any topic, visible to faculty only

## Project Structure

```text
JackComputerCourses/
  backend/
    controllers/      Request handlers and business logic
    db/               MongoDB connection
    middlewares/      Role-based authentication middleware
    models/           Mongoose data models
    routes/           Express API routes
    services/         Socket and external service helpers
    tests/            Backend test suites

  frontend/
    public/           Static assets
    src/
      Components/     Reusable UI and feature components
      Context/        Auth and theme providers
      Pages/          Route-level pages by role
      assets/         Images and app assets
```

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- MongoDB database connection string

### 1. Install Dependencies

Install backend dependencies:

```bash
cd JackComputerCourses/backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file inside `JackComputerCourses/backend`:

```env
PORT=4000
CLIENT_URL=http://localhost:5173
DB_CONNECT=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_PHONE=your_admin_phone
ADMIN_PASSWORD=your_admin_password
YOUTUBE_API_KEY=your_youtube_api_key
```

Create a `.env` file inside `JackComputerCourses/frontend`:

```env
VITE_BASE_URL=http://localhost:4000
```

## Running the Project

Start the backend server:

```bash
cd JackComputerCourses/backend
npm run dev
```

Start the frontend development server:

```bash
cd JackComputerCourses/frontend
npm run dev
```

The frontend will usually run at:

```text
http://localhost:5173
```

The backend will run at:

```text
http://localhost:4000
```

## Available Scripts

### Backend

```bash
npm run dev      # Start backend with nodemon
npm start        # Start backend with Node.js
npm test         # Run backend tests
```

### Frontend

```bash
npm run dev      # Start Vite development server
npm run build    # Create production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## API Design

The backend follows a consistent JSON response format:

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {}
}
```

Authentication is handled with role-specific protected routes for:

- Admin
- Faculty
- User

## Testing

Backend tests are included for important flows such as:

- Course access
- Notes
- Faculty model behavior
- IDE sharing
- Workspace nodes

Run them with:

```bash
cd JackComputerCourses/backend
npm test
```

## Built With

- React
- Vite
- Tailwind CSS
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT
- Monaco Editor

## Project Goal

Jack Computer Courses is designed to make digital course delivery simpler, more organized, and more interactive. It combines content management, role-based dashboards, video learning, notes, learner support, and coding practice into one professional platform for computer education.
