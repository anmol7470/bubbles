"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { authClient } from "@/lib/auth-client";
import { Authenticated, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <SearchIcon className="size-5" />
          <span>Search That</span>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Authenticated>
            <Button
              variant="outline"
              className="px-5"
              onClick={() =>
                authClient.signOut({
                  fetchOptions: { onSuccess: () => router.push("/") },
                })
              }
            >
              Logout
            </Button>
          </Authenticated>
          <Unauthenticated>
            <Button
              variant="outline"
              className="px-5"
              onClick={() => authClient.signIn.social({ provider: "google" })}
            >
              Login
            </Button>
          </Unauthenticated>
        </div>
      </div>
    </header>
  );
}
