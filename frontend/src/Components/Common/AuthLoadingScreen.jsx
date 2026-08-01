import { Loader2 } from 'lucide-react'

const AuthLoadingScreen = ({ message = 'Checking authentication...' }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans dark:bg-slate-950">
    <div role="status" className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{message}</p>
    </div>
  </div>
)

export default AuthLoadingScreen
