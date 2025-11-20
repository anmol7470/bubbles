import { createFileRoute } from '@tanstack/react-router'
import { Chat } from '../../components/chat'

export const Route = createFileRoute('/chats/$chatId')({
  component: ChatPage,
})

function ChatPage() {
  const { chatId } = Route.useParams()

  return <Chat chatId={chatId} />
}
