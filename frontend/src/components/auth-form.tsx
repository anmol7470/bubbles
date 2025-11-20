import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from '@tanstack/react-form'
import { useServerFn } from '@tanstack/react-start'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { signInFn, signUpFn } from '../server/auth'

export function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const signUpMutation = useServerFn(signUpFn)
  const signInMutation = useServerFn(signInFn)

  const signUpForm = useForm({
    defaultValues: {
      email: '',
      username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await signUpMutation({
          data: value,
        })

        if (result && 'error' in result) {
          setError(result.error)
        }
      } catch (err) {
        // Redirect will throw, so this only catches real errors
        if (!(err instanceof Response)) {
          setError('An unexpected error occurred')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  const signInForm = useForm({
    defaultValues: {
      email_or_username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await signInMutation({
          data: value,
        })

        if (result && 'error' in result) {
          setError(result.error)
        }
      } catch (err) {
        // Redirect will throw, so this only catches real errors
        if (!(err instanceof Response)) {
          setError('An unexpected error occurred')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <MessageCircle className="size-10 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-primary">Bubbles</h1>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">A real-time messaging app like WhatsApp</p>
      </div>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{mode === 'sign-in' ? 'Sign In' : 'Sign Up'}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'sign-in' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                signInForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <signInForm.Field name="email_or_username">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email_or_username">Username or Email</Label>
                    <Input
                      id="email_or_username"
                      type="text"
                      placeholder="Enter your username or email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                )}
              </signInForm.Field>

              <signInForm.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                )}
              </signInForm.Field>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-up')
                    setError(null)
                  }}
                  className="hover:text-foreground underline"
                >
                  Sign up
                </button>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === 'sign-up' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                signUpForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <signUpForm.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                )}
              </signUpForm.Field>

              <signUpForm.Field name="username">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Choose a username"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                )}
              </signUpForm.Field>

              <signUpForm.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                )}
              </signUpForm.Field>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </Button>

              <div className="text-center text-sm text-muted-foreground ">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-in')
                    setError(null)
                  }}
                  className="hover:text-foreground underline"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
