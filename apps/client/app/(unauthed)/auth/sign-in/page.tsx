'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftIcon, Loader2Icon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { FcGoogle } from 'react-icons/fc'
import * as z from 'zod'

const signInSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
})

type SignInFormData = z.infer<typeof signInSchema>

export default function SignInPage() {
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit: SubmitHandler<SignInFormData> = async (data) => {
    try {
      setIsSigningIn(true)
      const { error } = await authClient.signIn.email(data)
      if (error) {
        throw new Error(error.message)
      }
      router.push('/chats')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/chats`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
      setIsGoogleLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2">
          <ArrowLeftIcon className="size-4" />
          <span>Back</span>
        </Link>
      </Button>
      <Card className="w-full max-w-sm rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSigningIn}
          >
            {isGoogleLoading ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <>
                <FcGoogle className="size-5" />
                <span>Continue with Google</span>
              </>
            )}
          </Button>

          <div className="relative mt-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div>
              <Label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email
              </Label>
              <Input id="email" type="text" {...register('email')} className="w-full rounded-md" />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="mb-2 block text-sm font-medium">
                Password
              </Label>
              <Input id="password" type="password" {...register('password')} className="w-full rounded-md" />
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              variant="blue"
              className="blue mt-4 w-full font-semibold"
              disabled={isSigningIn || isGoogleLoading}
            >
              {isSigningIn ? <Loader2Icon className="animate-spin" /> : 'Sign in'}
            </Button>
          </form>

          <p className="text-left text-xs">
            Don&apos;t have an account?{' '}
            <Link
              className="text-primary hover:text-primary/80 cursor-pointer underline transition-colors"
              href="/auth/sign-up"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </>
  )
}
