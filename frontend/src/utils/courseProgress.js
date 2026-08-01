import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

// Picks the lesson to open: whatever is already playing wins, then the lesson the
// viewer left off on, then the first lesson of the course.
export const resolveInitialVideoKey = (playableVideos, currentVideoKey, lastWatchedVideoKey) => {
  const isPlayable = (videoKey) => (
    Boolean(videoKey) && playableVideos.some((videoItem) => videoItem.key === videoKey)
  )

  if (isPlayable(currentVideoKey)) {
    return currentVideoKey
  }

  if (isPlayable(lastWatchedVideoKey)) {
    return lastWatchedVideoKey
  }

  return playableVideos[0]?.key || ''
}

// Remembering the resume point is a convenience, so a failed save is swallowed
// rather than interrupting playback — the next lesson change saves again.
export const saveLastWatchedVideo = async (rolePath, courseId, videoKey) => {
  if (!rolePath || !courseId || !videoKey) {
    return false
  }

  try {
    const response = await axios.put(
      `${API_BASE_URL}/${rolePath}/courses/${courseId}/progress`,
      { videoKey },
      { withCredentials: true },
    )

    return Boolean(response.data?.success)
  } catch {
    return false
  }
}
