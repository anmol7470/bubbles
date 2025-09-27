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
import { authClient } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function Settings() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()

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
          onClick={() =>
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push('/login')
                },
                onError: (error) => {
                  toast.error(error.error.message)
                },
              },
            })
          }
        >
          <LogOutIcon className="size-5" />
          <span>Sign out</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            authClient.deleteUser({
              fetchOptions: {
                onSuccess: () => {
                  router.push('/login')
                },
                onError: (error) => {
                  toast.error(error.error.message)
                },
              },
            })
          }
        >
          <TrashIcon className="size-5" />
          <span>Delete account</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
