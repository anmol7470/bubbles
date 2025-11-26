import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

type UserAvatarProps = {
  username: string
  image?: string | null
  className?: string
}

export function UserAvatar({ username, image, className }: UserAvatarProps) {
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <Avatar className={className} key={image || 'no-image'}>
      {image && <AvatarImage src={image} alt={username} />}
      <AvatarFallback className="bg-accent dark:bg-accent-foreground/15">{getInitials(username)}</AvatarFallback>
    </Avatar>
  )
}
