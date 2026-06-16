import { useMemo, useState } from 'react'

const UserCourseSidebar = ({
  chapters,
  selectedVideoKey,
  onSelectVideo,
}) => {
  const activeChapterId = useMemo(() => {
    const chapterWithSelectedVideo = chapters.find((chapter) => (
      (chapter.videos || []).some((video) => video.id === selectedVideoKey)
    ))

    if (chapterWithSelectedVideo) {
      return chapterWithSelectedVideo._id
    }

    const selectedChapterId = selectedVideoKey.split(':')[0]

    if (selectedChapterId && chapters.some((chapter) => chapter._id === selectedChapterId)) {
      return selectedChapterId
    }

    const firstChapterWithVideos = chapters.find((chapter) => chapter.videos?.length)

    return firstChapterWithVideos?._id || chapters[0]?._id || ''
  }, [chapters, selectedVideoKey])

  const [browsedChapterId, setBrowsedChapterId] = useState('')
  const [collapsedActiveChapterId, setCollapsedActiveChapterId] = useState('')
  const browsedChapterExists = chapters.some((chapter) => chapter._id === browsedChapterId)
  const activeChapterIsCollapsed = collapsedActiveChapterId === activeChapterId
  const openChapterId = browsedChapterExists
    ? browsedChapterId
    : activeChapterIsCollapsed ? '' : activeChapterId

  const toggleChapter = (chapterId) => {
    if (openChapterId === chapterId) {
      setBrowsedChapterId('')
      setCollapsedActiveChapterId(chapterId === activeChapterId ? chapterId : '')
      return
    }

    setCollapsedActiveChapterId('')
    setBrowsedChapterId(chapterId === activeChapterId ? '' : chapterId)
  }

  const handleSelectVideo = (videoKey) => {
    setBrowsedChapterId('')
    setCollapsedActiveChapterId('')
    onSelectVideo(videoKey)
  }

  return (
    <aside className="flex h-[70vh] max-h-170 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] lg:max-h-190">
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chapters</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Select a lesson to start watching.
        </p>
      </div>

      {chapters.length ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {chapters.map((chapter, chapterIndex) => {
            const videos = chapter.videos || []
            const isOpen = chapter._id === openChapterId
            const isActiveChapter = chapter._id === activeChapterId

            return (
              <section key={chapter._id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => toggleChapter(chapter._id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Chapter {chapterIndex + 1}
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {chapter.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {isOpen ? 'Collapse' : isActiveChapter ? 'Current' : `${videos.length || chapter.videoCount || 0} videos`}
                  </span>
                </button>

                {isOpen ? (
                  videos.length ? (
                    <div className="space-y-2 bg-white dark:bg-slate-900 p-2">
                      {videos.map((video, videoIndex) => {
                        const videoKey = video.id
                        const isSelected = selectedVideoKey === videoKey

                        return (
                          <button
                            key={videoKey}
                            type="button"
                            onClick={() => handleSelectVideo(videoKey)}
                            className={`flex w-full gap-3 rounded-lg p-2 text-left transition ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-200 dark:ring-blue-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500">
                              Video
                            </span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {video.title}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span>Lesson {videoIndex + 1}</span>
                                {video.duration ? <span>{video.duration}</span> : null}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      No videos available.
                    </p>
                  )
                ) : null}
              </section>
            )
          })}
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
          No chapters available.
        </p>
      )}
    </aside>
  )
}

export default UserCourseSidebar
