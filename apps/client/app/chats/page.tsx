import { getUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'

export default async function ChatsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/')
  }

  if (!user.username) {
    redirect('/username')
  }

  return <div>ChatsPage</div>
}
