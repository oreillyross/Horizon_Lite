type Props = {
  doc: {
    url: string
    domain: string
    title: string
    image_url: string | null
    published_at: string
    tone: number
    themes: string[]
    organizations: string[]
  }
}

export function FeedCard({ doc }: Props) {
  const toneColor =
    doc.tone < -5
      ? "text-red-600"
      : doc.tone < -2
      ? "text-orange-500"
      : "text-gray-600";

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between text-sm text-gray-500">
        <span>{doc.domain}</span>
        <span>
          {new Date(doc.published_at).toLocaleTimeString()}
        </span>
      </div>

      <h3 className="text-lg font-semibold">
        {doc.title}
      </h3>

      <div className={`text-sm ${toneColor}`}>
        Tone: {doc.tone}
      </div>

      <div className="flex flex-wrap gap-2">
        {doc.themes?.slice(0, 5).map((theme) => (
          <span
            key={theme}
            className="text-xs bg-gray-100 px-2 py-1 rounded"
          >
            {theme}
          </span>
        ))}
      </div>

      <div className="flex gap-4 text-sm">
        <a
          href={doc.url}
          target="_blank"
          className="text-blue-600"
        >
          Open Article
        </a>

        <button className="text-blue-600">
          Webcut
        </button>

        <button className="text-blue-600">
          Capture Snippet
        </button>
      </div>
    </div>
  );
}