import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Campaigns from "./pages/Campaigns";
import Invite from "./pages/Invite";
import Master from "./pages/Master";
import CampaignDetail from "./pages/CampaignDetail";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Profile from "@/pages/Profile";
import AuthPage from "@/pages/Auth";
import CharacterCreate from "@/pages/CharacterCreate";
import CharacterSheet from "@/pages/CharacterSheet";
import GameSession from "@/pages/GameSession";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/campaigns"} component={Campaigns} />
      <Route path={"/master"} component={Master} />
      <Route path={"/master/campaign/:id"} component={CampaignDetail} />
      <Route path={"/campaigns/join/:id"} component={Invite} />
      <Route path={"/profile"} component={Profile} />
      <Route path="/auth" component={AuthPage} />
      <Route path={"/characters/new"} component={CharacterCreate} />
      <Route path={"/characters/:id"} component={CharacterSheet} />
      <Route path={"/session/:id"} component={GameSession} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      // switchable
      >
        <TooltipProvider>
          <QueryClientProvider client={queryClient}>
            <SonnerToaster />
            <Router />
            <Toaster />
          </QueryClientProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
