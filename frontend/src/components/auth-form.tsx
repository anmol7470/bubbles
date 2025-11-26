import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useImageUpload } from '@/hooks/use-image-upload'
import { formatRetryAfter } from '@/lib/utils'
import { updateUserProfileFn } from '@/server/user'
import type { SignInData, SignUpData } from '@/types/auth'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ImagePlusIcon, Loader2Icon, MessageCircle, TrashIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { signInFn, signUpFn } from '../server/auth'
import { UserAvatar } from './user-avatar'

export function AuthForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const router = useRouter()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { selectedImages, handleFileChange, clearImages, uploadImages, isUploading } = useImageUpload({
    maxImages: 1,
    replaceExisting: true,
  })

  const signUpMutation = useServerFn(signUpFn)
  const signInMutation = useServerFn(signInFn)
  const updateProfileServer = useServerFn(updateUserProfileFn)

  const signUp = useMutation({
    mutationFn: async ({ formData, imageFiles }: { formData: SignUpData; imageFiles: File[] }) => {
      const result = await signUpMutation({ data: formData })
      if (!result?.success || !result.data) {
        const mutationError = new Error(result?.error || 'Failed to create account') as Error & { retryAfter?: number }
        if (result?.retry_after) {
          mutationError.retryAfter = result.retry_after
        }
        throw mutationError
      }
      return { auth: result.data, imageFiles }
    },
    onSuccess: async ({ auth, imageFiles }) => {
      if (imageFiles.length > 0) {
        try {
          const uploadedUrls = await uploadImages(imageFiles)
          const imageUrl = uploadedUrls[0]
          if (imageUrl) {
            const response = await updateProfileServer({
              data: { username: auth.user.username, profile_image_url: imageUrl },
            })
            if (!response.success) {
              toast.error(response.error || 'Failed to save profile image')
            }
          }
        } catch (uploadError) {
          toast.error(uploadError instanceof Error ? uploadError.message : 'Failed to upload profile image')
        }
      }

      clearImages()
      setError(null)
      setRetryAfter(null)
      await router.invalidate()
      navigate({ to: '/' })
    },
    onError: (mutationError: Error & { retryAfter?: number }) => {
      setError(mutationError.message || 'An unexpected error occurred')
      setRetryAfter(mutationError.retryAfter ?? null)
    },
  })

  const signIn = useMutation({
    mutationFn: async ({ formData }: { formData: SignInData }) => {
      const result = await signInMutation({ data: formData })
      if (!result?.success || !result.data) {
        const mutationError = new Error(result?.error || 'Failed to sign in') as Error & { retryAfter?: number }
        if (result?.retry_after) {
          mutationError.retryAfter = result.retry_after
        }
        throw mutationError
      }
      return result.data
    },
    onSuccess: async () => {
      setError(null)
      setRetryAfter(null)
      await router.invalidate()
      navigate({ to: '/' })
    },
    onError: (mutationError: Error & { retryAfter?: number }) => {
      setError(mutationError.message || 'An unexpected error occurred')
      setRetryAfter(mutationError.retryAfter ?? null)
    },
  })

  const isSignUpBusy = signUp.isPending || isUploading

  const signUpForm = useForm({
    defaultValues: {
      email: '',
      username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setRetryAfter(null)
      await signUp.mutateAsync({ formData: value, imageFiles: selectedImages.map((img) => img.file) })
    },
  })

  const signInForm = useForm({
    defaultValues: {
      email_or_username: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setError(null)
      setRetryAfter(null)
      await signIn.mutateAsync({ formData: value })
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
      <Card>
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

              <Button type="submit" className="w-full shadow-lg" size="lg" disabled={signIn.isPending}>
                {signIn.isPending ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-2">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-up')
                    setError(null)
                    setRetryAfter(null)
                    clearImages()
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

              <div className="space-y-2">
                <Label>Profile picture (optional)</Label>
                <div className="flex items-center gap-4">
                  {selectedImages[0]?.previewUrl && (
                    <UserAvatar
                      username={signUpForm.state.values.username || 'New user'}
                      image={selectedImages[0].previewUrl}
                      className="size-12"
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSignUpBusy}
                    >
                      <ImagePlusIcon className="mr-2 size-4" /> Choose photo
                    </Button>
                    {selectedImages.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => clearImages()}
                        disabled={isSignUpBusy}
                      >
                        <TrashIcon className="mr-2 size-4" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full shadow-lg" size="lg" disabled={isSignUpBusy}>
                {isSignUpBusy ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground pt-2">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-in')
                    setError(null)
                    setRetryAfter(null)
                    clearImages()
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
