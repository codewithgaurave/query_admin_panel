import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import { Toaster } from "sonner";
import routes from "./route/SidebarRaoute";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading Admin Panel...</p>
    </div>
  </div>
);

// Helper to determine first accessible page for the logged-in user
export const getFirstAllowedPath = (user) => {
  if (!user) return "/login";
  if (user.role === "SUPER_ADMIN") return "/dashboard";
  const perms = user.permissions || {};
  for (const r of routes) {
    if (!r.hide && !r.superAdminOnly) {
      if (!r.permission || perms[r.permission] === true) {
        return r.path;
      }
    }
  }
  return "/profile";
};

// Route protection guard based on role and permissions
const PermissionRoute = ({ route, user, children }) => {
  if (route.superAdminOnly && user?.role !== "SUPER_ADMIN") {
    return <Navigate to={getFirstAllowedPath(user)} replace />;
  }
  if (!route.permission || user?.role === "SUPER_ADMIN") {
    return children;
  }
  const perms = user?.permissions || {};
  if (perms[route.permission] === true) {
    return children;
  }
  return <Navigate to={getFirstAllowedPath(user)} replace />;
};

function App() {
  const { isLoggedIn, loading, admin } = useAuth();

  if (loading) return <LoadingSpinner />;

  const homePath = getFirstAllowedPath(admin);

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to={homePath} replace /> : <Login />}
        />

        {/* Protected */}
        {isLoggedIn ? (
          <Route element={<DashboardLayout />}>
            {routes.map((route) => {
              const Component = route.component;
              return (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <PermissionRoute route={route} user={admin}>
                      <Suspense fallback={<LoadingSpinner />}>
                        <Component />
                      </Suspense>
                    </PermissionRoute>
                  }
                />
              );
            })}
            <Route path="*" element={<Navigate to={homePath} replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;