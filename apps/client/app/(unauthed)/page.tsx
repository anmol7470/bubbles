import { Button } from '@/components/ui/button'
import { MessageCircleIcon } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <MessageCircleIcon className="text-primary size-20" />
      <div className="flex flex-col items-center space-y-3">
        <h1 className="text-center text-xl font-semibold md:text-3xl">Bubbles</h1>
        <p className="text-muted-foreground text-md text-center">
          A real-time messaging app built with Next.js, Hono, and Socket.io
        </p>
        <Button size="lg" variant="blue" className="w-fit rounded-full font-semibold" asChild>
          <Link href="/auth/sign-in">Get Started</Link>
        </Button>
      </div>
    </>
  )
}
