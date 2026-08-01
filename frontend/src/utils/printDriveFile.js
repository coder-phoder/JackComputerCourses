const API_BASE_URL = import.meta.env.VITE_BASE_URL

// Prints a Google Drive file in a new tab. The file is streamed through our own API so the
// bytes become a same-origin blob: a cross-origin Drive preview can be embedded but never
// printed, while a blob renders in the browser's native viewer and prints directly.
const printDriveFile = async (file) => {
  if (!file?.fileId) {
    return
  }

  // Opened before awaiting so the tab is not treated as an unrequested popup.
  const printTab = window.open('', '_blank')
  if (!printTab) {
    return
  }

  printTab.document.title = file.name || 'Print'
  printTab.document.body.style.margin = '0'

  try {
    const response = await fetch(`${API_BASE_URL}/drive-files/${file.fileId}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Unable to download the file')
    }

    const blobUrl = URL.createObjectURL(await response.blob())

    const frame = printTab.document.createElement('iframe')
    frame.src = blobUrl
    frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0'
    frame.onload = () => {
      printTab.focus()
      frame.contentWindow.print()
    }

    printTab.addEventListener('pagehide', () => URL.revokeObjectURL(blobUrl))
    printTab.document.body.appendChild(frame)
  } catch {
    printTab.document.body.textContent = 'Unable to open this file for printing. Please try again.'
  }
}

export default printDriveFile
