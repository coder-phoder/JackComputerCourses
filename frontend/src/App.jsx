import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './Context/AuthContext'
import { ThemeProvider } from './Context/ThemeContext'
import LandingPage from './Pages/Common/LandingPage'
import LoginPage from './Pages/Common/LoginPage'
import RegisterPage from './Pages/Common/RegisterPage'
import UserHomePage from './Pages/User/UserHomePage'
import UserCoursesPage from './Pages/User/UserCoursesPage'
import UserCoursePlayerPage from './Pages/User/UserCoursePlayerPage'
import UserIdePage from './Pages/User/UserIdePage'
import AdminHomePage from './Pages/Admin/AdminHomePage'
import AdminAllUsers from './Pages/Admin/AdminAllUsers'
import AdminAllFaculties from './Pages/Admin/AdminAllFaculties'
import AdminCourses from './Pages/Admin/AdminCourses'
import Course from './Pages/Admin/Course'
import CourseAccessPage from './Pages/Admin/CourseAccessPage'
import AdminNotes from './Pages/Admin/AdminNotes'
import FacultyHomePage from './Pages/Faculty/FacultyHomePage'
import FacultyCoursesPage from './Pages/Faculty/FacultyCoursesPage'
import FacultyCoursePage from './Pages/Faculty/FacultyCoursePage'
import FacultyNotes from './Pages/Faculty/FacultyNotes'
import FacultyCourseNotes from './Pages/Faculty/FacultyCourseNotes'
import FacultyIdePage from './Pages/Faculty/FacultyIdePage'
import FacultyQueries from './Pages/Faculty/FacultyQueries'

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/user/home" element={<UserHomePage />} />
            <Route path="/user/courses" element={<UserCoursesPage />} />
            <Route path="/user/courses/:courseId/player" element={<UserCoursePlayerPage />} />
            <Route path="/user/ide" element={<UserIdePage />} />
            <Route path="/faculty/home" element={<FacultyHomePage />} />
            <Route path="/faculty/courses" element={<FacultyCoursesPage />} />
            <Route path="/faculty/courses/:courseId" element={<FacultyCoursePage />} />
            <Route path="/faculty/ide" element={<FacultyIdePage />} />
            <Route path="/faculty/queries" element={<FacultyQueries />} />
            <Route path="/faculty/notes" element={<FacultyNotes />} />
            <Route path="/faculty/notes/:courseId" element={<FacultyCourseNotes />} />
            <Route path="/admin/home" element={<AdminHomePage />} />
            <Route path="/admin/users" element={<AdminAllUsers />} />
            <Route path="/admin/faculties" element={<AdminAllFaculties />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/courses/:courseId/access" element={<CourseAccessPage />} />
            <Route path="/admin/courses/:courseId/notes" element={<AdminNotes />} />
            <Route path="/admin/courses/:courseId" element={<Course />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
