import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc, trpcClient } from "@/lib/trpc";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import NavigationBar from "@/components/NavigationBar";
import SubNavigationBar from "@/components/SubNavigationBar";
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
import HorizonScenariosListScreen from "@/pages/HorizonScenariosListScreen";
import HorizonScenarioNewScreen from "@/pages/HorizonScenarioNewScreen";
import HorizonScenarioDetailScreen from "@/pages/HorizonScenarioDetailScreen";
import HorizonSignalsScreen from "@/pages/HorizonSignalsScreen";
import HorizonIndicatorNewScreen from "@/pages/HorizonIndicatorNewScreen";
import HorizonIndicatorDetailScreen from "@/pages/HorizonIndicatorDetailScreen";
import HorizonUpdatesScreen from "@/pages/HorizonUpdatesScreen";
import HorizonReportsScreen from "@/pages/HorizonReportsScreen"
import IntelFeed from "@/pages/IntelFeed"
import IntelEventsPage from "@/pages/IntelEventsPage"
import HorizonGdeltTriageScreen from "@/pages/HorizonGdeltTriageScreen"
import HorizonWebcutScreen from "@/pages/HorizonWebcutScreen"
import HorizonSnippetsScreen from "@/pages/HorizonSnippetsScreen"
import HorizonSnippetDetailScreen from "@/pages/HorizonSnippetDetailScreen"

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
        <SessionGate authed={<HorizonOverViewScreen />} unauthed={<LoginForm />} />
      </Route>
      <Route path="/reset-password">
        <ResetPasswordForm />
      </Route>
      <Route path="/horizon/overview">
        <RequireAuth>
          <HorizonOverViewScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/scenarios/new">
        <RequireAuth>
          <HorizonScenarioNewScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/scenarios/:id">
        <RequireAuth>
          <HorizonScenarioDetailScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/scenarios">
        <RequireAuth>
          <HorizonScenariosListScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/signals">
        <RequireAuth>
          <HorizonSignalsScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/signals/new">
        <RequireAuth>
          <HorizonIndicatorNewScreen />
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
      <Route path="/intel/feed">
        <RequireAuth>
          <IntelFeed />
        </RequireAuth>
      </Route>

      <Route path="/intel/events">
        <RequireAuth>
          <IntelEventsPage />
        </RequireAuth>
      </Route>

      <Route path="/horizon/snippets/:id">
        <RequireAuth>
          <HorizonSnippetDetailScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/snippets">
        <RequireAuth>
          <HorizonSnippetsScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/gdelt/triage">
        <RequireAuth>
          <HorizonGdeltTriageScreen />
        </RequireAuth>
      </Route>

      <Route path="/horizon/gdelt/read/:eventId">
        <RequireAuth>
          <HorizonWebcutScreen />
        </RequireAuth>
      </Route>

      <Route path="/signup">
        <SignupForm />
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
          <NavigationBar />
          <SubNavigationBar />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
