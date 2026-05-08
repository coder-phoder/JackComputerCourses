import { useState } from 'react'

const getStatusClass = (status) => {
  if (status === 'synced') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'failed') {
    return 'bg-red-50 text-red-700'
  }

  return 'bg-amber-50 text-amber-700'
}

const AdminChapterList = ({
  chapters,
  deletingChapterId,
  editingChapterId,
  savingChapter,
  syncingChapterId,
  onDeleteChapter,
  onEditChapter,
  onSyncChapter,
}) => {
  const [openChapterIds, setOpenChapterIds] = useState({})

  const toggleChapter = (chapterId) => {
    setOpenChapterIds((currentOpenChapterIds) => ({
      ...currentOpenChapterIds,
      [chapterId]: !currentOpenChapterIds[chapterId],
    }))
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-bold text-slate-900">Chapters And Videos</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {chapters.length} total
        </span>
      </div>

      {chapters.length ? (
        <div className="space-y-4 p-4">
          {chapters.map((chapter) => {
            const isEditing = editingChapterId === chapter._id
            const isDeleting = deletingChapterId === chapter._id
            const isSyncing = syncingChapterId === chapter._id
            const isOpen = Boolean(openChapterIds[chapter._id])
            const videos = chapter.videos || []

            return (
              <article
                key={chapter._id}
                className={`overflow-hidden rounded-lg border ${
                  isEditing
                    ? 'border-indigo-300 bg-indigo-50/40'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-start xl:justify-between">
                  <button
                    type="button"
                    onClick={() => toggleChapter(chapter._id)}
                    aria-expanded={isOpen}
                    className="min-w-0 flex-1 text-left transition hover:text-indigo-700"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">{chapter.name}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(chapter.syncStatus)}`}>
                        {chapter.syncStatus || 'pending'}
                      </span>
                    </span>
                    <span className="mt-1 block break-all text-sm text-slate-500">{chapter.playlistUrl}</span>
                    <span className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-1">
                        Order {chapter.order}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">
                        {videos.length || chapter.videoCount || 0} videos
                      </span>
                      {chapter.lastSyncedAt ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          Synced {new Date(chapter.lastSyncedAt).toLocaleString()}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-700">
                        {isOpen ? 'Hide videos' : 'Show videos'}
                      </span>
                    </span>
                    {chapter.syncError ? (
                      <span className="mt-3 block rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                        {chapter.syncError}
                      </span>
                    ) : null}
                  </button>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEditChapter(chapter)}
                      disabled={savingChapter || Boolean(deletingChapterId) || Boolean(syncingChapterId)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      {isEditing ? 'Selected' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSyncChapter(chapter)}
                      disabled={savingChapter || Boolean(deletingChapterId) || isSyncing}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:text-indigo-300"
                    >
                      {isSyncing ? 'Syncing...' : 'Sync Videos'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteChapter(chapter)}
                      disabled={savingChapter || isDeleting || Boolean(syncingChapterId)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  videos.length ? (
                    <div className="grid gap-3 border-t border-slate-200 bg-slate-50/60 p-4 md:grid-cols-2">
                      {videos.map((video) => (
                        <a
                          key={`${chapter._id}-${video.youtubeVideoId}`}
                          href={video.watchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-indigo-200"
                        >
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt=""
                              className="h-20 w-28 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-20 w-28 items-center justify-center rounded-md bg-slate-200 text-xs font-bold text-slate-500">
                              Video
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-bold text-slate-900">
                              {video.title}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                              <span>#{Number(video.position || 0) + 1}</span>
                              {video.duration ? <span>{video.duration}</span> : null}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                      <p className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                        No videos synced for this chapter.
                      </p>
                    </div>
                  )
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">
          No chapters found.
        </div>
      )}
    </section>
  )
}

export default AdminChapterList
