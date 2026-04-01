import { MapPin, ChevronDown } from 'lucide-react'
import { useLocations } from '@/hooks/useLocations'
import { useLocationStore } from '@/store/locationStore'

export function LocationSelector() {
  const { data: locations = [] } = useLocations()
  const activeLocationId = useLocationStore((s) => s.activeLocationId)
  const setActiveLocation = useLocationStore((s) => s.setActiveLocation)

  return (
    <div className="relative flex items-center">
      <MapPin className="pointer-events-none absolute left-2.5 h-4 w-4 text-primary-500" />
      <select
        value={activeLocationId ?? ''}
        onChange={(e) => setActiveLocation(e.target.value || null)}
        className="cursor-pointer appearance-none rounded-lg border border-gray-200 bg-primary-50 py-1.5 pl-8 pr-7 text-sm font-medium text-gray-700 hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        aria-label="Seleccionar ubicación activa"
      >
        <option value="">Sin ubicación</option>
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-gray-400" />
    </div>
  )
}

/** Returns the active location name or null */
export function useActiveLocationName(): string | null {
  const { data: locations = [] } = useLocations()
  const activeLocationId = useLocationStore((s) => s.activeLocationId)
  return locations.find((l) => l.id === activeLocationId)?.name ?? null
}
