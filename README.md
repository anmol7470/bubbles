# Bubbles 💬

A modern, full-stack real-time chat application with direct messaging and group chat capabilities. Built with Next.js, Hono + Bun, and Socket.IO for seamless real-time communication.

## ✨ Features

### Messaging

- **Real-time Messaging** - Instant message delivery powered by Socket.IO
- **Direct Messages** - Private one-on-one conversations
- **Group Chats** - Create and manage group conversations with unlimited participants
- **Image Sharing** - Upload and share multiple images (up to 5) in any conversation
- **Message Management** - Edit and delete your messages
- **Typing Indicators** - See when others are typing in real-time

### Chat Management

- **Group Administration** - Transfer admin privileges to other members
- **Member Management** - Add or remove members from group chats
- **Exit Groups** - Leave group chats with preserved message history
- **Rename Groups** - Update group chat names (admin only)
- **Unread Counts** - Visual indicators for unread messages per chat
- **Search** - Quickly find chats by searching members, group names, or message content

## 🛠️ Tech Stack

### Frontend

- [Next.js 16](https://nextjs.org/) - React framework with App Router and Server Components
- [React 19](https://react.dev/) - Latest React with enhanced features
- [TanStack Query](https://tanstack.com/query/latest) - Powerful async state management
- [TailwindCSS 4](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful component library built on Radix UI
- [oRPC](https://orpc.io/) - Type-safe RPC framework for seamless client-server communication

### Backend

- [Bun](https://bun.sh/) - Fast all-in-one JavaScript runtime and package manager
- [Hono](https://hono.dev/) - Ultrafast web server framework
- [Socket.IO](https://socket.io/) - Real-time bidirectional event-based communication
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM with excellent DX
- [Neon PostgreSQL](https://neon.tech/) - Serverless PostgreSQL database provider
- [Better Auth](https://www.better-auth.com/) - Modern authentication library for TypeScript
- [UploadThing](https://uploadthing.com/) - Simple file uploads for modern web apps

## 📦 Getting Started

### Project Structure

```
bubbles/
├── apps/
│   ├── client/            # Next.js frontend application
│   │   ├── app/           # App router pages and layouts
│   │   ├── components/    # React components
│   │   │   └── ws-provider.tsx  # Client Socket.IO handler
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
│   └── server/            # Hono backend server (Bun runtime)
│       └── src/
│           ├── db/        # Database layer
│           │   ├── schema/     # Drizzle schema definitions
│           │   └── migrations/ # Database migrations
│           ├── lib/       # Server utilities
│           │   ├── auth.ts     # Better Auth setup
│           │   ├── orpc.ts     # oRPC server setup
│           │   └── uploadthing.ts # UploadThing setup
│           ├── routes/    # API route handlers
│           │   ├── chat.ts     # Chat endpoints
│           │   └── message.ts  # Message endpoints
│           └── index.ts       # Main server entry point
├── turbo.json             # Turborepo configuration
└── package.json           # Root package.json
```

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Bun](https://bun.sh/)
- [UploadThing](https://uploadthing.com/) account and API key
- [Google Cloud Platform](https://console.cloud.google.com/) account and project with configured OAuth client ID and client secret

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/anmol7470/bubbles.git
   cd bubbles
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Copy .env.example files to .env and fill in the values:

   ```bash
   cd apps/client && cp .env.example .env
   cd ../server && cp .env.example .env
   cd ../../ # go back to the root directory
   ```

4. Set up the database:

   ```bash
   bun run db:migrate   # Apply migrations
   ```

5. Run the application:

   ```bash
   bun run dev
   ```

This will start:

- **Next.js app** at `http://localhost:3000`
- **Hono server** at `http://localhost:3001`
