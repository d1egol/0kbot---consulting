import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Spinner } from '@/components/shared/Spinner'

describe('Spinner', () => {
  it('renderiza con tamaño por defecto md', () => {
    const { container } = render(<Spinner />)
    const el = container.firstChild as HTMLElement
    expect(el).toBeTruthy()
    expect(el.className).toContain('h-6')
    expect(el.className).toContain('w-6')
    expect(el.className).toContain('animate-spin')
  })

  it('renderiza tamaño sm', () => {
    const { container } = render(<Spinner size="sm" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-5')
    expect(el.className).toContain('w-5')
  })

  it('renderiza tamaño lg con border-4', () => {
    const { container } = render(<Spinner size="lg" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('h-8')
    expect(el.className).toContain('border-4')
  })

  it('acepta className extra', () => {
    const { container } = render(<Spinner className="text-red-500" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('text-red-500')
  })
})
