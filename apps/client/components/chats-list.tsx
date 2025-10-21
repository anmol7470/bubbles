'use client'

import { authClient } from '@/lib/auth-client'
import type { User } from '@/lib/get-user'
import { orpc, type Outputs } from '@/lib/orpc'
import { cn, formatDate } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { BanIcon, LogOutIcon, Moon, PenBoxIcon, Search, Settings2Icon, Sun, UserIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { NewChatDialog } from './new-chat-dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'
import { UserSettings } from './user-settings'

export function ChatsList({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const chatId = pathname.split('/chats/')[1]?.split('/')[0]
  const isChatOpen = pathname?.startsWith('/chats/') && pathname !== '/chats'

  const [userSettingsOpen, setUserSettingsOpen] = useState(false)
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: chats, isLoading } = useQuery(orpc.chat.getAllChats.queryOptions())
  const { data: unreadCounts, isLoading: isLoadingUnreadCounts } = useQuery(orpc.chat.getUnreadCounts.queryOptions())

  const filteredChats = useMemo(() => {
    if (!search) return chats
    const searchLower = search.toLowerCase()

    return chats?.filter((chat) => {
      // Check members
      const memberMatch = chat.members.some((member) => member.user?.username?.toLowerCase().includes(searchLower))

      // Check last message content
      const lastMessageMatch = chat.messages[0]?.content?.toLowerCase().includes(searchLower) || false

      // For group chats, also check the name
      if (chat.type === 'groupchat') {
        const nameMatch = chat.name?.toLowerCase().includes(searchLower) || false
        return nameMatch || memberMatch || lastMessageMatch
      }

      // For regular chats, only check members and last message
      return memberMatch || lastMessageMatch
    })
  }, [chats, search])

  return (
    <div className={cn(isChatOpen ? 'hidden md:block' : 'block', 'w-full shrink-0 md:w-1/4')}>
      <div className="flex h-full w-full flex-col space-y-4 border-r border-neutral-300 p-3 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <Link className="cursor-pointer text-lg font-medium" href="/chats">
            Chats
          </Link>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm">
                  <Settings2Icon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setUserSettingsOpen(true)}>
                  <UserIcon className="size-4" />
                  User Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setTheme(theme === 'dark' ? 'light' : 'dark')
                  }}
                >
                  <Sun className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                  <Moon className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  Toggle theme
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          router.push('/')
                        },
                        onError: ({ error }) => {
                          toast.error(error.message)
                        },
                      },
                    })
                  }
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon-sm" onClick={() => setNewChatDialogOpen(true)}>
              <PenBoxIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search your chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-8 focus-visible:ring-0"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-13 w-full" />
              ))}
            </div>
          ) : filteredChats && filteredChats.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
              {search ? `No chats found for "${search}"` : 'No chats found. Create one to start chatting.'}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredChats &&
                filteredChats.map((chat) => {
                  const otherParticipant = chat.members.filter((member) => member.user?.id !== user.id)[0]?.user

                  return (
                    <Link
                      key={chat.id}
                      href={`/chats/${chat.id}`}
                      className={cn(
                        'hover:bg-primary/5 block rounded-lg',
                        chat.id === chatId && 'bg-primary/10 hover:bg-primary/10'
                      )}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        {chat.type === 'groupchat' ? (
                          <UserAvatar image={undefined} username={chat.name} />
                        ) : (
                          <UserAvatar image={otherParticipant?.image} username={otherParticipant?.username} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="line-clamp-1 truncate font-medium">
                              {chat.type === 'groupchat' ? chat.name : otherParticipant?.username}
                            </div>
                            <div className="text-muted-foreground ml-2 shrink-0 text-xs">
                              {formatDate(chat.messages[0]?.sentAt ?? chat.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-muted-foreground truncate text-sm">
                              {displayLastMessage(chat, user.id)}
                            </div>
                            <div className="shrink-0 rounded-full bg-blue-400 px-1.5 py-0.5 text-xs text-white">
                              {unreadCounts?.[chat.id] ?? 0}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      <UserSettings open={userSettingsOpen} onOpenChange={setUserSettingsOpen} user={user} />
      <NewChatDialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen} user={user} />
    </div>
  )
}

export function UserAvatar({
  image,
  username,
  className,
}: {
  image: string | undefined | null
  username: string | undefined | null
  className?: string
}) {
  return (
    <Avatar className={cn('h-9 w-9', className)}>
      <AvatarImage src={image ?? undefined} alt="User avatar" />
      <AvatarFallback className="bg-primary/20">{username?.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
}

function displayLastMessage(chat: Outputs['chat']['getAllChats'][number], currentUserId: string) {
  const lastMessage = chat.messages?.[0]

  // If there's no last message at all (newly created chat)
  if (!lastMessage) {
    return 'Say hello 👋'
  }

  const isOwnMessage = lastMessage.sender?.id === currentUserId
  const senderName = isOwnMessage ? 'You' : lastMessage.sender?.username
  const senderPrefix = `${senderName}: `

  // If message is deleted
  if (lastMessage.isDeleted) {
    return (
      <span className="flex items-center gap-1">
        <BanIcon className="size-3.5 shrink-0" />
        <span>{senderName} deleted this message</span>
      </span>
    )
  }

  const imageCount = lastMessage.images?.length ?? 0

  // If content is empty but there was a message sent (image-only message)
  if (!lastMessage.content || lastMessage.content.trim() === '') {
    const imageText = imageCount > 1 ? 'images' : 'an image'
    return `${senderPrefix}Sent ${imageText}`
  }

  // Regular text message (with or without images)
  return `${senderPrefix}${lastMessage.content}`
}
