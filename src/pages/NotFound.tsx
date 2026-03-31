import { Link } from 'react-router-dom'
import { Button } from '@/components/shared'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-50 px-4">
      <h1 className="text-6xl font-bold text-primary-600">404</h1>
      <p className="mt-2 text-lg text-gray-600">Página no encontrada</p>
      <Link to="/" className="mt-6">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  )
}
