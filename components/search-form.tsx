"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  SearchIcon,
  ZapIcon,
  SparklesIcon,
  BrainIcon,
  LucideIcon,
} from "lucide-react";

type SearchMode = {
  name: string;
  icon: LucideIcon;
};

const SEARCH_MODES = [
  {
    name: "Fast",
    icon: ZapIcon,
  },
  {
    name: "Normal",
    icon: SparklesIcon,
  },
  {
    name: "Deep research",
    icon: BrainIcon,
  },
];

export function SearchForm() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<SearchMode>(SEARCH_MODES[1]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log(search, mode);
  };

  return (
    <form
      className="flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-lg"
      onSubmit={handleSubmit}
    >
      <Textarea
        autoFocus
        placeholder="Search anything"
        className="min-h-[6rem] max-h-[12rem] resize-none border-0 rounded-none bg-inherit px-6 py-4 text-base leading-relaxed focus-visible:ring-0 sm:text-lg"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-3 bg-inherit px-4 py-3 items-center justify-between">
        <Select
          defaultValue={mode.name}
          onValueChange={(value) =>
            setMode(SEARCH_MODES.find((m) => m.name === value)!)
          }
        >
          <SelectTrigger className="h-10 min-w-[180px] rounded-full border-border/60 bg-background/80 px-4 text-sm">
            <SelectValue placeholder="Mode">
              <mode.icon />
              {mode.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="min-w-[180px]">
            {SEARCH_MODES.map(({ name, icon: Icon }) => (
              <SelectItem key={name} value={name}>
                <Icon />
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="submit"
          className="group inline-flex items-center gap-2 text-white rounded-full px-6 py-2 text-sm sm:self-end"
        >
          Search
          <SearchIcon />
        </Button>
      </div>
    </form>
  );
}
