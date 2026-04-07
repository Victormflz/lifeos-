/**
 * Exporta un array de objetos planos a CSV y lo descarga en el navegador.
 * @param {Object[]} rows   - Array de objetos a exportar
 * @param {string}   filename - Nombre del fichero (sin extensión .csv)
 * @param {string[]} [columns] - Columnas a incluir (y su orden); si se omite, usa Object.keys del primer elemento
 */
export function exportToCsv(rows, filename, columns) {
  if (!rows || rows.length === 0) return

  const keys = columns || Object.keys(rows[0])

  const escape = (val) => {
    const str = val == null ? '' : String(val)
    // RFC 4180: rodear con comillas si contiene coma, salto de línea o comilla
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvLines = [
    keys.join(','),
    ...rows.map(row => keys.map(k => escape(row[k])).join(',')),
  ]
  const csv  = csvLines.join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM para Excel
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${filename}.csv`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
