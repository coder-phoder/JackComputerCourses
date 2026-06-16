import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './Context/AuthContext'
import LandingPage from './Pages/Common/LandingPage'
import LoginPage from './Pages/Common/LoginPage'
import RegisterPage from './Pages/Common/RegisterPage'
import UserHomePage from './Pages/User/UserHomePage'
import UserCoursesPage from './Pages/User/UserCoursesPage'
import UserCoursePlayerPage from './Pages/User/UserCoursePlayerPage'
import AdminHomePage from './Pages/Admin/AdminHomePage'
import AdminAllUsers from './Pages/Admin/AdminAllUsers'
import AdminAllFaculties from './Pages/Admin/AdminAllFaculties'
import AdminCourses from './Pages/Admin/AdminCourses'
import Course from './Pages/Admin/Course'
import CourseAccessPage from './Pages/Admin/CourseAccessPage'
import FacultyHomePage from './Pages/Faculty/FacultyHomePage'
import FacultyCoursesPage from './Pages/Faculty/FacultyCoursesPage'
import FacultyCoursePage from './Pages/Faculty/FacultyCoursePage'

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/user/home" element={<UserHomePage />} />
          <Route path="/user/courses" element={<UserCoursesPage />} />
          <Route path="/user/courses/:courseId/player" element={<UserCoursePlayerPage />} />
          <Route path="/faculty/home" element={<FacultyHomePage />} />
          <Route path="/faculty/courses" element={<FacultyCoursesPage />} />
          <Route path="/faculty/courses/:courseId" element={<FacultyCoursePage />} />
          <Route path="/admin/home" element={<AdminHomePage />} />
          <Route path="/admin/users" element={<AdminAllUsers />} />
          <Route path="/admin/faculties" element={<AdminAllFaculties />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/courses/:courseId/access" element={<CourseAccessPage />} />
          <Route path="/admin/courses/:courseId" element={<Course />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
