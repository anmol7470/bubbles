import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/chats/')({
  component: NoConversation,
})

function NoConversation() {
  return (
    <div className="flex h-full items-center justify-center bg-muted/50">
      <h2 className="text-center text-foreground text-xl font-normal">No Conversation Selected</h2>
    </div>
  )
}
