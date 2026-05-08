const API_BASE_URL = 'http://localhost:4000'

const getPlayerSrc = (playerPath) => (
  playerPath?.startsWith('http') ? playerPath : `${API_BASE_URL}${playerPath || ''}`
)

const UserVideoPlayer = ({ course, selectedVideo }) => {
  if (!selectedVideo) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">No videos available</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Videos will appear here after the course chapters are synced.
        </p>
      </section>
    )
  }

  const { chapter, video } = selectedVideo

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="aspect-video bg-slate-950">
        <iframe
          key={video.playerPath}
          src={getPlayerSrc(video.playerPath)}
          title={video.title}
          className="h-full w-full"
          loading="eager"
          allow="accelerometer; autoplay; encrypted-media; fullscreen; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allowFullScreen
        />
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          {chapter.name}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {video.title}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {course?.title || 'Course'}
          </span>
          {video.duration ? (
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {video.duration}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default UserVideoPlayer
