import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './Context/AuthContext'
import LandingPage from './Pages/Common/LandingPage'
import LoginPage from './Pages/Common/LoginPage'
import UserHomePage from './Pages/User/UserHomePage'
import UserCoursesPage from './Pages/User/UserCoursesPage'
import UserCoursePlayerPage from './Pages/User/UserCoursePlayerPage'
import AdminHomePage from './Pages/Admin/AdminHomePage'
import AdminAllUsers from './Pages/Admin/AdminAllUsers'
import AdminCourses from './Pages/Admin/AdminCourses'
import Course from './Pages/Admin/Course'
import CourseAccessPage from './Pages/Admin/CourseAccessPage'

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/user/home" element={<UserHomePage />} />
          <Route path="/user/courses" element={<UserCoursesPage />} />
          <Route path="/user/courses/:courseId/player" element={<UserCoursePlayerPage />} />
          <Route path="/admin/home" element={<AdminHomePage />} />
          <Route path="/admin/users" element={<AdminAllUsers />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/courses/:courseId/access" element={<CourseAccessPage />} />
          <Route path="/admin/courses/:courseId" element={<Course />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
