import { getUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export default async function UnauthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (user) {
    return redirect('/chats')
  }

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center">
      {children}
    </main>
  )
}
