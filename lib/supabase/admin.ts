import 'server-only'
import { createClient } from '@supabase/supabase-js'

export async function createSupabaseAdminClient() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return supabase.auth.admin
}
