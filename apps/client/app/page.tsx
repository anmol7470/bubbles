import { Login } from '@/components/login'
import { getUser } from '@/lib/get-user'
import { redirect } from 'next/navigation'

export default async function Home() {
  const user = await getUser()

  if (user && !user.username) {
    redirect('/username')
  }

  if (user) {
    redirect('/chats')
  }

  return <Login />
}
