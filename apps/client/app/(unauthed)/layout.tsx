'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { LogOutIcon, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

export default function UnauthedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isUsernameRoute = pathname === '/auth/username'
  const { theme, setTheme } = useTheme()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center space-y-6 px-3 md:px-0">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isUsernameRoute && (
          <Button
            onClick={() =>
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push('/')
                  },
                  onError: ({ error }) => {
                    toast.error(error.message)
                  },
                },
              })
            }
            variant="ghost"
            size="sm"
          >
            <LogOutIcon className="size-4" />
            Logout
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      {children}

      <footer className="text-muted-foreground absolute bottom-2 left-1/2 z-10 -translate-x-1/2 transform text-sm">
        <span>
          check out the code on{' '}
          <a
            href="https://github.com/anmol7470/bubbles"
            className="hover:text-primary underline transition-colors"
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
