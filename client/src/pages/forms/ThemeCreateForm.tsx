"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ThemeCreateSchema, type ThemeCreateValues } from "@shared";

export default function ThemeCreateScreen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<ThemeCreateValues>({
    resolver: zodResolver(ThemeCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      prompt: "",
    },
    mode: "onBlur",
  });

  const createTheme = trpc.themes.createTheme.useMutation({
    onSuccess: (created) => {
      toast({ title: "Theme created" });

      // Prefer redirecting to detail if you have it; fallback to list.
      if (created?.id) setLocation(`/theme/${created.id}`);
      else setLocation("/themes");
    },
    onError: (err) => {
      toast({
        title: "Create failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const isSaving = createTheme.isPending;

  function onSubmit(values: ThemeCreateValues) {
    createTheme.mutate({
      name: values.name.trim(),
      description: values.description?.trim() || null,
    });
  }

  return (
    <div className="px-6 lg:px-8 py-6">
      <div className="max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Create theme
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Themes help you reuse a consistent style/prompt across snippets.
            </p>
          </div>

          {/* Secondary action */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/themes")}
            className="hidden sm:inline-flex"
          >
            Cancel
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium">Details</CardTitle>
              <CardDescription>
                Keep it short—this should read well in dropdowns/selectors.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Crisp technical"
                  {...form.register("name")}
                />
                {form.formState.errors.name?.message ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional one-liner"
                  {...form.register("description")}
                />
                {form.formState.errors.description?.message ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                ) : null}
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt (optional)</Label>
                <Textarea
                  id="prompt"
                  className="h-24 font-mono text-sm"
                  placeholder="System / instruction text that will be applied when using this theme…"
                  {...form.register("prompt")}
                />
                {form.formState.errors.prompt?.message ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.prompt.message}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Tip: keep it stable, not snippet-specific.
                  </p>
                )}
              </div>

              {/* Actions: full-width on mobile, right-aligned on desktop */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/themes")}
                  className="sm:hidden"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : null}
                  Create theme
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Small debug block if you want it later:
        <pre className="text-xs mt-4 text-muted-foreground">
          {JSON.stringify(form.watch(), null, 2)}
        </pre>
        */}
      </div>
    </div>
  );
}
