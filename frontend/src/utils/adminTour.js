const ADMIN_TOUR_STORAGE_KEY = 'jackCoursesAdminTour'

// The student and the faculty carry the date they finished their walkthrough on their
// own record. The admin is a single account configured in the environment and has no
// record to carry one, so the one thing worth remembering about it is kept beside the
// theme: in the browser of whoever operates the site.
export const isAdminTourPending = () => {
  try {
    return localStorage.getItem(ADMIN_TOUR_STORAGE_KEY) !== 'done'
  } catch {
    return false
  }
}

export const completeAdminTour = () => {
  try {
    localStorage.setItem(ADMIN_TOUR_STORAGE_KEY, 'done')
  } catch {
    // Nothing on the console depends on it, so a refused write only means the
    // walkthrough greets the admin once more.
  }
}
