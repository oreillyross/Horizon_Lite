import { useEffect, useState } from "react";

const STORAGE_KEY = "gdelt:saved-searches";
const MAX_SAVED = 10;

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeStorage(values: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

export function useSavedSearches(): {
  saved: string[];
  save: (term: string) => void;
  remove: (term: string) => void;
} {
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setSaved(readStorage());
  }, []);

  function save(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSaved((prev) => {
      const deduped = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...deduped].slice(0, MAX_SAVED);
      writeStorage(next);
      return next;
    });
  }

  function remove(term: string) {
    setSaved((prev) => {
      const next = prev.filter((s) => s !== term);
      writeStorage(next);
      return next;
    });
  }

  return { saved, save, remove };
}
