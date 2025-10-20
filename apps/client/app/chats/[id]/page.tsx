import { ChatContainer } from '@/components/chat-container'
import { getUser } from '@/lib/get-user'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()

  return <ChatContainer chatId={id} user={user!} />
}
