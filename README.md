# Bubbles

A fully-featured real-time chat application supporting direct messages and group chats. Client website is built with Next.js and Supabase and the WebSocket server is built with Socket.IO running on Bun and a Hono server.

## 🚀 Features

- **Real-time Messaging** - Instant message delivery and chat creation updates using Socket.IO
- **Direct Messages (DMs)** - Private one-on-one conversations
- **Group Chats** - Create and manage group conversations with multiple participants
- **Message Management** - Edit, delete, and clear chat history
- **Image Sharing** - Upload and share images in conversations
- **Typing Indicators** - See when others are typing in real-time

## 🛠️ Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework with App Router
- [React 19](https://react.dev/) - Latest React
- [TanStack Query](https://tanstack.com/query/latest) - Powerful data synchronization
- [Supabase](https://supabase.com/) - Backend-as-a-Service (Authentication, PostgreSQL, Storage)
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM with relational queries
- [Socket.IO](https://socket.io/) - Real-time bidirectional event-based communication
- [Bun](https://bun.sh/) - Fast JavaScript runtime for WebSocket server
- [Hono](https://hono.dev/) - Lightweight web framework
- [TailwindCSS 4](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable component library built on Radix UI

## 📦 Getting Started

### Project Structure

```
bubbles/
├── apps/
│   ├── client/          # Next.js frontend application
│   │   ├── app/         # App router pages
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities, DB, and actions
│   │       ├── db/      # Database schema and queries
│   │       └── supabase/ # Supabase client setup
│   └── ws/              # WebSocket server (Bun + Socket.IO)
├── package.json         # Root package configuration
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── turbo.json          # Turborepo configuration
```

### Prerequisites

- **Node.js** 20+ and **pnpm** 10+
- **Bun** (required to run the WebSocket server)
- **Supabase** account and project

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/anmhrk/bubbles.git
   cd bubbles
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   cd apps/client && cp .env.example .env
   cd ../ws && cp .env.example .env
   ```

4. Configure Supabase Storage:

   Create two storage buckets in your Supabase dashboard:
   - `avatars` - For user profile pictures and group chat images
   - `attachments` - For message attachments

   Set both as public buckets and apply RLS policies allowing authenticated users to read and write to their own folders.

5. Set up the database:

   ```bash
   cd apps/client
   pnpm db:migrate   # Apply migrations
   cd ../..
   ```

6. Run the application:

   ```bash
   pnpm dev
   ```

This will start:

- **Next.js app** at `http://localhost:3000`
- **WebSocket server** at `http://localhost:3001`

## 📝 Todos

- [ ] Allow admins to add more members to a group chat
- [ ] Show unread messages count in the chat list
- [ ] Read receipts
