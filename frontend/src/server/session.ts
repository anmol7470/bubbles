import { useSession } from '@tanstack/react-start/server';
import type { SessionData } from '../types/auth';

export function useAppSession() {
  return useSession<SessionData>({
    name: 'bubbles-session',
    password: process.env.SESSION_SECRET!,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  });
}
