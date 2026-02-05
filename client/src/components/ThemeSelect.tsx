import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

type Props = {
  value: string | null;
  onChange: (themeId: string | null) => void;
  label?: string;
};

export default function ThemeSelect({ value, onChange, label = "Theme" }: Props) {
  const { data, isLoading } = trpc.themes.getThemes.useQuery();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <div className="flex items-center gap-2">
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? e.target.value : null)}
          disabled={isLoading}
        >
          <option value="">No theme</option>
          {(data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
    </div>
  );
}
