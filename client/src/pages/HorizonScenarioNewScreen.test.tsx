import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import HorizonScenarioNewScreen from "./HorizonScenarioNewScreen";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      horizon: {
        scenarios: {
          list: { invalidate: vi.fn() },
        },
      },
    }),
    horizon: {
      themes: {
        list: { useQuery: vi.fn() },
      },
      scenarios: {
        create: { useMutation: vi.fn() },
      },
    },
  },
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(() => ["/", vi.fn()]),
  useSearch: vi.fn(() => ""),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { trpc } from "@/lib/trpc";
const mockTrpc = trpc as any;

const THEMES = [{ id: "theme-1", name: "Theme Alpha", description: null, updatedAt: "", scenarioCount: 0 }];

function setupDefaultMocks() {
  mockTrpc.horizon.themes.list.useQuery.mockReturnValue({
    data: THEMES,
    isLoading: false,
  });
  mockTrpc.horizon.scenarios.create.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
}

describe("HorizonScenarioNewScreen", () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  it("populates the theme select from horizon.themes.list", () => {
    render(<HorizonScenarioNewScreen />);
    expect(screen.getByText("Theme Alpha")).toBeInTheDocument();
  });

  it("submits name, description, and the selected themeId via horizon.scenarios.create", async () => {
    const createMutate = vi.fn();
    mockTrpc.horizon.scenarios.create.useMutation.mockReturnValue({
      mutate: createMutate,
      isPending: false,
    });

    render(<HorizonScenarioNewScreen />);

    fireEvent.change(screen.getByPlaceholderText("e.g. Hybrid Warfare Campaign"), {
      target: { value: "Hybrid Escalation" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "One paragraph describing the threat scenario — who, what, when, where, why.",
      ),
      { target: { value: "A plausible test scenario description." } },
    );

    fireEvent.click(screen.getByRole("button", { name: /create scenario/i }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Hybrid Escalation",
          description: "A plausible test scenario description.",
        }),
      );
    });
  });
});
