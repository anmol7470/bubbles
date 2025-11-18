import { createFileRoute, redirect } from '@tanstack/react-router';
import { getCurrentUserFn } from '../server/auth';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // Require authentication for home page
    const user = await getCurrentUserFn();
    if (!user) {
      throw redirect({ to: '/auth' });
    }
    return { user };
  },
  component: HomePage,
});

function HomePage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome to Bubbles!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Hello, {user.username}!
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            You're successfully authenticated.
          </p>
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-400">
              <strong>User ID:</strong> {user.id}
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
