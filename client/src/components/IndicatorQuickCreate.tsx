import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  onCreated: (id: string, name: string) => void;
  onCancel: () => void;
}

export function IndicatorQuickCreate({ onCreated, onCancel }: Props) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const categoriesQ = trpc.admin.listIndicatorCategories.useQuery();

  const createIndicator = trpc.horizon.signals.createIndicator.useMutation({
    onSuccess: (data) => {
      void utils.horizon.signals.listIndicators.invalidate();
      onCreated(data.id, name.trim());
      toast({ title: "Indicator created" });
    },
    onError: (err) => {
      toast({ title: "Failed to create indicator", description: err.message, variant: "destructive" });
    },
  });

  function handleSubmit() {
    if (!name.trim() || !category) return;
    createIndicator.mutate({ name: name.trim(), category });
  }

  return (
    <div className="rounded-md border bg-muted/30 p-2 space-y-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New indicator name"
        className="h-8 w-full rounded-md border bg-background px-2 text-sm"
      />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categoriesQ.data?.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSubmit}
          disabled={createIndicator.isPending || !name.trim() || !category}
        >
          {createIndicator.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Create
        </Button>
      </div>
    </div>
  );
}
