import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { fetchMeStatus } from "../api/users";
import { ROUTES } from "../constants/routes";

export default function ProfileGate() {
  const [loading, setLoading] = useState(true);
  const [allow, setAllow] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await fetchMeStatus();
        if (!alive) return;
        if (data?.profile_complete) {
          setAllow(true);
        } else if (loc.pathname !== ROUTES.COMPLETE_PROFILE) {
          nav(ROUTES.COMPLETE_PROFILE, { replace: true });
        } else {
          setAllow(true);
        }
      } catch {
        // TODO: API
        setAllow(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [nav, loc.pathname]);

  if (loading) return null;
  return allow ? <Outlet /> : null;
}
