import { useEffect, useState } from 'react'
import { ExternalLink, Eye, File, FileText, Image as ImageIcon, X } from 'lucide-react'

const getFileTypeLabel = (mimeType) => {
  const fileType = String(mimeType || '').split('/').pop()

  return fileType ? fileType.toUpperCase() : 'FILE'
}

const getFileIcon = (mimeType) => {
  const normalizedMimeType = String(mimeType || '').toLowerCase()

  if (normalizedMimeType.includes('image')) {
    return <ImageIcon className="h-5 w-5 text-emerald-500" />
  }

  if (normalizedMimeType.includes('pdf') || normalizedMimeType.includes('document') || normalizedMimeType.includes('word')) {
    return <FileText className="h-5 w-5 text-red-500" />
  }

  return <File className="h-5 w-5 text-slate-500" />
}

const DriveFileList = ({ files = [], emptyMessage = 'No files were found in this Google Drive folder.' }) => {
  const [activeFile, setActiveFile] = useState(null)

  useEffect(() => {
    if (!activeFile) {
      return undefined
    }

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveFile(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeFile])

  if (!files.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 py-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-2">
        {files.map((file) => (
          <div
            key={file.fileId}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/30 p-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              onClick={() => setActiveFile(file)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900">
                {getFileIcon(file.mimeType)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={file.name}>
                  {file.name}
                </span>
                <span className="mt-0.5 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {getFileTypeLabel(file.mimeType)}
                </span>
              </span>
            </button>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setActiveFile(file)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/40 sm:flex-none"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 sm:flex-none"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            </div>
          </div>
        ))}
      </div>

      {activeFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-3 sm:p-6">
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            onClick={() => setActiveFile(null)}
          />

          <div className="relative z-10 flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100" title={activeFile.name}>
                  {activeFile.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {getFileTypeLabel(activeFile.mimeType)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveFile(null)}
                aria-label="Close preview"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 bg-slate-950">
              <iframe
                src={`https://drive.google.com/file/d/${activeFile.fileId}/preview`}
                title={activeFile.name}
                className="h-full w-full border-0"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default DriveFileList
