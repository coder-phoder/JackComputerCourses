import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
              <div className="w-8 h-8 bg-linear-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
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

          <div className="hidden items-center space-x-2 md:flex lg:space-x-4">
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

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-900"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen ? (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
          <div className="mx-auto grid max-w-7xl gap-2">
            <Link to="/" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300">
              Home
            </Link>
            <Link to="/courses" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300">
              Courses
            </Link>
            <Link to="/about" onClick={closeMobileMenu} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300">
              About
            </Link>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Link to="/login" onClick={closeMobileMenu} className="rounded-lg border border-blue-200 px-3 py-3 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-900/70 dark:text-blue-200 dark:hover:bg-blue-950/40">
                Log in
              </Link>
              <Link to="/register" onClick={closeMobileMenu} className="rounded-lg bg-blue-600 px-3 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:bg-blue-700">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
};

export default Navbar;
