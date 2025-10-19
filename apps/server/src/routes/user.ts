import { z } from 'zod'
import { protectedProcedure } from '../lib/orpc'

export const userRouter = {
  searchUsers: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        selectedUserIds: z.array(z.string()),
      })
    )
    .handler(async ({ context, input }) => {
      const { db, user: currentUser } = context
      const { query, selectedUserIds } = input

      const normalizedQuery = query.toLowerCase().trim().split(' ').join('%')

      return await db.query.user.findMany({
        where: (user, { and, ilike, not, eq, notInArray }) =>
          and(
            ilike(user.username, `%${normalizedQuery}%`),
            not(eq(user.id, currentUser.id)),
            ...(selectedUserIds.length > 0 ? [notInArray(user.id, selectedUserIds)] : [])
          ),
        columns: {
          id: true,
          username: true,
          image: true,
        },
        limit: 20,
      })
    }),
}
