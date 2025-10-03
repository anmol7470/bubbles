import { ChatSettings } from '@/components/chat-settings'
import { getCachedUser } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'

export default async function ChatSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await getCachedUser()
  if (error || !data?.user) {
    redirect('/login')
  }

  return <ChatSettings chatId={id} user={data.user} />
}
