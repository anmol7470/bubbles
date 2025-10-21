import { ChatsList } from '@/components/chats-list'
import { WsClientProvider } from '@/components/ws-provider'
import { getUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'

export default async function ChatsLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) {
    redirect('/')
  }

  if (!user.username) {
    redirect('/username')
  }

  return (
    <WsClientProvider user={user}>
      <main className="flex h-screen min-h-0">
        <ChatsList user={user} />
        <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      </main>
    </WsClientProvider>
  )
}
