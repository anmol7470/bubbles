import { ChatsList } from '@/components/chats-list'
import { getCachedUser } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data, error } = await getCachedUser()
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
