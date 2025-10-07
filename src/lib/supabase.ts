import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Helper function to get authenticated user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Helper function to get user profile with role
export const getUserProfile = async (userId?: string) => {
  const id = userId || (await getCurrentUser())?.id
  if (!id) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// Helper function to check if user has specific role
export const checkUserRole = async (requiredRole: string, userId?: string) => {
  const profile = await getUserProfile(userId)
  return profile?.role === requiredRole
}

// Helper function to get user's employer (if they are an employer)
export const getUserEmployer = async (userId?: string) => {
  const id = userId || (await getCurrentUser())?.id
  if (!id) return null

  const { data, error } = await supabase
    .from('employers')
    .select('*')
    .eq('owner_id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
  return data
}

// Helper function to check if user is member of employer
export const checkEmployerMembership = async (employerId: string, userId?: string) => {
  const id = userId || (await getCurrentUser())?.id
  if (!id) return false

  const { data, error } = await supabase
    .from('employer_members')
    .select('role')
    .eq('employer_id', employerId)
    .eq('user_id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return !!data
}