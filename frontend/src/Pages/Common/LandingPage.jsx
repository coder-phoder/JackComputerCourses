import { Link } from 'react-router-dom';
import Navbar from '../../Components/Common/Navbar';
import ReviewShowcase from '../../Components/Common/ReviewShowcase';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-100 dark:bg-blue-950/50 blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-100 dark:bg-indigo-950/50 blur-3xl opacity-50"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-8">
              Master the Digital World <br className="hidden md:block" />
              with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Jack Courses</span>
            </h1>
            
            <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-300 mb-10">
              Elevate your tech skills with industry-leading computer courses. From programming to web development, we provide the knowledge you need to succeed.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/courses"
                className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                Explore Courses
              </Link>
              <Link
                to="/about"
                className="px-8 py-4 text-lg font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Why Choose Us?</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">We offer a unique learning experience tailored for your success.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Expert Instructors',
                  description: 'Learn from industry professionals with years of real-world experience.',
                  icon: '👨‍🏫'
                },
                {
                  title: 'Hands-on Projects',
                  description: 'Build a strong portfolio by working on real-world projects and case studies.',
                  icon: '💻'
                },
                {
                  title: 'Flexible Learning',
                  description: 'Study at your own pace with lifetime access to all course materials.',
                  icon: '⏱️'
                }
              ].map((feature, index) => (
                <div key={index} className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Written by students, picked by the institute. Absent until there is
            something picked to show. */}
        <ReviewShowcase />
      </main>
    </div>
  );
};

export default LandingPage;
