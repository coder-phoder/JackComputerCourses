import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const PasswordInput = ({ className = '', containerClassName = 'mt-2', ...inputProps }) => {
  const [visible, setVisible] = useState(false)

  return (
    <div className={`relative ${containerClassName}`}>
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((isVisible) => !isVisible)}
        disabled={inputProps.disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200 disabled:cursor-not-allowed disabled:text-slate-300 dark:disabled:text-slate-600"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  )
}

export default PasswordInput
