import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@tanstack/react-form';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { signInFn, signUpFn } from '../server/auth';

export function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signUpMutation = useServerFn(signUpFn);
  const signInMutation = useServerFn(signInFn);

  const signUpForm = useForm({
    defaultValues: {
      email: '',
      username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signUpMutation({
          data: value,
        });

        if (result && 'error' in result) {
          setError(result.error);
        }
      } catch (err) {
        // Redirect will throw, so this only catches real errors
        if (!(err instanceof Response)) {
          setError('An unexpected error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    },
  });

  const signInForm = useForm({
    defaultValues: {
      email_or_username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await signInMutation({
          data: value,
        });

        if (result && 'error' in result) {
          setError(result.error);
        }
      } catch (err) {
        // Redirect will throw, so this only catches real errors
        if (!(err instanceof Response)) {
          setError('An unexpected error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-8 text-center">
          <img
            src="/imessage.jpg"
            alt="Bubbles"
            className="mx-auto mb-4 size-14 rounded-lg"
          />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Bubbles
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            A real-time messaging app inspired by iMessage
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </h2>
        </div>

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
              e.preventDefault();
              e.stopPropagation();
              signInForm.handleSubmit();
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

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('sign-up');
                  setError(null);
                }}
                className="font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
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
              e.preventDefault();
              e.stopPropagation();
              signUpForm.handleSubmit();
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

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </Button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('sign-in');
                  setError(null);
                }}
                className="font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
