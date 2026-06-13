import { Switch, Route } from "wouter";
import { ThemeProvider } from "./components/theme";
import { Layout } from "./components/layout";
import Dashboard from "./pages/dashboard";
import Events from "./pages/events";
import EventDetail from "./pages/event-detail";
import Startups from "./pages/startups";
import StartupDetail from "./pages/startup-detail";
import Investors from "./pages/investors";
import InvestorDetail from "./pages/investor-detail";
import ThesisMatch from "./pages/thesis-match";
import NotFound from "./pages/not-found";

export default function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/events" component={Events} />
          <Route path="/events/:id" component={EventDetail} />
          <Route path="/startups" component={Startups} />
          <Route path="/startups/:id" component={StartupDetail} />
          <Route path="/investors" component={Investors} />
          <Route path="/investors/:id" component={InvestorDetail} />
          <Route path="/thesis-match" component={ThesisMatch} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </ThemeProvider>
  );
}
