import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Download,
  FileCode2,
  FolderTree,
  HardDrive,
  ImageDown,
  Layers3,
  Loader2,
  Share2,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'

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

const getWorkspaceInitials = (name) => {
  const words = String(name || 'Workspace')
    .trim()
    .split(/\s+/u)
    .filter(Boolean)

  return (words[0]?.[0] || 'W').toUpperCase() + (words[1]?.[0] || '').toUpperCase()
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
  const [shareWorkspaceId, setShareWorkspaceId] = useState('')
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

  useEffect(() => () => {
    if (shareImageUrlRef.current) {
      window.URL.revokeObjectURL(shareImageUrlRef.current)
    }
  }, [])

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
  const selectedWorkspaceIndex = useMemo(
    () => workspaces.findIndex((workspace) => workspace._id === selectedWorkspaceId),
    [selectedWorkspaceId, workspaces],
  )
  const selectedWorkspaceInitials = useMemo(
    () => getWorkspaceInitials(selectedWorkspace?.name),
    [selectedWorkspace?.name],
  )
  const isShareImageVisible = Boolean(shareImageUrl && shareWorkspaceId === selectedWorkspaceId)
  const visibleShareStats = isShareImageVisible ? shareStats : null
  const visibleShareBlob = isShareImageVisible ? shareBlob : null
  const shareMetricItems = visibleShareStats ? [
    { label: 'Lines', value: visibleShareStats.lines.toLocaleString(), Icon: FileCode2, accent: 'text-blue-600 dark:text-blue-300' },
    { label: 'Files', value: visibleShareStats.files.toLocaleString(), Icon: Layers3, accent: 'text-emerald-600 dark:text-emerald-300' },
    { label: 'Folders', value: visibleShareStats.folders.toLocaleString(), Icon: FolderTree, accent: 'text-amber-600 dark:text-amber-300' },
    { label: 'Storage', value: visibleShareStats.sizeLabel, Icon: HardDrive, accent: 'text-rose-600 dark:text-rose-300' },
  ] : []

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
      setShareWorkspaceId(selectedWorkspace._id)
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
    if (!visibleShareBlob || !selectedWorkspace) {
      return
    }

    const imageUrl = window.URL.createObjectURL(visibleShareBlob)
    const downloadLink = document.createElement('a')

    downloadLink.href = imageUrl
    downloadLink.download = getWorkspaceImageFileName(selectedWorkspace.name)
    document.body.appendChild(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    window.URL.revokeObjectURL(imageUrl)
  }, [selectedWorkspace, visibleShareBlob])

  const shareWorkspaceImage = useCallback(async () => {
    if (!visibleShareBlob || !selectedWorkspace) {
      return
    }

    const imageFile = new File([visibleShareBlob], getWorkspaceImageFileName(selectedWorkspace.name), {
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
  }, [downloadShareImage, selectedWorkspace, visibleShareBlob])

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-lg font-black text-slate-950 shadow-lg shadow-cyan-950/20">
                  {selectedWorkspaceInitials}
                </div>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-cyan-100 ring-1 ring-white/10">
                      <Archive className="h-3.5 w-3.5" />
                      Workspace
                    </span>
                    {selectedWorkspace?._id === activeWorkspaceId ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-300/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : null}
                  </div>
                  <h1 className="truncate text-2xl font-black tracking-normal sm:text-3xl">
                    {selectedWorkspace?.name || 'Workspace Center'}
                  </h1>
                  <p className="mt-1 text-sm font-semibold text-slate-300">
                    {workspacesLoading
                      ? 'Loading workspaces...'
                      : selectedWorkspace
                        ? `${selectedWorkspaceIndex + 1} of ${workspaces.length} workspaces`
                        : 'No workspace available'}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px]">
                <button
                  type="button"
                  onClick={downloadWorkspace}
                  disabled={workspacesLoading || !selectedWorkspace || isDownloading || saving || shareLoading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {downloadingWorkspaceId === selectedWorkspaceId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloadingWorkspaceId === selectedWorkspaceId ? 'Downloading' : 'Download ZIP'}
                </button>
                <button
                  type="button"
                  onClick={revealShareImage}
                  disabled={workspacesLoading || !selectedWorkspace || saving || shareLoading || isDownloading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                >
                  {shareLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {shareLoading ? 'Creating' : isShareImageVisible ? 'Refresh Card' : 'Share Card'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <label htmlFor="ide-workspace-download-select" className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Select Workspace
                </label>
                <select
                  id="ide-workspace-download-select"
                  value={selectedWorkspaceId}
                  onChange={(event) => setDownloadWorkspaceId(event.target.value)}
                  disabled={workspacesLoading || !workspaces.length || isDownloading || shareLoading}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {!workspaces.length ? (
                    <option value="">No workspaces</option>
                  ) : null}
                  {workspaces.map((workspace) => (
                    <option key={workspace._id} value={workspace._id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <Layers3 className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      Total
                    </div>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{workspaces.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                      Status
                    </div>
                    <p className="mt-2 truncate text-sm font-black text-slate-950 dark:text-white">
                      {saving ? 'Saving' : isActiveWorkspaceDirty ? 'Unsaved' : 'Ready'}
                    </p>
                  </div>
                </div>
              </div>

              {(downloadError || shareError) ? (
                <div className="space-y-2">
                  {downloadError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                      {downloadError}
                    </p>
                  ) : null}

                  {shareError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                      {shareError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {visibleShareStats ? (
                <div className="grid grid-cols-2 gap-3">
                  {shareMetricItems.map(({ label, value, Icon, accent }) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className={`mb-2 flex items-center gap-2 text-xs font-black uppercase ${accent}`}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                      <p className="truncate text-lg font-black text-slate-950 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white">Share card not generated</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Stats appear after creating a card.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </aside>

            <div className="min-w-0">
              {isShareImageVisible ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <img
                      src={shareImageUrl}
                      alt={`${selectedWorkspace?.name || 'Workspace'} share card preview`}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={shareWorkspaceImage}
                      disabled={!visibleShareBlob}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Image
                    </button>
                    <button
                      type="button"
                      onClick={downloadShareImage}
                      disabled={!visibleShareBlob}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <ImageDown className="h-4 w-4" />
                      Download PNG
                    </button>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                        <CalendarDays className="h-4 w-4 text-rose-600 dark:text-rose-300" />
                        Updated
                      </div>
                      <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{visibleShareStats?.updatedLabel}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                        <FileCode2 className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                        Largest
                      </div>
                      <p className="mt-2 truncate text-sm font-black text-slate-950 dark:text-white">{visibleShareStats?.largestFileName}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {workspacesLoading ? (
                    <div className="text-center">
                      <Loader2 className="mx-auto h-9 w-9 animate-spin text-cyan-600 dark:text-cyan-300" />
                      <p className="mt-4 text-sm font-black text-slate-900 dark:text-white">Loading workspaces...</p>
                    </div>
                  ) : selectedWorkspace ? (
                    <div className="w-full max-w-md text-center">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg bg-slate-950 text-2xl font-black text-white shadow-lg dark:bg-white dark:text-slate-950">
                        {selectedWorkspaceInitials}
                      </div>
                      <h2 className="mt-5 truncate text-2xl font-black text-slate-950 dark:text-white">
                        {selectedWorkspace.name}
                      </h2>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Package</p>
                          <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">ZIP archive</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Card</p>
                          <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">PNG image</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Archive className="mx-auto h-10 w-10 text-slate-400" />
                      <p className="mt-4 text-sm font-black text-slate-900 dark:text-white">No workspace available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default IDEWorkspace
