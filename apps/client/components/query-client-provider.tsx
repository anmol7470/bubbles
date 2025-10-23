'use client'

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        toast.error(error.message)
        console.error(error)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        toast.error(error.message)
        console.error(error)
      },
    }),
  })

  return <TanstackQueryClientProvider client={queryClient}>{children}</TanstackQueryClientProvider>
}
