'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { Loader2Icon, RefreshCcwIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { generateUsername } from 'unique-username-generator'
import * as z from 'zod'

const usernameSchema = z
  .string()
  .min(4, 'Username must be at least 4 characters')
  .max(20, 'Username must be at most 20 characters')

export default function UsernamePage() {
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

  return (
    <Card className="w-full max-w-sm rounded-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold">Choose a username</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="mb-2 block text-sm font-medium">
              Username
            </Label>
            <UsernameInputField username={username} setUsername={setUsername} loading={loading} />
          </div>
          <Button type="submit" disabled={loading} variant="blue" className="mt-4 w-full font-semibold">
            {loading ? <Loader2Icon className="animate-spin" /> : 'Continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function UsernameInputField({
  username,
  setUsername,
  loading,
}: {
  username: string
  setUsername: (username: string) => void
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full">
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          disabled={loading}
          maxLength={20}
          className="w-full rounded-md"
        />
        <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs">
          {username.length}/20
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setUsername(generateUsername('', 0, 20))}
        disabled={loading}
      >
        <RefreshCcwIcon className="size-4" />
      </Button>
    </div>
  )
}
