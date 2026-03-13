import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { trpc } from "@/lib/trpc";
import { IntelSearch } from "@/components/IntelSearch";
import { FeedCard } from "@/components/FeedCard";
import { useInView } from "react-intersection-observer";

export default function IntelFeed() {
 
  
  const { ref, inView } = useInView();

  const [query, setQuery] = useState("");
  const [debounced] = useDebounce(query, 350);

  const searchQuery = trpc.intel.searchDocuments.useInfiniteQuery(
    { q: debounced, limit: 30 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      enabled: debounced.length >= 3,
    },
  );

  const feedQuery = trpc.intel.feed.useInfiniteQuery(
    { limit: 30 },
    {
      getNextPageParam: (last) => last.nextCursor,
      enabled: debounced.length < 3,
    },
  );

  // infinite scroll trigger
  useEffect(() => {
    if (!inView) return;

    if (debounced.length >= 3) {
      if (searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
        searchQuery.fetchNextPage();
      }
    } else {
      if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
        feedQuery.fetchNextPage();
      }
    }
  }, [inView, debounced, feedQuery, searchQuery]);

  const feedItems =
    feedQuery.data?.pages.flatMap((p) => p.items).filter(Boolean) ?? [];

  const searchItems =
    searchQuery.data?.pages.flatMap((p) => p.items).filter(Boolean) ?? [];

  const items = debounced.length >= 3 ? searchItems : feedItems;


  console.log({
    pages: searchQuery.data?.pages.length,
    nextCursor: searchQuery.data?.pages.at(-1)?.nextCursor,
    hasNextPage: searchQuery.hasNextPage,
  });
  
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <IntelSearch query={query} setQuery={setQuery} />

      {debounced.length >= 3 && searchQuery.isFetching && (
        <div className="text-sm text-gray-500">Searching...</div>
      )}

      {items.map((doc) => (doc ? <FeedCard key={doc.url} doc={doc} /> : null))}

      {/* infinite scroll sentinel */}
      <div ref={ref} className="h-10" />
    </div>
  );
}
