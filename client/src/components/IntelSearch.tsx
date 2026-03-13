type IntelSearchProps = {
  query: string;
  setQuery: (q: string) => void;
};

export function IntelSearch({ query, setQuery }: IntelSearchProps) {
  return (
    <input
      type="text"
      placeholder="Search intel..."
      className="w-full border rounded-md p-2"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}