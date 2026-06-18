import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, ImageDown, Share2, Wand2 } from 'lucide-react'

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

const getWorkspaceImageFileName = (workspaceName) => {
  const normalizedName = getWorkspaceZipFileName(workspaceName).replace(/\.zip$/u, '')

  return `${normalizedName}-workspace-card.png`
}

const formatBytes = (bytes) => {
  if (!bytes) {
    return '0 KB'
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const LANGUAGE_LABELS = {
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
  javascript: 'JavaScript',
}

const getLineCount = (content) => {
  const normalizedContent = String(content || '').trim()

  if (!normalizedContent) {
    return 0
  }

  return normalizedContent.split(/\r\n|\r|\n/u).length
}

const getWorkspaceDepth = (nodes) => {
  const nodeById = new Map(nodes.map((node) => [node._id, node]))

  return nodes.reduce((maxDepth, node) => {
    let depth = 1
    let parentId = node.parentId

    while (parentId && nodeById.has(parentId)) {
      depth += 1
      parentId = nodeById.get(parentId)?.parentId
    }

    return Math.max(maxDepth, depth)
  }, 0)
}

const getWorkspaceStats = (workspace, nodes) => {
  const files = nodes.filter((node) => node.type === 'file')
  const folders = nodes.filter((node) => node.type === 'folder')
  const lines = files.reduce((total, file) => total + getLineCount(file.content), 0)
  const size = files.reduce((total, file) => total + (Number(file.size) || 0), 0)
  const languageCounts = files.reduce((counts, file) => {
    if (!file.language) {
      return counts
    }

    return {
      ...counts,
      [file.language]: (counts[file.language] || 0) + 1,
    }
  }, {})
  const topLanguage = Object.entries(languageCounts)
    .sort((first, second) => second[1] - first[1])[0]?.[0] || ''
  const largestFile = files
    .slice()
    .sort((first, second) => (Number(second.size) || 0) - (Number(first.size) || 0))[0]
  const updatedAt = nodes.reduce((latestDate, node) => {
    const nodeDate = new Date(node.updatedAt || 0)

    return nodeDate > latestDate ? nodeDate : latestDate
  }, new Date(workspace?.updatedAt || workspace?.createdAt || Date.now()))

  return {
    depth: getWorkspaceDepth(nodes),
    files: files.length,
    folders: folders.length,
    largestFileName: largestFile?.name || 'Fresh start',
    lines,
    sizeLabel: formatBytes(size),
    topLanguageLabel: LANGUAGE_LABELS[topLanguage] || 'Mixed',
    updatedLabel: updatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }
}

const drawRoundedRect = (context, x, y, width, height, radius) => {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

const drawText = (context, text, x, y, maxWidth, font) => {
  context.font = font

  let nextText = String(text || '')

  while (context.measureText(nextText).width > maxWidth && nextText.length > 3) {
    nextText = `${nextText.slice(0, -4)}...`
  }

  context.fillText(nextText, x, y)
}

const drawStatBlock = (context, label, value, x, y, width, height, accentColor) => {
  context.save()
  drawRoundedRect(context, x, y, width, height, 26)
  context.fillStyle = 'rgba(255, 255, 255, 0.88)'
  context.fill()
  context.strokeStyle = 'rgba(15, 23, 42, 0.12)'
  context.lineWidth = 3
  context.stroke()

  context.fillStyle = accentColor
  drawRoundedRect(context, x + 24, y + 24, 62, 8, 4)
  context.fill()

  context.fillStyle = '#0f172a'
  drawText(context, value, x + 24, y + 92, width - 48, '700 46px Arial')
  context.fillStyle = '#475569'
  drawText(context, label, x + 24, y + 136, width - 48, '600 24px Arial')
  context.restore()
}

const createWorkspaceShareImage = async (workspace, stats) => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to create workspace image.')
  }

  canvas.width = 1080
  canvas.height = 1080

  const background = context.createLinearGradient(0, 0, 1080, 1080)
  background.addColorStop(0, '#0f172a')
  background.addColorStop(0.38, '#155e75')
  background.addColorStop(0.72, '#7c2d12')
  background.addColorStop(1, '#111827')
  context.fillStyle = background
  context.fillRect(0, 0, 1080, 1080)

  context.fillStyle = 'rgba(255, 255, 255, 0.08)'
  for (let index = 0; index < 16; index += 1) {
    const x = 64 + ((index * 173) % 920)
    const y = 82 + ((index * 229) % 850)
    drawRoundedRect(context, x, y, 118, 14, 7)
    context.fill()
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  drawRoundedRect(context, 70, 78, 940, 924, 42)
  context.fill()

  context.fillStyle = '#0f172a'
  context.font = '800 64px Arial'
  drawText(context, workspace?.name || 'Workspace', 118, 184, 790, '800 64px Arial')
  context.fillStyle = '#64748b'
  drawText(context, 'Workspace share card', 122, 232, 520, '600 28px Arial')

  context.fillStyle = '#0369a1'
  drawRoundedRect(context, 790, 136, 158, 56, 28)
  context.fill()
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.font = '800 24px Arial'
  context.fillText(stats.topLanguageLabel, 869, 173)
  context.textAlign = 'left'

  drawStatBlock(context, 'lines of code', stats.lines.toLocaleString(), 118, 306, 390, 178, '#2563eb')
  drawStatBlock(context, 'files', stats.files.toLocaleString(), 572, 306, 176, 178, '#059669')
  drawStatBlock(context, 'folders', stats.folders.toLocaleString(), 772, 306, 176, 178, '#ea580c')
  drawStatBlock(context, 'storage', stats.sizeLabel, 118, 534, 270, 178, '#7c3aed')
  drawStatBlock(context, 'folder depth', `${stats.depth} levels`, 426, 534, 260, 178, '#0891b2')
  drawStatBlock(context, 'updated', stats.updatedLabel, 724, 534, 224, 178, '#be123c')

  context.fillStyle = '#f8fafc'
  drawRoundedRect(context, 118, 762, 830, 116, 28)
  context.fill()
  context.strokeStyle = '#e2e8f0'
  context.lineWidth = 2
  context.stroke()
  context.fillStyle = '#64748b'
  drawText(context, 'Largest file', 148, 814, 220, '700 24px Arial')
  context.fillStyle = '#0f172a'
  drawText(context, stats.largestFileName, 148, 854, 760, '800 34px Arial')

  context.fillStyle = '#0f172a'
  context.font = '700 26px Arial'
  context.fillText('Built in Jack Computer Courses IDE', 118, 940)
  context.fillStyle = '#64748b'
  context.font = '600 22px Arial'
  context.fillText('Share your workspace progress', 118, 970)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to create workspace image.'))
        return
      }

      resolve(blob)
    }, 'image/png', 0.95)
  })
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
  const [shareBlob, setShareBlob] = useState(null)
  const [shareImageUrl, setShareImageUrl] = useState('')
  const [shareStats, setShareStats] = useState(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareError, setShareError] = useState('')
  const shareImageUrlRef = useRef('')

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

  const clearShareImage = useCallback(() => {
    if (shareImageUrlRef.current) {
      window.URL.revokeObjectURL(shareImageUrlRef.current)
      shareImageUrlRef.current = ''
    }

    setShareBlob(null)
    setShareImageUrl('')
    setShareStats(null)
    setShareError('')
  }, [])

  useEffect(() => () => {
    if (shareImageUrlRef.current) {
      window.URL.revokeObjectURL(shareImageUrlRef.current)
    }
  }, [])

  useEffect(() => {
    clearShareImage()
  }, [clearShareImage, selectedWorkspaceId])

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

  const revealShareImage = useCallback(async () => {
    if (!selectedWorkspace?._id) {
      setShareError('Select a workspace before creating a share image.')
      return
    }

    setShareLoading(true)
    setShareError('')

    try {
      if (selectedWorkspace._id === activeWorkspaceId && isActiveWorkspaceDirty) {
        const didSave = await onSaveActiveWorkspaceFile?.()

        if (!didSave) {
          throw new Error('Save the current file before creating a share image.')
        }
      }

      const response = await axios.get(`${workspaceBaseUrl}/workspaces/${selectedWorkspace._id}/nodes`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load workspace stats')
      }

      const nodes = response.data?.data?.nodes || []
      const stats = getWorkspaceStats(selectedWorkspace, nodes)
      const imageBlob = await createWorkspaceShareImage(selectedWorkspace, stats)
      const imageUrl = window.URL.createObjectURL(imageBlob)

      if (shareImageUrlRef.current) {
        window.URL.revokeObjectURL(shareImageUrlRef.current)
      }

      shareImageUrlRef.current = imageUrl
      setShareStats(stats)
      setShareBlob(imageBlob)
      setShareImageUrl(imageUrl)
    } catch (shareRequestError) {
      setShareError(getErrorMessage(shareRequestError, 'Unable to create share image.'))
    } finally {
      setShareLoading(false)
    }
  }, [
    activeWorkspaceId,
    isActiveWorkspaceDirty,
    onSaveActiveWorkspaceFile,
    selectedWorkspace,
    workspaceBaseUrl,
  ])

  const downloadShareImage = useCallback(() => {
    if (!shareBlob || !selectedWorkspace) {
      return
    }

    const imageUrl = window.URL.createObjectURL(shareBlob)
    const downloadLink = document.createElement('a')

    downloadLink.href = imageUrl
    downloadLink.download = getWorkspaceImageFileName(selectedWorkspace.name)
    document.body.appendChild(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    window.URL.revokeObjectURL(imageUrl)
  }, [selectedWorkspace, shareBlob])

  const shareWorkspaceImage = useCallback(async () => {
    if (!shareBlob || !selectedWorkspace) {
      return
    }

    const imageFile = new File([shareBlob], getWorkspaceImageFileName(selectedWorkspace.name), {
      type: 'image/png',
    })

    if (navigator.canShare?.({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile],
          text: `My ${selectedWorkspace.name} workspace progress from Jack Computer Courses IDE.`,
          title: `${selectedWorkspace.name} workspace`,
        })
        return
      } catch (shareRequestError) {
        if (shareRequestError?.name === 'AbortError') {
          return
        }

        setShareError(getErrorMessage(shareRequestError, 'Unable to open sharing.'))
        return
      }
    }

    downloadShareImage()
  }, [downloadShareImage, selectedWorkspace, shareBlob])

  return (
    <main className="flex min-w-0 flex-1 justify-center overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-slate-900">
      <section className="w-full max-w-3xl">
        <div className="mx-auto w-full max-w-sm">
          <label htmlFor="ide-workspace-download-select" className="sr-only">Workspace</label>
          <select
            id="ide-workspace-download-select"
            value={selectedWorkspaceId}
            onChange={(event) => setDownloadWorkspaceId(event.target.value)}
            disabled={workspacesLoading || !workspaces.length || isDownloading || shareLoading}
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
            disabled={workspacesLoading || !selectedWorkspace || isDownloading || saving || shareLoading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            {downloadingWorkspaceId === selectedWorkspaceId ? 'Downloading...' : 'Download ZIP'}
          </button>

          <button
            type="button"
            onClick={revealShareImage}
            disabled={workspacesLoading || !selectedWorkspace || saving || shareLoading || isDownloading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Wand2 className="h-4 w-4" />
            {shareLoading ? 'Creating share card...' : shareImageUrl ? 'Refresh Share Card' : 'Reveal Share Card'}
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

          {shareError ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {shareError}
            </p>
          ) : null}
        </div>

        {shareImageUrl ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <img
                src={shareImageUrl}
                alt={`${selectedWorkspace?.name || 'Workspace'} share card preview`}
                className="aspect-square w-full rounded-md object-cover"
              />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={shareWorkspaceImage}
                disabled={!shareBlob}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
              >
                <Share2 className="h-4 w-4" />
                Share Image
              </button>
              <button
                type="button"
                onClick={downloadShareImage}
                disabled={!shareBlob}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <ImageDown className="h-4 w-4" />
                Download PNG
              </button>

              {shareStats ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  <p>{shareStats.lines.toLocaleString()} lines</p>
                  <p>{shareStats.files.toLocaleString()} files</p>
                  <p>{shareStats.folders.toLocaleString()} folders</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default IDEWorkspace
