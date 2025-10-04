'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { loginSchema, type LoginFormData } from '@/lib/types'
import { login as loginAction } from '@/lib/auth-actions'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const { mutateAsync: login, isPending: isLoggingIn } = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const result = await loginAction(data.email, data.password)
      if (!result.success) {
        throw new Error(result.error)
      }
      return result
    },
  })

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    await login(data)
    router.push('/chats')
  }

  return (
    <div className="flex min-h-screen w-full max-w-md items-center justify-center p-4">
      <Button variant="outline" className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2">
          <ArrowLeftIcon className="size-4" />
          <span>Back</span>
        </Link>
      </Button>
      <Card className="w-full max-w-2xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">
            Log in to your account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="text"
                {...register('email')}
                className="w-full rounded-md"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                className="w-full rounded-md"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-6 w-full font-semibold py-3 transition-colors"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <p className="text-left text-xs">
            Don&apos;t have an account?{' '}
            <Link
              className="text-primary hover:text-primary/80 cursor-pointer underline transition-colors"
              href="/signup"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
