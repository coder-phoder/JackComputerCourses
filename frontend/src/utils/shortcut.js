// The one keyboard shortcut in the app, named the way the reader's own keyboard names
// it. The palette binds it and the console prints it on its button, so both read the
// same label off here rather than each guessing at the platform.
export const COMMAND_SHORTCUT = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'
