// Exportación de listas de usuarios a CSV.

const COLUMNS = [
  ['username', 'Usuario'],
  ['fullName', 'Nombre'],
  ['id', 'ID'],
  ['isVerified', 'Verificado'],
  ['isPrivate', 'Privado'],
  ['detectedAt', 'Detectado'],
]

function escapeCell(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Convierte un array de usuarios en un string CSV. */
export function usersToCsv(users) {
  const header = COLUMNS.map(([, label]) => label).join(',')
  const rows = users.map((u) =>
    COLUMNS.map(([key]) => escapeCell(u[key])).join(','),
  )
  return [header, ...rows].join('\n')
}

/** Dispara la descarga de un CSV en el navegador. */
export function downloadCsv(users, filename = 'export.csv') {
  const csv = usersToCsv(users)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
