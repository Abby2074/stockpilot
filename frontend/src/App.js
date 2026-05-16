import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Transactions from "./pages/Transactions";
import AICount from "./pages/AICount";
import Users from "./pages/Users";
import AppShell from "./components/AppShell";
import { getUser } from "./lib/api";

function PrivateRoute({ children, roles, title, subtitle }) {
  const token = localStorage.getItem("token");
  const user = getUser();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <AppShell title={title} subtitle={subtitle}>
      {children}
    </AppShell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute title="Dashboard" subtitle="Inventory overview & activity">
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/products"
          element={
            <PrivateRoute title="Products" subtitle="Catalogue & stock items">
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <PrivateRoute
              roles={["OWNER", "MANAGER", "STOREKEEPER"]}
              title="Stock transactions"
              subtitle="Initiate, approve, reject stock movements"
            >
              <Transactions />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-count"
          element={
            <PrivateRoute
              roles={["OWNER", "MANAGER", "STOREKEEPER"]}
              title="AI Count Session"
              subtitle="Computer-vision assisted stock counting"
            >
              <AICount />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute roles={["OWNER"]} title="Users" subtitle="User accounts & roles">
              <Users />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
