import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ListVideo } from 'lucide-react'

const UserCourseSidebar = ({
  chapters,
  selectedVideoKey,
  onSelectVideo,
  isCollapsed,
  onToggleCollapse,
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
  const handleCollapsedKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggleCollapse()
    }
  }

  if (isCollapsed) {
    return (
      <aside
        role="button"
        tabIndex={0}
        onClick={onToggleCollapse}
        onKeyDown={handleCollapsedKeyDown}
        aria-label="Expand chapter navigation"
        title="Expand chapter navigation"
        className="flex h-full min-h-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 lg:flex-col"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-r border-slate-200 p-2 dark:border-slate-800 lg:flex-col lg:border-b lg:border-r-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <ListVideo className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        {chapters.length ? (
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto p-2 lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {chapters.map((chapter, chapterIndex) => {
              const isActiveChapter = chapter._id === activeChapterId
              const videos = chapter.videos || []
              const selectedVideoIndex = videos.findIndex((video) => video.id === selectedVideoKey)

              return (
                <div
                  key={chapter._id}
                  title={chapter.name}
                  className={`flex h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-bold transition ${
                    isActiveChapter
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  <span>{chapterIndex + 1}</span>
                  {selectedVideoIndex >= 0 ? (
                    <span className="mt-0.5 text-[10px] opacity-80">
                      {selectedVideoIndex + 1}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            0
          </div>
        )}
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chapters</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Select a lesson to start watching.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Collapse chapter navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:text-blue-300"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
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
