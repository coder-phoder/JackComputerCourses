import axios from 'axios'
import { useEffect, useSyncExternalStore } from 'react'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

// The badges live in the navbar while the decisions that change them happen on the
// pages below it, so the counts sit in one tiny store both sides can reach.
let alerts = { passwordRequests: 0, bugs: 0 }
const listeners = new Set()

const subscribe = (listener) => {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

const getSnapshot = () => alerts

const setAlerts = (passwordRequests, bugs) => {
  if (passwordRequests === alerts.passwordRequests && bugs === alerts.bugs) {
    return
  }

  alerts = { passwordRequests, bugs }
  listeners.forEach((listener) => listener())
}

export const refreshAdminAlerts = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/alerts`, {
      withCredentials: true,
    })

    if (!response.data?.success) {
      return
    }

    const data = response.data.data || {}

    setAlerts(Number(data.passwordRequests) || 0, Number(data.bugs) || 0)
  } catch {
    // A badge that cannot be counted must never break the page showing it.
  }
}

export const useAdminAlerts = () => {
  const currentAlerts = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    refreshAdminAlerts()
  }, [])

  return currentAlerts
}
