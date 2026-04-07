import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/shared/Modal'

describe('Modal', () => {
  it('no renderiza cuando open=false', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test">
        <p>contenido</p>
      </Modal>,
    )
    expect(screen.queryByText('contenido')).toBeNull()
  })

  it('renderiza children y título cuando open=true', () => {
    render(
      <Modal open onClose={() => {}} title="Hola">
        <p>contenido</p>
      </Modal>,
    )
    expect(screen.getByText('Hola')).toBeTruthy()
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('llama onClose al presionar Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="X">
        <p>x</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('llama onClose al hacer click en el botón de cerrar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Cerrar">
        <p>x</p>
      </Modal>,
    )
    // El botón X no tiene accessible name; encontrar por rol button (hay 1 cuando hay título)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0]!)
    expect(onClose).toHaveBeenCalled()
  })
})
