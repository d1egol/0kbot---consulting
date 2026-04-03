import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/lib/types'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  role: UserRole | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => () => void
}

function extractRole(user: User | null): UserRole | null {
  if (!user) return null
  // Leer desde app_metadata (no editable por el usuario, solo via service_role key)
  // Ver migración 007_roles_app_metadata.sql para el contexto de seguridad
  const role = user.app_metadata?.role as string | undefined
  if (role === 'admin' || role === 'buyer' || role === 'cashier') return role
  return null
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  isLoading: true,

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({
      user: data.user,
      session: data.session,
      role: extractRole(data.user),
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, role: null })
  },

  initialize: () => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        role: extractRole(session?.user ?? null),
        isLoading: false,
      })
    })

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        role: extractRole(session?.user ?? null),
        isLoading: false,
      })
    })

    return () => subscription.unsubscribe()
  },
}))
