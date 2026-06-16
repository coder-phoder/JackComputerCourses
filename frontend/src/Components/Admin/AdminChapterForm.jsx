const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800'

const AdminChapterForm = ({
  chapterForm,
  editingChapter,
  error,
  savingChapter,
  success,
  onCancel,
  onChange,
  onSubmit,
}) => (
  <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {editingChapter ? 'Edit Chapter' : 'Create Chapter'}
        </h2>
        {editingChapter ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{editingChapter.name}</p>
        ) : null}
      </div>
      {editingChapter ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={savingChapter}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
        >
          Cancel
        </button>
      ) : null}
    </div>

    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="chapter-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Chapter Name
        </label>
        <input
          id="chapter-name"
          name="name"
          type="text"
          value={chapterForm.name}
          onChange={onChange}
          disabled={savingChapter}
          className={inputClass}
          placeholder="Introduction"
        />
      </div>

      <div>
        <label htmlFor="chapter-playlist" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          YouTube Playlist Link
        </label>
        <textarea
          id="chapter-playlist"
          name="playlistUrl"
          rows="3"
          value={chapterForm.playlistUrl}
          onChange={onChange}
          disabled={savingChapter}
          className={`${inputClass} resize-y`}
          placeholder="https://www.youtube.com/playlist?list=..."
        />
      </div>

      <div>
        <label htmlFor="chapter-order" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Order
        </label>
        <input
          id="chapter-order"
          name="order"
          type="number"
          min="0"
          step="1"
          value={chapterForm.order}
          onChange={onChange}
          disabled={savingChapter}
          className={inputClass}
          placeholder="0"
        />
      </div>

      <button
        type="submit"
        disabled={savingChapter}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {savingChapter ? 'Saving...' : editingChapter ? 'Save Chapter' : 'Create Chapter'}
      </button>
    </form>

    {error ? (
      <p className="mt-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
        {error}
      </p>
    ) : null}

    {success ? (
      <p className="mt-5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        {success}
      </p>
    ) : null}
  </section>
)

export default AdminChapterForm
