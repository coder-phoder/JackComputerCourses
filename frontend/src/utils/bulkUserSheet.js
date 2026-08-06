import JSZip from 'jszip'

// Everything that touches the bulk import sheet reads it from here: the sample file is
// written from these columns, an uploaded file is matched against them, and the preview
// takes its labels from them. Nothing else has to know what a column is called.
export const SHEET_COLUMNS = [
  {
    key: 'firstName',
    header: 'firstname',
    label: 'First name',
    required: true,
    aliases: ['first', 'fname', 'givenname'],
  },
  {
    key: 'lastName',
    header: 'lastname',
    label: 'Last name',
    required: true,
    aliases: ['last', 'lname', 'surname'],
  },
  {
    key: 'phone',
    header: 'phno',
    label: 'Phone',
    required: true,
    aliases: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact', 'contactnumber'],
  },
  {
    key: 'password',
    header: 'password',
    label: 'Password',
    required: false,
    aliases: ['pass'],
  },
]

// The rows the sample file ships with. They double as the demo the animation types out,
// so an admin downloads exactly the sheet they just watched being filled in — two of
// them leave the password empty, which is how the auto password gets shown off.
export const SAMPLE_USERS = [
  { firstName: 'Priya', lastName: 'Shah', phone: '9825012345', password: '' },
  { firstName: 'Rahul', lastName: 'Mehta', phone: '9737045678', password: 'rahul@2026' },
  { firstName: 'Anita', lastName: 'Desai', phone: '9574098765', password: '' },
]

export const SHEET_FILE_ACCEPT = '.csv,.xlsx'

const SAMPLE_FILE_NAME = 'bulk-users-sample'
// Excel decides a .csv is UTF-8 from this mark rather than from the charset, so the
// sample is written with it. Reading one back never has to strip it: the browser drops
// it while decoding, and a header that somehow kept it is normalized past it below.
const BYTE_ORDER_MARK = '\uFEFF'
const CSV_MIME = 'text/csv;charset=utf-8'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const SHEET_XML_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const PACKAGE_RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const DOCUMENT_RELS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

// Headers are compared with their casing and punctuation thrown away, so "Ph No",
// "phone_number" and "PhNo" all land on the same column.
const normalizeHeader = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

const COLUMN_KEY_BY_HEADER = new Map(
  SHEET_COLUMNS.flatMap((column) => (
    [column.header, ...column.aliases].map((alias) => [normalizeHeader(alias), column.key])
  )),
)

const isEmptyCell = (cell) => !String(cell ?? '').trim()

// A quoted field is the only reason a comma or a newline is not a separator, so the
// text is walked once rather than split: whatever is inside the quotes stays together.
const parseCsv = (text) => {
  const characters = String(text)
  const grid = []
  let cells = []
  let value = ''
  let isQuoted = false

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index]

    if (isQuoted) {
      if (character !== '"') {
        value += character
      } else if (characters[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        isQuoted = false
      }
      continue
    }

    if (character === '"') {
      isQuoted = true
    } else if (character === ',') {
      cells.push(value)
      value = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && characters[index + 1] === '\n') {
        index += 1
      }
      cells.push(value)
      grid.push(cells)
      cells = []
      value = ''
    } else {
      value += character
    }
  }

  cells.push(value)
  grid.push(cells)

  return grid
}

const escapeCsvValue = (value) => (
  /[",\r\n]/.test(value) ? `"${String(value).replace(/"/gu, '""')}"` : String(value)
)

const buildCsv = (grid) => grid.map((cells) => cells.map(escapeCsvValue).join(',')).join('\r\n')

// A1 style references are what say where a cell actually sits, so a sheet that skips
// a column keeps the ones after it in the right place.
const getColumnIndex = (reference, fallbackIndex) => {
  const letters = String(reference || '').replace(/[^A-Za-z]/gu, '').toUpperCase()

  if (!letters) {
    return fallbackIndex
  }

  return [...letters].reduce((index, letter) => index * 26 + (letter.charCodeAt(0) - 64), 0) - 1
}

const getColumnName = (index) => {
  let name = ''

  for (let remaining = index; remaining >= 0; remaining = Math.floor(remaining / 26) - 1) {
    name = String.fromCharCode(65 + (remaining % 26)) + name
  }

  return name
}

const getTagText = (node, tagName) => {
  const [found] = node.getElementsByTagName(tagName)

  return found ? found.textContent : ''
}

// Rich text is split across runs, so every piece of text under the node is one value.
const getJoinedText = (node) => (
  Array.from(node.getElementsByTagName('t')).map((textNode) => textNode.textContent).join('')
)

const readSheetCell = (cellNode, sharedStrings) => {
  const type = cellNode.getAttribute('t')

  if (type === 's') {
    return sharedStrings[Number(getTagText(cellNode, 'v'))] ?? ''
  }

  if (type === 'inlineStr') {
    return getJoinedText(cellNode)
  }

  return getTagText(cellNode, 'v')
}

// An .xlsx is a zip of XML, and the only parts worth opening are the first sheet and
// the string table it points into — which is why this needs no spreadsheet library.
const readXlsxGrid = async (file) => {
  const workbook = await JSZip.loadAsync(file)
  const [sheetPath] = Object.keys(workbook.files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/iu.test(path))
    .sort()

  if (!sheetPath) {
    throw new Error('That workbook has no sheet in it.')
  }

  const parser = new DOMParser()
  const sharedStringsFile = workbook.file('xl/sharedStrings.xml')
  const sharedStrings = sharedStringsFile
    ? Array.from(
      parser.parseFromString(await sharedStringsFile.async('string'), 'application/xml')
        .getElementsByTagName('si'),
    ).map(getJoinedText)
    : []

  const sheet = parser.parseFromString(await workbook.file(sheetPath).async('string'), 'application/xml')
  const grid = []

  Array.from(sheet.getElementsByTagName('row')).forEach((rowNode, rowPosition) => {
    const rowIndex = Number(rowNode.getAttribute('r')) - 1
    const cells = []

    Array.from(rowNode.getElementsByTagName('c')).forEach((cellNode, cellPosition) => {
      cells[getColumnIndex(cellNode.getAttribute('r'), cellPosition)] = readSheetCell(cellNode, sharedStrings)
    })

    grid[Number.isInteger(rowIndex) && rowIndex >= 0 ? rowIndex : rowPosition] = Array.from(cells, (cell) => cell ?? '')
  })

  return Array.from(grid, (cells) => cells ?? [])
}

const readGrid = async (file) => (
  /\.xlsx$/iu.test(file.name) ? readXlsxGrid(file) : parseCsv(await file.text())
)

// A filled-in sheet read down to the rows the import posts. Row numbers are the ones
// the admin sees in their own spreadsheet, so a refusal points at a row they can find.
export const readUserSheet = async (file) => {
  const grid = await readGrid(file)
  const headerIndex = grid.findIndex((cells) => cells.some((cell) => !isEmptyCell(cell)))

  if (headerIndex < 0) {
    throw new Error('That file is empty.')
  }

  const columnIndexByKey = {}

  grid[headerIndex].forEach((cell, index) => {
    const key = COLUMN_KEY_BY_HEADER.get(normalizeHeader(cell))

    if (key && !(key in columnIndexByKey)) {
      columnIndexByKey[key] = index
    }
  })

  const missingColumns = SHEET_COLUMNS.filter((column) => column.required && !(column.key in columnIndexByKey))

  if (missingColumns.length) {
    throw new Error(
      `The first row is missing the ${missingColumns.map((column) => column.header).join(' and ')} `
      + `column${missingColumns.length === 1 ? '' : 's'}. Download the sample file for the headers it expects.`,
    )
  }

  const rows = []

  grid.slice(headerIndex + 1).forEach((cells, index) => {
    const row = Object.fromEntries(SHEET_COLUMNS.map((column) => [
      column.key,
      String(cells[columnIndexByKey[column.key]] ?? '').trim(),
    ]))

    // A row that says nothing at all is spacing in the file, not a refused account.
    if (SHEET_COLUMNS.some((column) => row[column.key])) {
      rows.push({ ...row, rowNumber: headerIndex + index + 2 })
    }
  })

  if (!rows.length) {
    throw new Error('That file has a header row but no users under it.')
  }

  return rows
}

const XML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

const escapeXml = (value) => String(value ?? '').replace(/[&<>"']/gu, (character) => XML_ENTITIES[character])

// The smallest workbook Excel will open: one sheet, its text written straight into the
// cells so there is no string table to keep in step with it.
const buildWorkbookParts = (grid) => ({
  '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '</Types>',
  '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + `<Relationships xmlns="${PACKAGE_RELS_NS}">`
    + `<Relationship Id="rId1" Type="${DOCUMENT_RELS_NS}/officeDocument" Target="xl/workbook.xml"/>`
    + '</Relationships>',
  'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + `<workbook xmlns="${SHEET_XML_NS}" xmlns:r="${DOCUMENT_RELS_NS}">`
    + '<sheets><sheet name="Users" sheetId="1" r:id="rId1"/></sheets>'
    + '</workbook>',
  'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + `<Relationships xmlns="${PACKAGE_RELS_NS}">`
    + `<Relationship Id="rId1" Type="${DOCUMENT_RELS_NS}/worksheet" Target="worksheets/sheet1.xml"/>`
    + '</Relationships>',
  'xl/worksheets/sheet1.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + `<worksheet xmlns="${SHEET_XML_NS}"><sheetData>`
    + grid.map((cells, rowIndex) => (
      `<row r="${rowIndex + 1}">${cells.map((value, columnIndex) => (
        `<c r="${getColumnName(columnIndex)}${rowIndex + 1}" t="inlineStr">`
        + `<is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
      )).join('')}</row>`
    )).join('')
    + '</sheetData></worksheet>',
})

const buildSampleGrid = () => [
  SHEET_COLUMNS.map((column) => column.header),
  ...SAMPLE_USERS.map((user) => SHEET_COLUMNS.map((column) => user[column.key])),
]

const saveBlob = (blob, fileName) => {
  const blobUrl = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')

  downloadLink.href = blobUrl
  downloadLink.download = fileName
  document.body.appendChild(downloadLink)
  downloadLink.click()
  downloadLink.remove()
  URL.revokeObjectURL(blobUrl)
}

// The same sample rows in whichever of the two formats the admin works in. The CSV is
// written with a byte order mark so Excel opens it as text rather than guessing.
export const downloadSampleSheet = async (format) => {
  const grid = buildSampleGrid()

  if (format === 'csv') {
    saveBlob(new Blob([`${BYTE_ORDER_MARK}${buildCsv(grid)}`], { type: CSV_MIME }), `${SAMPLE_FILE_NAME}.csv`)
    return
  }

  const workbook = new JSZip()

  Object.entries(buildWorkbookParts(grid)).forEach(([path, content]) => workbook.file(path, content))
  saveBlob(await workbook.generateAsync({ type: 'blob', mimeType: XLSX_MIME }), `${SAMPLE_FILE_NAME}.xlsx`)
}
