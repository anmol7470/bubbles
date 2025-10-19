'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { Loader2Icon, LogOutIcon, RefreshCcwIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { generateUsername } from 'unique-username-generator'
import * as z from 'zod'

const usernameSchema = z
  .string()
  .min(4, 'Username must be at least 4 characters')
  .max(20, 'Username must be at most 20 characters')

export function Username() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = usernameSchema.safeParse(username)
    if (!result.success) return toast.error(result.error.issues[0].message)

    setLoading(true)
    try {
      const { error } = await authClient.updateUser({
        username,
      })
      if (error) throw error

      router.push('/chats')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update username')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <Button onClick={handleLogout} variant="ghost" size="sm" className="absolute top-4 right-4">
        <LogOutIcon className="size-4" />
        Logout
      </Button>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-center text-2xl font-semibold">Choose a username</h1>
        <div className="flex items-center space-x-2">
          <div className="relative w-full">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
              maxLength={20}
            />
            <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs">
              {username.length}/20
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setUsername(generateUsername('', 0, 20))}>
            <RefreshCcwIcon className="size-4" />
          </Button>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : 'Continue'}
        </Button>
      </form>
    </div>
  )
}
