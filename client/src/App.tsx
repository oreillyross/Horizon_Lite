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
import EditSnippetScreen from "./pages/EditSnippetScreen"
import TagsScreen from "./pages/TagsScreen";
import SnippetViewScreen from "@/pages/SnippetViewScreen"
import RecentSourcesScreen from "@/pages/RecentSourcesScreen"
import WebcutScreen from "@/pages/WebcutScreen"

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
      <Route path="/snippet/:id/edit" component={EditSnippetScreen}/>
      <Route path="/snippet/:id" component={SnippetViewScreen}/>
      <Route path="/sources/recent" component={RecentSourcesScreen}/>
      <Route path="/tags/show" component={TagsScreen} />
      <Route path="/webcut" component={WebcutScreen}/>
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
              { linkName: "Webcut", href: "/webcut" },
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
