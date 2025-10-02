import {
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  TrashIcon,
  UserIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteUser } from '@/lib/auth-actions'

export function Settings() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createSupabaseClient()

  return (
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
        <DropdownMenuItem>
          <UserIcon className="size-5" />
          <span>User Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            const { error } = await supabase.auth.signOut()
            if (error) {
              toast.error(
                error instanceof Error ? error.message : 'An error occurred'
              )
              return
            }
            router.push('/login')
          }}
        >
          <LogOutIcon className="size-5" />
          <span>Sign out</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser()
            if (!user) {
              toast.error('User not found')
              return
            }

            await deleteUser(user.id)
          }}
        >
          <TrashIcon className="size-5" />
          <span>Delete account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
