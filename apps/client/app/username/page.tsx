import { Username } from '@/components/username'
import { getUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'

export default async function UsernamePage() {
  const user = await getUser()

  if (!user) {
    redirect('/')
  }

  if (user.username) {
    redirect('/chats')
  }

  return <Username />
}
