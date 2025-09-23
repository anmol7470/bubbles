import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/search-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/80 to-muted text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <SearchIcon className="size-5" />
            <span>Search That</span>
          </div>
          <Button variant="outline" className="px-5">
            Login
          </Button>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl space-y-12 text-center">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Ask anything.
            </h1>
            <p className="text-balance text-muted-foreground">
              An AI-powered search engine providing quick and grounded answers
              to your questions.
            </p>
          </div>

          <SearchForm />
        </div>
      </main>
    </div>
  );
}
