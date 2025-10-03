import { ChatContainer } from '@/components/chat-container'
import { getCachedUser } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await getCachedUser()
  if (error || !data?.user) {
    redirect('/login')
  }

  return <ChatContainer chatId={id} user={data.user} />
}
