'use client'

import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

export function QueryClientProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            toast.error(error.message)
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            toast.error(error.message)
          },
        }),
      })
  )

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
    </TanstackQueryClientProvider>
  )
}
