import { useEffect, useState } from "react";
import { currentRoute, ROUTES } from "../routes.js";

/**
 * useRouter
 * Encapsula o roteamento hash-based.
 */
export default function useRouter() {
  const [route, setRoute] = useState(() => {
    // Se o hash contém access_token (retorno do OAuth redirect), ignora
    if (window.location.hash.includes("access_token")) return ROUTES.welcome;
    return currentRoute();
  });

  useEffect(() => {
    function updateRoute() { setRoute(currentRoute()); }
    window.addEventListener("popstate", updateRoute);
    window.addEventListener("hashchange", updateRoute);
    return () => {
      window.removeEventListener("popstate", updateRoute);
      window.removeEventListener("hashchange", updateRoute);
    };
  }, []);

  return route;
}
