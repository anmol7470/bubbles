import { getCachedUser } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'

export default async function UnauthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data } = await getCachedUser()
  if (data?.user) {
    redirect('/chats')
  }

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center">
      {children}
    </main>
  )
}
