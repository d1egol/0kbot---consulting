import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LocationState {
  activeLocationId: string | null
  setActiveLocation: (id: string | null) => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      activeLocationId: null,
      setActiveLocation: (id) => set({ activeLocationId: id }),
    }),
    { name: 'dos-huertos-location' },
  ),
)
