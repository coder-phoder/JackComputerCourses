const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100'

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
  <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {editingChapter ? 'Edit Chapter' : 'Create Chapter'}
        </h2>
        {editingChapter ? (
          <p className="mt-1 text-sm text-slate-500">{editingChapter.name}</p>
        ) : null}
      </div>
      {editingChapter ? (
        <button
          type="button"
          onClick={onCancel}
          disabled={savingChapter}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Cancel
        </button>
      ) : null}
    </div>

    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="chapter-name" className="block text-sm font-medium text-slate-700">
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
        <label htmlFor="chapter-playlist" className="block text-sm font-medium text-slate-700">
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
        <label htmlFor="chapter-order" className="block text-sm font-medium text-slate-700">
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
      <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {error}
      </p>
    ) : null}

    {success ? (
      <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
        {success}
      </p>
    ) : null}
  </section>
)

export default AdminChapterForm
