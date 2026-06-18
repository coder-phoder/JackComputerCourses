import axios from 'axios'
import { useCallback, useMemo, useState } from 'react'
import { Download } from 'lucide-react'

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const getWorkspaceZipFileName = (workspaceName) => {
  const normalizedName = String(workspaceName || 'workspace')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${normalizedName || 'workspace'}.zip`
}

const IDEWorkspace = ({
  activeWorkspaceId = '',
  isActiveWorkspaceDirty = false,
  onSaveActiveWorkspaceFile,
  saving = false,
  workspaceBaseUrl = '',
  workspaces = [],
  workspacesLoading = false,
}) => {
  const [downloadWorkspaceId, setDownloadWorkspaceId] = useState('')
  const [downloadingWorkspaceId, setDownloadingWorkspaceId] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const selectedWorkspaceId = useMemo(() => {
    if (downloadWorkspaceId && workspaces.some((workspace) => workspace._id === downloadWorkspaceId)) {
      return downloadWorkspaceId
    }

    if (activeWorkspaceId && workspaces.some((workspace) => workspace._id === activeWorkspaceId)) {
      return activeWorkspaceId
    }

    return workspaces[0]?._id || ''
  }, [activeWorkspaceId, downloadWorkspaceId, workspaces])

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace._id === selectedWorkspaceId) || null,
    [selectedWorkspaceId, workspaces],
  )

  const downloadWorkspace = useCallback(async () => {
    if (!selectedWorkspace?._id) {
      setDownloadError('Select a workspace before downloading.')
      return
    }

    if (downloadingWorkspaceId) {
      return
    }

    setDownloadError('')
    setDownloadingWorkspaceId(selectedWorkspace._id)

    try {
      if (selectedWorkspace._id === activeWorkspaceId && isActiveWorkspaceDirty) {
        const didSave = await onSaveActiveWorkspaceFile?.()

        if (!didSave) {
          throw new Error('Save the current file before downloading this workspace.')
        }
      }

      const response = await axios.get(`${workspaceBaseUrl}/workspaces/${selectedWorkspace._id}/download`, {
        responseType: 'blob',
        withCredentials: true,
      })
      const blobUrl = window.URL.createObjectURL(response.data)
      const downloadLink = document.createElement('a')

      downloadLink.href = blobUrl
      downloadLink.download = getWorkspaceZipFileName(selectedWorkspace.name)
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (downloadRequestError) {
      let message = getErrorMessage(downloadRequestError, 'Unable to download workspace.')
      const errorData = downloadRequestError?.response?.data

      if (errorData instanceof Blob) {
        try {
          const parsedError = JSON.parse(await errorData.text())
          message = parsedError?.message || message
        } catch {
          message = 'Unable to download workspace.'
        }
      }

      setDownloadError(message)
    } finally {
      setDownloadingWorkspaceId('')
    }
  }, [
    activeWorkspaceId,
    downloadingWorkspaceId,
    isActiveWorkspaceDirty,
    onSaveActiveWorkspaceFile,
    selectedWorkspace,
    workspaceBaseUrl,
  ])

  const isDownloading = Boolean(downloadingWorkspaceId)

  return (
    <main className="flex min-w-0 flex-1 items-center justify-center bg-slate-50 px-4 py-6 dark:bg-slate-900">
      <section className="w-full max-w-sm">
        <label htmlFor="ide-workspace-download-select" className="sr-only">Workspace</label>
        <select
          id="ide-workspace-download-select"
          value={selectedWorkspaceId}
          onChange={(event) => setDownloadWorkspaceId(event.target.value)}
          disabled={workspacesLoading || !workspaces.length || isDownloading}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          {workspaces.map((workspace) => (
            <option key={workspace._id} value={workspace._id}>
              {workspace.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={downloadWorkspace}
          disabled={workspacesLoading || !selectedWorkspace || isDownloading || saving}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-700"
        >
          <Download className="h-4 w-4" />
          {downloadingWorkspaceId === selectedWorkspaceId ? 'Downloading...' : 'Download ZIP'}
        </button>

        {workspacesLoading ? (
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">Loading workspaces...</p>
        ) : !selectedWorkspace ? (
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">No workspace available</p>
        ) : null}

        {downloadError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {downloadError}
          </p>
        ) : null}
      </section>
    </main>
  )
}

export default IDEWorkspace
