import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/components/search-form";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background/80 to-muted text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <SearchIcon className="size-5" />
            <span>Search That</span>
          </Link>
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

      <footer className="container mx-auto flex h-10 items-center justify-center px-6 text-sm text-muted-foreground">
        check out the code on
        <a
          href="https://github.com/anmhrk/search-that"
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline underline-offset-4 hover:text-foreground"
        >
          github
        </a>
      </footer>
    </div>
  );
}
