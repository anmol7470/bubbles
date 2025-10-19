export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <div>ChatPage</div>
}
