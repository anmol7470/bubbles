import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatRetryAfter } from '@/lib/utils'
import { useForm } from '@tanstack/react-form'
import { useServerFn } from '@tanstack/react-start'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { signInFn, signUpFn } from '../server/auth'

export function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
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
      setRetryAfter(null)
      try {
        const result = await signUpMutation({
          data: value,
        })

        if (result && 'error' in result) {
          setError(result.error)
          setRetryAfter(result.retry_after || null)
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
      setRetryAfter(null)
      try {
        const result = await signInMutation({
          data: value,
        })

        if (result && 'error' in result) {
          setError(result.error)
          setRetryAfter(result.retry_after || null)
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
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="rounded-2xl bg-primary p-3 shadow-lg">
            <MessageCircle className="size-8 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary">Bubbles</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Connect and chat in real-time</p>
      </div>
      <Card className="shadow-xl">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-semibold">
            {mode === 'sign-in' ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'sign-in' ? 'Sign in to continue chatting' : 'Join Bubbles today'}
          </p>
        </CardHeader>
        <CardContent>
          {/* Error Message */}
          {error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400">
              {error}
              {retryAfter && (
                <div className="mt-1 text-xs opacity-80">Please try again in {formatRetryAfter(retryAfter)}.</div>
              )}
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
                    <Label htmlFor="email_or_username" className="text-sm font-medium">
                      Username or Email
                    </Label>
                    <Input
                      id="email_or_username"
                      type="text"
                      placeholder="Enter your username or email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="username"
                      className="h-11"
                    />
                  </div>
                )}
              </signInForm.Field>

              <signInForm.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11"
                    />
                  </div>
                )}
              </signInForm.Field>

              <Button type="submit" className="w-full shadow-lg" size="lg" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-2">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-up')
                    setError(null)
                    setRetryAfter(null)
                  }}
                  className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
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
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                )}
              </signUpForm.Field>

              <signUpForm.Field name="username">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Choose a username"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="username"
                      className="h-11"
                    />
                  </div>
                )}
              </signUpForm.Field>

              <signUpForm.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="h-11"
                    />
                  </div>
                )}
              </signUpForm.Field>

              <Button type="submit" className="w-full shadow-lg" size="lg" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-2">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-in')
                    setError(null)
                    setRetryAfter(null)
                  }}
                  className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
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
