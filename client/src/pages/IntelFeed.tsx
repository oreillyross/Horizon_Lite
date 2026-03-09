import { trpc } from "@/lib/trpc";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { FeedCard } from "@/components/FeedCard";

export default function IntelFeed() {
  const { ref, inView } = useInView();

  const query = trpc.intel.feed.useInfiniteQuery(
    { limit: 30 },
    {
      getNextPageParam: (last) => last.nextCursor
    }
  );

  const items =
    query.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [inView, query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {items.map((doc) => (
        <FeedCard key={doc.url} doc={doc} />
      ))}

      <div ref={ref} className="h-20 flex justify-center items-center">
        {query.isFetchingNextPage && <p>Loading...</p>}
      </div>
    </div>
  );
 
}