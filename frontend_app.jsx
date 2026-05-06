// App.jsx — routing and protected route logic
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LoginPage    from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import CustomersPage from './pages/customers/CustomersPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import ReportsPage  from './pages/reports/ReportsPage';
import POSPage      from './pages/pos/POSPage';
import Layout       from './components/Layout';

// ProtectedRoute — redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gray-light">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-brand-gray font-medium">Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <LoginPage />
      }/>

      {/* Protected — wrapped in Layout (sidebar + topbar) */}
      <Route path="/" element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route index            element={<DashboardPage />} />
        <Route path="products"  element={<ProductsPage />} />
        <Route path="pos"       element={<POSPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="reports"   element={<ReportsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
