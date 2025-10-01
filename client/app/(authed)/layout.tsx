import { ChatsList } from '@/components/chats-list'
import { createSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <main className="flex h-screen min-h-0">
      <ChatsList user={data.user} />
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </main>
  )
}
