import { motion } from 'framer-motion'
import {
  BookOpen,
  Crown,
  Gauge,
  GraduationCap,
  IdCard,
  Layers3,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const roleStyles = {
  user: {
    eyebrow: 'Learner Profile',
    title: 'Your learning cockpit',
    accent: 'text-blue-600 dark:text-blue-300',
    glow: 'from-blue-600/25 via-emerald-400/15 to-slate-950/0',
    headerGradient: 'from-blue-600 via-cyan-500 to-emerald-500',
    iconBg: 'bg-blue-600',
    ring: 'ring-blue-500/30',
    primaryButton: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
    softButton: 'border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/70 dark:text-blue-200 dark:hover:bg-blue-950/50',
    statBg: 'bg-blue-50/80 dark:bg-blue-950/30',
    statText: 'text-blue-700 dark:text-blue-200',
    quickLinks: [
      { label: 'Explore Courses', to: '/user/courses', icon: BookOpen },
    ],
    metrics: [
      { label: 'Role', value: 'Student', icon: GraduationCap },
      { label: 'Access', value: 'Course Library', icon: Layers3 },
      { label: 'Status', value: 'Active', icon: Sparkles },
    ],
  },
  faculty: {
    eyebrow: 'Faculty Profile',
    title: 'Teaching command center',
    accent: 'text-amber-600 dark:text-amber-300',
    glow: 'from-amber-500/25 via-indigo-500/15 to-slate-950/0',
    headerGradient: 'from-amber-500 via-orange-500 to-indigo-600',
    iconBg: 'bg-amber-500',
    ring: 'ring-amber-500/30',
    primaryButton: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500',
    softButton: 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/70 dark:text-amber-200 dark:hover:bg-amber-950/50',
    statBg: 'bg-amber-50/80 dark:bg-amber-950/30',
    statText: 'text-amber-700 dark:text-amber-200',
    quickLinks: [
      { label: 'Manage Courses', to: '/faculty/courses', icon: BookOpen },
    ],
    metrics: [
      { label: 'Role', value: 'Faculty', icon: GraduationCap },
      { label: 'Workspace', value: 'Course Studio', icon: Layers3 },
      { label: 'Status', value: 'Active', icon: Sparkles },
    ],
  },
  admin: {
    eyebrow: 'Admin Profile',
    title: 'Operations control room',
    accent: 'text-fuchsia-600 dark:text-fuchsia-300',
    glow: 'from-fuchsia-500/20 via-cyan-500/20 to-slate-950/0',
    headerGradient: 'from-fuchsia-600 via-cyan-500 to-slate-900',
    iconBg: 'bg-fuchsia-600',
    ring: 'ring-fuchsia-500/30',
    primaryButton: 'bg-fuchsia-600 hover:bg-fuchsia-700 focus-visible:ring-fuchsia-500',
    softButton: 'border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50 dark:border-fuchsia-900/70 dark:text-fuchsia-200 dark:hover:bg-fuchsia-950/50',
    statBg: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/30',
    statText: 'text-fuchsia-700 dark:text-fuchsia-200',
    quickLinks: [
      { label: 'Users', to: '/admin/users', icon: Users },
      { label: 'Faculties', to: '/admin/faculties', icon: GraduationCap },
      { label: 'Courses', to: '/admin/courses', icon: BookOpen },
    ],
    metrics: [
      { label: 'Role', value: 'Admin', icon: Crown },
      { label: 'Access', value: 'Full Control', icon: ShieldCheck },
      { label: 'Status', value: 'Active', icon: Sparkles },
    ],
  },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] },
  },
}

const formatRole = (role) => {
  if (!role) {
    return 'Member'
  }

  return role.charAt(0).toUpperCase() + role.slice(1)
}

const getInitials = (name, phone, role) => {
  const source = name || phone || role || 'J'
  const words = String(source).trim().split(/\s+/)

  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

const RoleProfileShowcase = ({ role, profile }) => {
  const styles = roleStyles[role] || roleStyles.user
  const displayName = profile?.name || `${formatRole(role)} Member`
  const phone = profile?.phone || 'Phone not available'
  const roleLabel = formatRole(profile?.role || role)
  const initials = getInitials(profile?.name, profile?.phone, role)
  const idValue = profile?._id ? profile._id.slice(-8).toUpperCase() : 'SECURE'

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30"
    >
      <motion.div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-r ${styles.glow}`}
        animate={{ opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 sm:p-8 lg:p-10">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
            <Gauge className={`h-4 w-4 ${styles.accent}`} />
            {styles.eyebrow}
          </motion.div>

          <motion.div variants={itemVariants} className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-center">
            <motion.div
              className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${styles.headerGradient} text-4xl font-black text-white shadow-2xl ring-8 ${styles.ring}`}
              whileHover={{ rotate: -2, scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-2 rounded-lg border border-white/30"
                animate={{ scale: [1, 0.94, 1], opacity: [0.45, 0.8, 0.45] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="relative">{initials}</span>
            </motion.div>

            <div className="min-w-0">
              <p className={`text-sm font-bold uppercase tracking-wide ${styles.accent}`}>
                {roleLabel}
              </p>
              <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
                {displayName}
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                {styles.title} for JackCourses, tuned for fast decisions and a focused next step.
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${styles.iconBg} text-white`}>
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Phone</p>
                  <p className="truncate text-base font-bold text-slate-900 dark:text-white">{phone}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${styles.iconBg} text-white`}>
                  <IdCard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Profile ID</p>
                  <p className="truncate text-base font-bold text-slate-900 dark:text-white">{idValue}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8 flex flex-wrap gap-3">
            {styles.quickLinks.map((link, index) => {
              const Icon = link.icon
              const isPrimary = index === 0

              return (
                <motion.div key={link.to} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to={link.to}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                      isPrimary
                        ? `${styles.primaryButton} text-white`
                        : `${styles.softButton} border bg-white dark:bg-slate-900`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        <div className="relative border-t border-slate-200 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-950/40 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <motion.div
            variants={itemVariants}
            className="grid gap-4"
          >
            {styles.metrics.map((metric, index) => {
              const Icon = metric.icon

              return (
                <motion.div
                  key={metric.label}
                  className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                        {metric.value}
                      </p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${styles.statBg} ${styles.statText} transition group-hover:scale-110`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <motion.div
                    className={`mt-5 h-1 rounded-full bg-gradient-to-r ${styles.headerGradient}`}
                    initial={{ scaleX: 0, transformOrigin: 'left' }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.65, delay: 0.3 + index * 0.12, ease: 'easeOut' }}
                  />
                </motion.div>
              )
            })}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 flex h-9 w-9 items-center justify-center rounded-lg ${styles.iconBg} text-white`}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">Secure session</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Your account is verified through an httpOnly cookie session and ready for role-based access.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

export default RoleProfileShowcase
