import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createScenarioInputSchema, type CreateScenarioInput } from "@shared";

export default function HorizonScenarioNewScreen() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const params = new URLSearchParams(search);
  const preselectedThemeId = params.get("themeId") ?? undefined;

  const themesQuery = trpc.horizon.themes.list.useQuery();

  const form = useForm<CreateScenarioInput>({
    resolver: zodResolver(createScenarioInputSchema),
    defaultValues: { name: "", description: "", themeId: preselectedThemeId },
    mode: "onBlur",
  });

  useEffect(() => {
    if (preselectedThemeId) {
      form.setValue("themeId", preselectedThemeId, { shouldValidate: false });
    }
  }, [preselectedThemeId]);

  const createMutation = trpc.horizon.scenarios.create.useMutation({
    onSuccess: (created) => {
      utils.horizon.scenarios.list.invalidate();
      toast({ title: "Scenario created" });
      setLocation(created?.id ? `/horizon/scenarios/${created.id}` : "/horizon/scenarios");
    },
    onError: (err) => {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    },
  });

  function onSubmit(values: CreateScenarioInput) {
    createMutation.mutate(values);
  }

  const themes = themesQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          type="button"
          onClick={() =>
            preselectedThemeId
              ? history.back()
              : setLocation("/horizon/scenarios")
          }
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {preselectedThemeId ? "Back" : "Scenarios"}
        </button>
        <h1 className="mt-2 text-3xl font-semibold">New Scenario</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="themeId">Linked Theme</Label>
              {preselectedThemeId ? (
                <>
                  <input type="hidden" {...form.register("themeId")} />
                  <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                    {themes.find((t) => t.id === preselectedThemeId)?.name ?? "Loading…"}
                  </div>
                </>
              ) : (
                <Select
                  value={form.watch("themeId") ?? ""}
                  onValueChange={(val) =>
                    form.setValue("themeId", val || undefined, { shouldValidate: true })
                  }
                  disabled={themesQuery.isLoading}
                >
                  <SelectTrigger id="themeId">
                    <SelectValue placeholder="Select a theme (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Optional. Link this scenario to a theme for grouped analysis.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Hybrid Warfare Campaign"
                maxLength={100}
                {...form.register("name")}
              />
              <p className="text-xs text-muted-foreground">
                2–4 words, memorable and clear. Max 100 characters.
              </p>
              {form.formState.errors.name?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="One paragraph describing the threat scenario — who, what, when, where, why."
                rows={5}
                maxLength={2000}
                className="resize-none"
                {...form.register("description")}
              />
              <p className="text-xs text-muted-foreground">
                Who? What? When? Where? Why? Max 2000 characters.
              </p>
              {form.formState.errors.description?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  preselectedThemeId ? history.back() : setLocation("/horizon/scenarios")
                }
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Scenario
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
