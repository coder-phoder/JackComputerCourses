import { useState } from 'react'

const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100'
const textAreaClass = `${inputClass} resize-y`

const AdminCourseForm = ({
  courseForm,
  editingCourse,
  error,
  saving,
  success,
  onCancel,
  onChange,
  onSubmit,
}) => {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {editingCourse ? 'Edit Course' : 'Create Course'}
          </h2>
          {editingCourse ? (
            <p className="mt-1 text-sm text-slate-500">{editingCourse.title}</p>
          ) : null}
        </div>
        {editingCourse ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="course-title" className="block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              id="course-title"
              name="title"
              type="text"
              value={courseForm.title}
              onChange={onChange}
              disabled={saving}
              className={inputClass}
              placeholder="Course title"
            />
          </div>

          <div>
            <label htmlFor="course-slug" className="block text-sm font-medium text-slate-700">
              Slug
            </label>
            <input
              id="course-slug"
              name="slug"
              type="text"
              value={courseForm.slug}
              onChange={onChange}
              disabled={saving}
              className={inputClass}
              placeholder="auto-from-title"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="course-duration" className="block text-sm font-medium text-slate-700">
              Duration
            </label>
            <input
              id="course-duration"
              name="duration"
              type="text"
              value={courseForm.duration}
              onChange={onChange}
              disabled={saving}
              className={inputClass}
              placeholder="8 weeks"
            />
          </div>

          <div>
            <label htmlFor="course-price" className="block text-sm font-medium text-slate-700">
              Price
            </label>
            <input
              id="course-price"
              name="price"
              type="number"
              min="0"
              step="1"
              value={courseForm.price}
              onChange={onChange}
              disabled={saving}
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label htmlFor="course-short-description" className="block text-sm font-medium text-slate-700">
            Short Description
          </label>
          <input
            id="course-short-description"
            name="shortDescription"
            type="text"
            value={courseForm.shortDescription}
            onChange={onChange}
            disabled={saving}
            className={inputClass}
            placeholder="Brief course summary"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdditionalDetails((isOpen) => !isOpen)}
          disabled={saving}
          aria-expanded={showAdditionalDetails}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          <span>Additional Details</span>
          <span className="text-lg leading-none">{showAdditionalDetails ? '-' : '+'}</span>
        </button>

        {showAdditionalDetails ? (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <div>
          <label htmlFor="course-description" className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="course-description"
            name="description"
            rows="4"
            value={courseForm.description}
            onChange={onChange}
            disabled={saving}
            className={textAreaClass}
            placeholder="Course description"
          />
        </div>

            <div>
              <label htmlFor="course-thumbnail" className="block text-sm font-medium text-slate-700">
                Thumbnail URL
              </label>
              <input
                id="course-thumbnail"
                name="thumbnailUrl"
                type="url"
                value={courseForm.thumbnailUrl}
                onChange={onChange}
                disabled={saving}
                className={inputClass}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="course-category" className="block text-sm font-medium text-slate-700">
                  Category
                </label>
                <input
                  id="course-category"
                  name="category"
                  type="text"
                  value={courseForm.category}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="Web"
                />
              </div>

              <div>
                <label htmlFor="course-level" className="block text-sm font-medium text-slate-700">
                  Level
                </label>
                <input
                  id="course-level"
                  name="level"
                  type="text"
                  value={courseForm.level}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="Beginner"
                />
              </div>

              <div>
                <label htmlFor="course-language" className="block text-sm font-medium text-slate-700">
                  Language
                </label>
                <input
                  id="course-language"
                  name="language"
                  type="text"
                  value={courseForm.language}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="English"
                />
              </div>
            </div>

            <div>
              <label htmlFor="course-tags" className="block text-sm font-medium text-slate-700">
                Tags
              </label>
              <input
                id="course-tags"
                name="tags"
                type="text"
                value={courseForm.tags}
                onChange={onChange}
                disabled={saving}
                className={inputClass}
                placeholder="html, css, javascript"
              />
            </div>

            <div>
              <label htmlFor="course-highlights" className="block text-sm font-medium text-slate-700">
                Highlights
              </label>
              <textarea
                id="course-highlights"
                name="highlights"
                rows="2"
                value={courseForm.highlights}
                onChange={onChange}
                disabled={saving}
                className={textAreaClass}
                placeholder="Live projects, certificate"
              />
            </div>

            <div>
              <label htmlFor="course-prerequisites" className="block text-sm font-medium text-slate-700">
                Prerequisites
              </label>
              <textarea
                id="course-prerequisites"
                name="prerequisites"
                rows="2"
                value={courseForm.prerequisites}
                onChange={onChange}
                disabled={saving}
                className={textAreaClass}
                placeholder="Basic computer knowledge"
              />
            </div>
          </div>
        ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">Published</span>
          <input
            name="isPublished"
            type="checkbox"
            checked={courseForm.isPublished}
            onChange={onChange}
            disabled={saving}
            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">Open to All</span>
          <input
            name="isOpenToAll"
            type="checkbox"
            checked={courseForm.isOpenToAll}
            onChange={onChange}
            disabled={saving}
            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {saving ? 'Saving...' : editingCourse ? 'Save Course' : 'Create Course'}
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
}

export default AdminCourseForm
