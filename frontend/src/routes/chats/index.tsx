import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/chats/')({
  component: NoConversation,
});

function NoConversation() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center text-muted-foreground">
        <h2 className="text-2xl font-semibold text-foreground">
          No Conversation Selected
        </h2>
        <p className="mt-2">Select a chat to get started</p>
      </div>
    </div>
  );
}
