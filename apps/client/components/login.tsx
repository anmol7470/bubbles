'use client'

import { authClient } from '@/lib/auth-client'
import { MessageCircleIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FcGoogle } from 'react-icons/fc'
import { generateUsername } from 'unique-username-generator'
import { Button } from './ui/button'

export function Login() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-6">
      <MessageCircleIcon className="text-primary size-20" />
      <div className="flex flex-col space-y-3">
        <h1 className="text-center text-xl font-semibold md:text-3xl">Bubbles</h1>
        <p className="text-muted-foreground text-md text-center">
          A real-time messaging app built with Next.js, Hono, and Socket.io
        </p>
      </div>
      <Button
        onClick={() =>
          authClient.signIn.social(
            { provider: 'google', callbackURL: `${window.location.origin}/chats` },
            {
              onError: ({ error }) => {
                toast.error(error.message || 'Something went wrong')
              },
            }
          )
        }
        size="lg"
        className="text-md flex items-center justify-center rounded-full font-semibold"
      >
        <FcGoogle className="size-5" />
        Continue with Google
      </Button>

      {process.env.NODE_ENV === 'development' && (
        <Button
          onClick={() => {
            const testUsername = generateUsername()
            const testEmail = `${testUsername}@example.com`

            authClient.signUp.email({
              email: testEmail,
              name: testUsername,
              username: testUsername,
              password: 'Qwerty123!',
            })
            toast.success(`Test user created: ${testEmail} / ${testUsername} / Qwerty123!`)
            router.push(`/chats`)
          }}
          size="lg"
          className="text-md flex items-center justify-center rounded-full font-semibold"
        >
          Sign up as test user
        </Button>
      )}

      <footer className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 transform text-sm">
        <span>
          check out the code on{' '}
          <a
            href="https://github.com/anmol7470/bubbles"
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
