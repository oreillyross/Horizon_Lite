import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc, trpcClient } from "@/lib/trpc";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SnippetScreen from "./pages/SnippetScreen";
import NavigationBar from "@/components/NavigationBar";
import SnippetTable from "./pages/SnippetTable";
import EditSnippetScreen from "./pages/EditSnippetScreen";
import TagsScreen from "./pages/TagsScreen";
import SnippetViewScreen from "@/pages/SnippetViewScreen";
import RecentSourcesScreen from "@/pages/RecentSourcesScreen";
import WebcutScreen from "@/pages/WebcutScreen";
import AdminScreen from "@/pages/AdminScreen";
import ThemeViewScreen from "@/pages/ThemeViewScreen";
import ThemeCreateForm from "@/pages/forms/ThemeCreateForm";
import ThemesScreen from "@/pages/ThemesScreen";
import { SessionGate } from "@/components/SessionGate";
import LoginForm from "@/pages/forms/LoginForm";
import { RequireAuth } from "@/components/RequireAuth";
import SignupForm from "@/pages/forms/SignupForm";
import ResetPasswordForm from "@/pages/forms/ResetPasswordForm";
import HorizonOverViewScreen from "@/pages/HorizonOverviewScreen";
import HorizonScenarioDetailScreen from "@/pages/HorizonScenarioDetailScreen";
import HorizonSignalsScreen from "@/pages/HorizonSignalsScreen";
import HorizonIndicatorDetailScreen from "@/pages/HorizonIndicatorDetailScreen";
import HorizonUpdatesScreen from "@/pages/HorizonUpdatesScreen";
import HorizonReportsScreen from "@/pages/HorizonReportsScreen"
import SourcesScreen from "@/pages/SourcesScreen"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/">
        <SessionGate authed={<Home />} unauthed={<LoginForm />} />
      </Route>
      <Route path="/reset-password">
        <ResetPasswordForm />
      </Route>
      <Route path="/horizon/overview">
        <RequireAuth>
          <HorizonOverViewScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/scenarios">
        <RequireAuth>
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
            <div className="text-3xl font-semibold">Scenarios</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Coming next.
            </div>
          </div>
        </RequireAuth>
      </Route>

      <Route path="/horizon/scenarios/:id">
        <RequireAuth>
          <HorizonScenarioDetailScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/signals">
        <RequireAuth>
          <HorizonSignalsScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/signals/:id">
        <RequireAuth>
          <HorizonIndicatorDetailScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/updates">
        <RequireAuth>
          <HorizonUpdatesScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/reports">
        <RequireAuth>
         <HorizonReportsScreen/>
        </RequireAuth>
      </Route>
      <Route path="/sources">
        <RequireAuth>
         <SourcesScreen/>
        </RequireAuth>
      </Route>

      <Route path="/signup">
        <SignupForm />
      </Route>

      <Route path="/snippet/create">
        <RequireAuth>
          <SnippetScreen />
        </RequireAuth>
      </Route>

      <Route path="/snippet/show">
        <RequireAuth>
          <SnippetTable />
        </RequireAuth>
      </Route>

      <Route path="/snippet/:id/edit">
        <RequireAuth>
          <EditSnippetScreen />
        </RequireAuth>
      </Route>

      <Route path="/snippet/:id">
        <RequireAuth>
          <SnippetViewScreen />
        </RequireAuth>
      </Route>

      <Route path="/sources/recent">
        <RequireAuth>
          <RecentSourcesScreen />
        </RequireAuth>
      </Route>

      <Route path="/tags/show">
        <RequireAuth>
          <TagsScreen />
        </RequireAuth>
      </Route>

      <Route path="/themes">
        <RequireAuth>
          <ThemesScreen />
        </RequireAuth>
      </Route>

      <Route path="/theme/create">
        <RequireAuth>
          <ThemeCreateForm />
        </RequireAuth>
      </Route>

      <Route path="/admin">
        <RequireAuth>
          <AdminScreen />
        </RequireAuth>
      </Route>

      <Route path="/theme/:id">
        <RequireAuth>
          <ThemeViewScreen />
        </RequireAuth>
      </Route>

      <Route path="/webcut">
        <RequireAuth>
          <WebcutScreen />
        </RequireAuth>
      </Route>

      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <NavigationBar
            items={[
              { linkName: "Home", href: "/" },
              { linkName: "Horizon", href: "/horizon/overview" },
              { linkName: "Webcut", href: "/webcut" },
              { linkName: "Themes", href: "/themes" },
              { linkName: "Sources", href: "/sources/recent" },
              { linkName: "Snippets", href: "/snippet/show" },
              { linkName: "Tags", href: "/tags/show" },
              { linkName: "Create", href: "/snippet/create" },
              { linkName: "Profile", href: "/profile" },
            ]}
          />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
