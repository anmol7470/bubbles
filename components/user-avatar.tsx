import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { cn } from '@/lib/utils'

type UserAvatarProps = {
  image: string | null
  username: string | null
  className?: string
}

export function UserAvatar({ image, username, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('h-9 w-9', className)}>
      <AvatarImage src={image ?? undefined} alt="User avatar" />
      <AvatarFallback className="bg-primary/20">
        {username?.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
