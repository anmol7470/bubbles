import { getUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { ChatsList } from '@/components/chats-list'

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) {
    return redirect('/login')
  }

  return (
    <main className="flex h-screen min-h-0">
      <ChatsList user={user} />
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
    </main>
  )
}
