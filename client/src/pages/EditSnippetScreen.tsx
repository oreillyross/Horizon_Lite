import { useParams, useLocation } from "wouter";

export default function EditSnippetScreen() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">
        Edit Snippet
      </h1>

      <p className="text-sm text-muted-foreground">
        Snippet ID: {id}
      </p>

      <button
        className="mt-4 text-sm underline"
        onClick={() => setLocation("/snippet/show")}
      >
        ← Back
      </button>
    </div>
  );
}
