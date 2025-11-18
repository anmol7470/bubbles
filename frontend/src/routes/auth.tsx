import { AuthForm } from '@/components/auth-form';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { getCurrentUserFn } from '../server/auth';

export const Route = createFileRoute('/auth')({
  beforeLoad: async () => {
    // If user is already authenticated, redirect to home
    const user = await getCurrentUserFn();
    if (user) {
      throw redirect({ to: '/' });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AuthForm />
    </div>
  );
}
