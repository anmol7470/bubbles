import { MessageCircleIcon } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-6">
      <MessageCircleIcon className="text-primary size-20" />
      <div className="flex flex-col space-y-3">
        <h1 className="text-center text-xl font-semibold md:text-3xl">
          Bubbles
        </h1>
        <p className="text-muted-foreground text-md text-center">
          A real-time messaging app built with Next.js, Supabase, and Socket.io
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
      >
        Sign in
      </Link>

      <footer className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 transform text-sm">
        <span>
          check out the code on{' '}
          <a
            href="https://github.com/anmhrk/bubbles"
            className="hover:text-primary/80 underline transition-colors"
            target="_blank"
            rel="noopener"
          >
            github
          </a>
        </span>
      </footer>
    </div>
  )
}
