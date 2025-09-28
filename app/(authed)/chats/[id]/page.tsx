import { ChatContainer } from '@/components/chat-container'
import { createSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/login')
  }

  return <ChatContainer chatId={id} user={data.user} />
}
