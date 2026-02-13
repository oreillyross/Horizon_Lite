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
import SignupForm from "@/pages/forms/SignupForm"
import ResetPasswordForm from "@/pages/forms/ResetPasswordForm"

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
