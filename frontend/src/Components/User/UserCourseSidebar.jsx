import { useMemo, useState } from 'react'

const getVideoKey = (chapter, video) => `${chapter._id}-${video.youtubeVideoId}-${video.position}`

const UserCourseSidebar = ({
  chapters,
  selectedVideoKey,
  onSelectVideo,
}) => {
  const initialOpenChapters = useMemo(() => {
    const firstChapterWithVideos = chapters.find((chapter) => chapter.videos?.length)

    return firstChapterWithVideos ? { [firstChapterWithVideos._id]: true } : {}
  }, [chapters])
  const [openChapters, setOpenChapters] = useState(initialOpenChapters)

  const toggleChapter = (chapterId) => {
    setOpenChapters((currentOpenChapters) => ({
      ...currentOpenChapters,
      [chapterId]: !currentOpenChapters[chapterId],
    }))
  }

  return (
    <aside className="rounded-lg border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">Chapters</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select a lesson to start watching.
        </p>
      </div>

      {chapters.length ? (
        <div className="space-y-3 p-3">
          {chapters.map((chapter, chapterIndex) => {
            const videos = chapter.videos || []
            const isOpen = Boolean(openChapters[chapter._id])

            return (
              <section key={chapter._id} className="overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleChapter(chapter._id)}
                  className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Chapter {chapterIndex + 1}
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold text-slate-900">
                      {chapter.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {isOpen ? 'Hide' : `${videos.length || chapter.videoCount || 0} videos`}
                  </span>
                </button>

                {isOpen ? (
                  videos.length ? (
                    <div className="space-y-2 bg-white p-2">
                      {videos.map((video, videoIndex) => {
                        const videoKey = getVideoKey(chapter, video)
                        const isSelected = selectedVideoKey === videoKey

                        return (
                          <button
                            key={videoKey}
                            type="button"
                            onClick={() => onSelectVideo(videoKey)}
                            className={`flex w-full gap-3 rounded-lg p-2 text-left transition ${
                              isSelected
                                ? 'bg-blue-50 ring-1 ring-blue-200'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt=""
                                className="h-14 w-20 shrink-0 rounded-md object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-400">
                                Video
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="line-clamp-2 text-sm font-semibold text-slate-900">
                                {video.title}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                                <span>Lesson {videoIndex + 1}</span>
                                {video.duration ? <span>{video.duration}</span> : null}
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                      No videos available.
                    </p>
                  )
                ) : null}
              </section>
            )
          })}
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
          No chapters available.
        </p>
      )}
    </aside>
  )
}

export default UserCourseSidebar
