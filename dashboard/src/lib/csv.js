// Exportación de listas de usuarios a CSV.
// Separador ";" porque Excel en español (coma decimal) lo espera: con "," abría
// todo en una sola columna.

const SEP = ';'

const yesNo = (v) => (v ? 'Sí' : 'No')
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
}

const COLUMNS = [
  ['Usuario', (u) => u.username],
  ['Nombre', (u) => u.fullName],
  ['Perfil', (u) => (u.username ? `https://instagram.com/${u.username}` : '')],
  ['Verificado', (u) => yesNo(u.isVerified)],
  ['Privado', (u) => yesNo(u.isPrivate)],
  ['Detectado', (u) => fmtDate(u.detectedAt)],
  ['ID', (u) => u.id],
]

function escapeCell(value) {
  let s = value == null ? '' : String(value)
  // Evita que Excel interprete nombres como "=..." o "+..." como fórmulas.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  if (s.includes(SEP) || /["\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Convierte un array de usuarios en un string CSV. */
export function usersToCsv(users) {
  const header = COLUMNS.map(([label]) => label).join(SEP)
  const rows = users.map((u) => COLUMNS.map(([, get]) => escapeCell(get(u))).join(SEP))
  return [header, ...rows].join('\r\n')
}

/** Dispara la descarga de un CSV en el navegador. */
export function downloadCsv(users, filename = 'export.csv') {
  const csv = usersToCsv(users)
  // BOM para que Excel detecte UTF-8 (acentos y emojis en nombres).
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.csv$/, `-${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revocar en el mismo tick puede cancelar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
