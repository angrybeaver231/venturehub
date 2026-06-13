import { useEffect } from "react";
import { useLocation, useParams } from "wouter";

/**
 * Financial integrations have been merged into the unified `/startups/:id/integrations`
 * page (split by category: Banking / Payments / Subscriptions). This route stays around
 * for backward-compat links and immediately redirects.
 */
export default function StartupFinancialIntegrations() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (params.id) navigate(`/startups/${params.id}/integrations`, { replace: true });
  }, [params.id, navigate]);
  return null;
}
