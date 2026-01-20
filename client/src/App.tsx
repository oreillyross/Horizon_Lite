import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc, trpcClient } from "@/lib/trpc";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SnippetScreen from "./pages/snippet";
import NavigationBar from "@/components/NavigationBar";
import SnippetTable from "./pages/snippet-show";

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
      <Route path="/" component={Home} />
      <Route path="/snippet/create" component={SnippetScreen} />
      <Route path="/snippet/show" component={SnippetTable} />
      <Route component={NotFound} />
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
              { linkName: "Snippets", href: "/snippet/show" },
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
