import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { createIndicatorInputSchema, type CreateIndicatorInput } from "@shared";

export default function HorizonIndicatorNewScreen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const form = useForm<CreateIndicatorInput>({
    resolver: zodResolver(createIndicatorInputSchema),
    defaultValues: {
      name: "",
      category: "political",
      description: "",
      regionScope: "",
      strength: 5,
      timeWeight: "week",
      decayBehaviour: "linear",
    },
    mode: "onBlur",
  });

  const createMutation = trpc.horizon.signals.createIndicator.useMutation({
    onSuccess: (created) => {
      utils.horizon.signals.listIndicators.invalidate();
      toast({ title: "Indicator created" });
      setLocation(created?.id ? `/horizon/signals/${created.id}` : "/horizon/signals");
    },
    onError: (err) => {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    },
  });

  function onSubmit(values: CreateIndicatorInput) {
    createMutation.mutate({
      ...values,
      regionScope: values.regionScope?.trim() || undefined,
      description: values.description?.trim() || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setLocation("/horizon/signals")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Signals
        </button>
        <h1 className="mt-2 text-3xl font-semibold">New Indicator</h1>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. State-media amplification of border incidents"
                maxLength={120}
                {...form.register("name")}
              />
              <p className="text-xs text-muted-foreground">
                Concise, observable signal name. Max 120 characters.
              </p>
              {form.formState.errors.name?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="category"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                {...form.register("category")}
              >
                <option value="political">Political</option>
                <option value="infoops">InfoOps</option>
                <option value="infra">Infrastructure</option>
                <option value="diplomatic">Diplomatic</option>
              </select>
              {form.formState.errors.category?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What observable event or pattern does this indicator track?"
                rows={4}
                maxLength={2000}
                className="resize-none"
                {...form.register("description")}
              />
              <p className="text-xs text-muted-foreground">Optional. Max 2000 characters.</p>
              {form.formState.errors.description?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Region Scope */}
            <div className="space-y-1.5">
              <Label htmlFor="regionScope">Region Scope</Label>
              <Input
                id="regionScope"
                placeholder="e.g. EU-wide, Baltic Sea, Western Balkans"
                maxLength={100}
                {...form.register("regionScope")}
              />
              <p className="text-xs text-muted-foreground">
                Geographic focus for this indicator. Optional.
              </p>
              {form.formState.errors.regionScope?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.regionScope.message}
                </p>
              )}
            </div>

            {/* Strength, TimeWeight, DecayBehaviour — three columns */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {/* Strength */}
              <div className="space-y-1.5">
                <Label htmlFor="strength">
                  Strength <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="strength"
                  type="number"
                  min={1}
                  max={9}
                  {...form.register("strength", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">1 (weak) – 9 (critical)</p>
                {form.formState.errors.strength?.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.strength.message}
                  </p>
                )}
              </div>

              {/* Time Weight */}
              <div className="space-y-1.5">
                <Label htmlFor="timeWeight">
                  Time Weight <span className="text-destructive">*</span>
                </Label>
                <select
                  id="timeWeight"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  {...form.register("timeWeight")}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
                {form.formState.errors.timeWeight?.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.timeWeight.message}
                  </p>
                )}
              </div>

              {/* Decay Behaviour */}
              <div className="space-y-1.5">
                <Label htmlFor="decayBehaviour">
                  Decay <span className="text-destructive">*</span>
                </Label>
                <select
                  id="decayBehaviour"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  {...form.register("decayBehaviour")}
                >
                  <option value="linear">Linear</option>
                  <option value="step">Step</option>
                  <option value="none">None</option>
                </select>
                {form.formState.errors.decayBehaviour?.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.decayBehaviour.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/horizon/signals")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Indicator
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
