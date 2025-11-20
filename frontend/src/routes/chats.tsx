import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ChatsList } from '../components/chats-list'

export const Route = createFileRoute('/chats')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/auth' })
    }
  },
  component: ChatsLayout,
})

function ChatsLayout() {
  return (
    <div className="flex h-screen">
      <ChatsList />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
