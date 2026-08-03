import { Download, FolderTree, Import, PanelsTopLeft, SquareTerminal, Wrench } from 'lucide-react'

// The faculty IDE has no query panel of its own — student questions live on the
// Queries page — so this tour opens the three panels the left bar does carry.
const getFacultyIdePageTour = ({ openActivity, openExplorer, openTerminal }) => [
  {
    id: 'activity',
    target: '[data-tour="ide-activity"]',
    icon: PanelsTopLeft,
    eyebrow: 'Stop 1',
    title: 'The three icons',
    points: [
      'Files, download, import',
      'Each one swaps the panel beside it',
      'The tour opens all three now',
    ],
    onEnter: () => openActivity('explorer'),
  },
  {
    id: 'explorer',
    target: '[data-tour="ide-explorer"]',
    icon: FolderTree,
    eyebrow: 'Stop 2',
    title: 'Your files',
    points: [
      'Workspaces hold folders and files',
      'Right click for new, rename, delete',
      'Drag a file to move it',
    ],
    onEnter: () => {
      openActivity('explorer')
      openExplorer()
    },
  },
  {
    id: 'toolbar',
    target: '[data-tour="ide-toolbar"]',
    icon: Wrench,
    eyebrow: 'Stop 3',
    title: 'Run and save',
    points: [
      'Run starts the open file',
      'Edits save on their own, Save forces it',
      'The gear holds font size and shortcuts',
    ],
    onEnter: () => openActivity('explorer'),
  },
  {
    id: 'terminal',
    target: '[data-tour="ide-terminal"]',
    icon: SquareTerminal,
    eyebrow: 'Stop 4',
    title: 'The terminal',
    points: [
      'Output lands here',
      'Type input while the program runs',
      "Ctrl + ` hides it, Ctrl + ' runs again",
    ],
    onEnter: () => {
      openActivity('explorer')
      openTerminal()
    },
  },
  {
    id: 'download',
    target: '[data-tour="ide-download"]',
    icon: Download,
    eyebrow: 'Stop 5',
    title: 'Take it with you',
    points: [
      'Downloads a whole workspace as a zip',
      'Save before downloading',
      'Handy for a solution you reuse',
    ],
    onEnter: () => openActivity('download'),
  },
  {
    id: 'import',
    target: '[data-tour="ide-import"]',
    icon: Import,
    eyebrow: 'Stop 6',
    title: 'Import and share',
    points: [
      'Drop a zip in to get it back',
      'Share files with a student by link',
      'Anything shared with you shows up here',
    ],
    onEnter: () => openActivity('importExport'),
  },
]

export default getFacultyIdePageTour
