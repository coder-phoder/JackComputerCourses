import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../Context/ThemeContext'

const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme()
  const Icon = isDark ? Sun : Moon
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300 dark:focus:ring-blue-900/40 ${className}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}

export default ThemeToggle
