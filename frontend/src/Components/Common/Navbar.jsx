import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  return (
    <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">J</span>
              </div>
              <span className="hidden font-bold text-xl tracking-tight text-gray-900 dark:text-slate-100 sm:inline">
                Jack<span className="text-blue-600">Courses</span>
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 font-medium transition-colors">Home</Link>
            <Link to="/courses" className="text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 font-medium transition-colors">Courses</Link>
            <Link to="/about" className="text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 font-medium transition-colors">About</Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />
            <Link 
              to="/login" 
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-colors sm:px-4"
            >
              Log in
            </Link>
            <Link 
              to="/register" 
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 sm:px-4"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
