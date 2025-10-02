export default function UnauthedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center">
      {children}
    </main>
  )
}
