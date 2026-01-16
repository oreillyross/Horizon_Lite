import { trpc } from "@/lib/trpc";

export default function SnippetShow() {
  const snippetsQuery = trpc.getSnippets.useQuery();

  return (
    <div>
      {snippetsQuery.data?.map((item) => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  );
}
