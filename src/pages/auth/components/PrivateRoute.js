import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../../utils/constants";
import { useLocalStorage } from "../../../utils/localStorage";
import { DEMO } from "../../analytics/demo/demoApi";

const PrivateRoute = () => {
  const [searchParams] = useSearchParams();
  const [getToken] = useLocalStorage(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);

  // DEMO build: no backend, no login — every protected route is open.
  if (DEMO) return <Outlet />;

  const localStorageToken = getToken();
  const urlToken = searchParams.get('authToken');
  const isAuthenticated = localStorageToken || urlToken;

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
