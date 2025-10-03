'use client'

import {
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { UserSettings } from './user-settings'
import type { User } from '@/lib/types'
import { signout as signoutAction } from '@/lib/auth-actions'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export function Settings({ user }: { user: User }) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [showUserSettings, setShowUserSettings] = useState(false)

  const { mutateAsync: signout } = useMutation({
    mutationFn: () => signoutAction(),
    onSuccess: () => {
      router.push('/login')
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <SettingsIcon className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <SunIcon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <MoonIcon className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowUserSettings(true)}>
            <UserIcon className="size-5" />
            <span>User Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await signout()
            }}
          >
            <LogOutIcon className="size-5" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {user && (
        <UserSettings
          open={showUserSettings}
          onOpenChange={setShowUserSettings}
          user={user}
        />
      )}
    </>
  )
}
