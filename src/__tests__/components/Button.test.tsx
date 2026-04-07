import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/shared/Button'

describe('Button', () => {
  it('renderiza children', () => {
    render(<Button>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy()
  })

  it('aplica clases de variante primary por defecto', () => {
    render(<Button>OK</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-primary-600')
  })

  it('aplica variante danger', () => {
    render(<Button variant="danger">Eliminar</Button>)
    expect(screen.getByRole('button').className).toContain('bg-red-600')
  })

  it('disabled cuando loading=true', () => {
    render(<Button loading>Cargando</Button>)
    expect(screen.getByRole('button')).toHaveProperty('disabled', true)
  })

  it('llama onClick cuando se hace click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('no llama onClick cuando está disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        No
      </Button>,
    )
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
