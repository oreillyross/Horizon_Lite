import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trpc, trpcClient } from "@/lib/trpc";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SnippetScreen from "./pages/snippet";
import SnippetForm from "@/pages/forms/snippet-form";

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
      <Route path="/snippet" component={SnippetScreen}/>
      <Route path="/snippet/new" component={SnippetForm}/>
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
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
