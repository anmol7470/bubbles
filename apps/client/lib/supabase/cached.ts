import 'server-only'
import { cache } from 'react'
import { createSupabaseClient } from './server'

export const getCachedUser = cache(async () => {
  const supabase = await createSupabaseClient()
  return await supabase.auth.getUser()
})
