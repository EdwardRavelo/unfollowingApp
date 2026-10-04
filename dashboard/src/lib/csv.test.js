import { describe, it, expect } from 'vitest'
import { usersToCsv } from './csv.js'

describe('usersToCsv', () => {
  it('usa ; como separador y escapa valores conflictivos', () => {
    const csv = usersToCsv([
      { id: '1', username: 'ana', fullName: 'Ana; "la mejor"', isVerified: true, isPrivate: false },
    ])
    const [header, row] = csv.split('\r\n')
    expect(header).toBe('Usuario;Nombre;Perfil;Verificado;Privado;Detectado;ID')
    expect(row).toBe('ana;"Ana; ""la mejor""";https://instagram.com/ana;Sí;No;;1')
  })

  it('neutraliza nombres que Excel tomaría como fórmula', () => {
    const csv = usersToCsv([{ id: '1', username: 'x', fullName: '=HYPERLINK("http://mal")' }])
    expect(csv.split('\r\n')[1]).toContain(`"'=HYPERLINK(""http://mal"")"`)
  })
})
