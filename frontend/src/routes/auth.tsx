import { AuthForm } from '@/components/auth-form'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({
  beforeLoad: async ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/' })
    }
  },
  component: AuthPage,
})

function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AuthForm />
    </div>
  )
}
