import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type {
  AuthResponse,
  ErrorResponse,
  SignInData,
  SignUpData,
  VerifyResponse,
} from '../types/auth';
import { useAppSession } from './session';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const signUpFn = createServerFn({ method: 'POST' })
  .inputValidator((data: SignUpData) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        return { success: false, error: error.error };
      }

      const authResponse: AuthResponse = await response.json();

      // Store token and user in session
      const session = await useAppSession();
      await session.update({
        token: authResponse.token,
        user: authResponse.user,
      });

      // Redirect to home
      throw redirect({ to: '/' });
    } catch (error) {
      if (error instanceof Response) {
        throw error; // Re-throw redirect
      }
      return {
        success: false,
        error: 'Failed to connect to server',
      };
    }
  });

export const signInFn = createServerFn({ method: 'POST' })
  .inputValidator((data: SignInData) => data)
  .handler(async ({ data }) => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error: ErrorResponse = await response.json();
        return { success: false, error: error.error };
      }

      const authResponse: AuthResponse = await response.json();

      // Store token and user in session
      const session = await useAppSession();
      await session.update({
        token: authResponse.token,
        user: authResponse.user,
      });

      // Redirect to home
      throw redirect({ to: '/' });
    } catch (error) {
      if (error instanceof Response) {
        throw error; // Re-throw redirect
      }
      return {
        success: false,
        error: 'Failed to connect to server',
      };
    }
  });

// Verify Token and Get Current User
export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useAppSession();
    const token = session.data.token;

    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const verifyResponse: VerifyResponse = await response.json();

      if (!verifyResponse.success || !verifyResponse.user) {
        // Token is invalid, clear session
        await session.clear();
        return null;
      }

      return verifyResponse.user;
    } catch (error) {
      // If verification fails, clear session
      await session.clear();
      return null;
    }
  }
);

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession();
  await session.clear();
  throw redirect({ to: '/auth' });
});
