import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { TeamHubSidebar } from "@/components/teamhub-sidebar";
import { TeamHubTopbar } from "@/components/teamhub-topbar";
import { ImpersonationBanner } from "@/components/impersonation-switcher";
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/components/login-page";
import Landing from "@/pages/landing";
import TechStarLanding from "@/pages/techstar-landing";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import EventNetworking from "@/pages/event-networking";
import MyTickets from "@/pages/my-tickets";
import MyCertificates from "@/pages/my-certificates";
import Profile from "@/pages/profile";
import Videos from "@/pages/videos";
import Livestreams from "@/pages/livestreams";
import AcceptInvestorInvitation from "@/pages/accept-investor-invitation";
import Courses from "@/pages/courses";
import CourseDetail from "@/pages/course-detail";
import LessonViewer from "@/pages/lesson-viewer";
import QuizViewer from "@/pages/quiz-viewer";
import AssignmentViewer from "@/pages/assignment-viewer";
import CourseEdit from "@/pages/course-edit";
import AdminPanel from "@/pages/admin-panel";
import AdminReports from "@/pages/admin-reports";
import AdminOrganizations from "@/pages/admin-organizations";
import AdminGrading from "@/pages/admin-grading";
import Registrations from "@/pages/registrations";
import ScanAttendance from "@/pages/scan-attendance";
import Challenges from "@/pages/challenges";
import ChallengeDetail from "@/pages/challenge-detail";
import Messages from "@/pages/messages";
import CourseForum from "@/pages/course-forum";
import CourseGradebook from "@/pages/course-gradebook";
import Careers from "@/pages/careers";
import CandidateAuth from "@/pages/candidate-auth";
import CandidatePortal from "@/pages/candidate-portal";
import AdminCareers from "@/pages/admin-careers";
import AdminSignals from "@/pages/admin-signals";
import AdminScout from "@/pages/admin-scout";
import AdminScoutFiltered from "@/pages/admin-scout-filtered";
import AdminCohortAnalytics from "@/pages/admin-cohort-analytics";
import AdminMilestonesReview from "@/pages/admin-milestones-review";
import Startups from "@/pages/startups";
import StartupDetail from "@/pages/startup-detail";
import StartupIntegrations from "@/pages/startup-integrations";
import StartupFinancialIntegrations from "@/pages/startup-financial-integrations";
import StartupTelegram from "@/pages/startup-telegram";
import Corporate from "@/pages/corporate";
import Corporations from "@/pages/corporations";
import Programs from "@/pages/programs";
import Evaluations from "@/pages/evaluations";
import Reporting from "@/pages/reporting";
import Universities from "@/pages/universities";
import UniversityDetail from "@/pages/university-detail";
import ClubDetail from "@/pages/club-detail";
import MyReviews from "@/pages/my-reviews";
import AlertRules from "@/pages/alerts-rules";
import Watchlists from "@/pages/watchlists";
import Investors from "@/pages/investors";
import InvestorDetail from "@/pages/investor-detail";
import ThesisMatch from "@/pages/thesis-match";
import Members from "@/pages/members";
import News from "@/pages/news";
import NewsDetail from "@/pages/news-detail";
import AdminNews from "@/pages/admin-news";
import LandingRender from "@/pages/landing-render";
import PublicShowcase from "@/pages/public-showcase";
import AdminLanding from "@/pages/admin-landing";
import AdminLandingEdit from "@/pages/admin-landing-edit";
import Subscription from "@/pages/subscription";
import NotFound from "@/pages/not-found";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { AIChat, FloatingChatButton } from "@/components/ai-chat";
import { OnboardingTour } from "@/components/onboarding-tour";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Construction, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/events" component={Events} />
      <Route path="/events/:id/networking" component={EventNetworking} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/tickets" component={MyTickets} />
      <Route path="/certificates" component={MyCertificates} />
      <Route path="/profile" component={Profile} />
      <Route path="/videos" component={Videos} />
      <Route path="/livestreams" component={Livestreams} />
      <Route path="/invitations/investor/:token" component={AcceptInvestorInvitation} />
      <Route path="/courses" component={Courses} />
      <Route path="/courses/:id" component={CourseDetail} />
      <Route path="/lessons/:id" component={LessonViewer} />
      <Route path="/quizzes/:id" component={QuizViewer} />
      <Route path="/assignments/:id" component={AssignmentViewer} />
      <Route path="/courses/:id/edit" component={CourseEdit} />
      <Route path="/courses/:id/forum" component={CourseForum} />
      <Route path="/courses/:id/gradebook" component={CourseGradebook} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/organizations" component={AdminOrganizations} />
      <Route path="/admin/grading" component={AdminGrading} />
      <Route path="/registrations" component={Registrations} />
      <Route path="/scan-attendance" component={ScanAttendance} />
      <Route path="/challenges" component={Challenges} />
      <Route path="/challenges/:id" component={ChallengeDetail} />
      <Route path="/messages" component={Messages} />
      <Route path="/admin/careers" component={AdminCareers} />
      <Route path="/admin/signals" component={AdminSignals} />
      <Route path="/admin/scout" component={AdminScout} />
      <Route path="/admin/scout/filtered" component={AdminScoutFiltered} />
      <Route path="/admin/cohort-analytics" component={AdminCohortAnalytics} />
      <Route path="/admin/milestones/review" component={AdminMilestonesReview} />
      <Route path="/careers" component={Careers} />
      <Route path="/startups" component={Startups} />
      <Route path="/startups/:id/integrations" component={StartupIntegrations} />
      <Route path="/startups/:id/financial-integrations" component={StartupFinancialIntegrations} />
      <Route path="/startups/:id/telegram" component={StartupTelegram} />
      <Route path="/startups/:id" component={StartupDetail} />
      <Route path="/corporate" component={Corporate} />
      <Route path="/corporations" component={Corporations} />
      <Route path="/programs" component={Programs} />
      <Route path="/evaluations" component={Evaluations} />
      <Route path="/reporting" component={Reporting} />
      <Route path="/universities" component={Universities} />
      <Route path="/universities/:slug" component={UniversityDetail} />
      <Route path="/clubs/:slug" component={ClubDetail} />
      <Route path="/my-reviews" component={MyReviews} />
      <Route path="/alerts/rules" component={AlertRules} />
      <Route path="/watchlists" component={Watchlists} />
      <Route path="/investors" component={Investors} />
      <Route path="/investors/:id" component={InvestorDetail} />
      <Route path="/thesis-match" component={ThesisMatch} />
      <Route path="/members" component={Members} />
      <Route path="/news" component={News} />
      <Route path="/news/:id" component={NewsDetail} />
      <Route path="/admin/news" component={AdminNews} />
      <Route path="/admin/landing" component={AdminLanding} />
      <Route path="/admin/landing/:id" component={AdminLandingEdit} />
      <Route path="/p/:slug" component={LandingRender} />
      <Route path="/showcase/:id" component={PublicShowcase} />
      <Route path="/subscription" component={Subscription} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRouter() {
  const [location] = useLocation();
  
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.98
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
      transition: {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        <Switch location={location}>
          <Route path="/" component={Landing} />
          <Route path="/techstar" component={TechStarLanding} />
          <Route path="/careers" component={Careers} />
          <Route path="/candidate/login" component={CandidateAuth} />
          <Route path="/candidate" component={CandidatePortal} />
          <Route path="/universities/:slug" component={UniversityDetail} />
          <Route path="/clubs/:slug" component={ClubDetail} />
          <Route path="/news" component={News} />
          <Route path="/news/:id" component={NewsDetail} />
          <Route path="/p/:slug" component={LandingRender} />
          <Route path="/showcase/:id" component={PublicShowcase} />
          <Route path="/invitations/investor/:token" component={AcceptInvestorInvitation} />
          <Route path="/login">
            {() => <LoginPage />}
          </Route>
          <Route path="/register">
            {() => <LoginPage />}
          </Route>
          <Route component={Landing} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function OnboardingChatWrapper() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <FloatingChatButton onClick={() => setChatOpen(true)} />
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <AIChat
            type="onboarding"
            onClose={() => setChatOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AuthenticatedApp() {
  const { user, isHeadAdmin } = useAuth();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem("onboardingTourCompleted");
    if (!tourCompleted && user) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleTourComplete = () => {
    localStorage.setItem("onboardingTourCompleted", "true");
    setShowTour(false);
  };

  const handleTourClose = () => {
    localStorage.setItem("onboardingTourCompleted", "true");
    setShowTour(false);
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <>
      <OnboardingTour
        isOpen={showTour}
        onClose={handleTourClose}
        onComplete={handleTourComplete}
      />

      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full bg-background">
          <TeamHubSidebar
            userName={user?.firstName || user?.email || "User"}
            userRole={user?.role}
            isHeadAdmin={isHeadAdmin}
          />
          <div className="flex flex-col flex-1 min-w-0 relative">
            <ImpersonationBanner />
            <TeamHubTopbar
              userName={user?.firstName || user?.email || "User"}
              isHeadAdmin={isHeadAdmin}
            />
            <main className="flex-1 overflow-auto px-3 py-6 sm:px-6 md:p-8">
              <AuthenticatedRouter />
            </main>
          </div>
          <OnboardingChatWrapper />
        </div>
      </SidebarProvider>
    </>
  );
}

function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Platform Under Maintenance</h1>
          <p className="text-muted-foreground">
            We're currently performing scheduled maintenance. The platform will be back online shortly. Thank you for your patience.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
            <ShieldAlert className="h-4 w-4" />
            <span>Access restricted by administrator</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function detectLandingSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  // Strip port
  const labels = host.split(".");
  if (labels.length < 3) return null;
  const sub = labels[0].toLowerCase();
  const reserved = new Set(["www", "api", "app", "admin", "mail", "ftp", "blog", "static", "cdn", "assets", "dashboard"]);
  if (reserved.has(sub)) return null;
  // Only auto-route on the configured landing root domain
  const rest = labels.slice(1).join(".");
  if (rest === "ecfinuni.com") return sub;
  return null;
}

function AppContent() {
  const { isAuthenticated, isLoading, isHeadAdmin } = useAuth();
  const landingSlug = detectLandingSubdomain();
  if (landingSlug) {
    return <LandingRender slugOverride={landingSlug} />;
  }

  const { data: maintenanceStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/maintenance/status"],
    refetchInterval: 30000,
  });

  const isMaintenanceMode = maintenanceStatus?.enabled === true;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isMaintenanceMode && isAuthenticated && !isHeadAdmin) {
    return <MaintenancePage />;
  }

  if (isMaintenanceMode && !isAuthenticated) {
    return <UnauthenticatedRouter />;
  }

  return !isAuthenticated ? <UnauthenticatedRouter /> : <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LanguageProvider>
            <NavigationProvider>
              <AppContent />
              <PWAInstallPrompt />
              <Toaster />
            </NavigationProvider>
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
