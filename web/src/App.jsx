import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { PageLoader } from './components/ui';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';

const Listings = lazy(() => import('./pages/Listings'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const Favorites = lazy(() => import('./pages/Favorites'));
const PostProperty = lazy(() => import('./pages/PostProperty'));
const MyListings = lazy(() => import('./pages/account/MyListings'));
const Inquiries = lazy(() => import('./pages/account/Inquiries'));
const UnlockedContacts = lazy(() => import('./pages/account/UnlockedContacts'));
const CreditsBilling = lazy(() => import('./pages/account/CreditsBilling'));
const Profile = lazy(() => import('./pages/account/Profile'));
const AgentProfile = lazy(() => import('./pages/AgentProfile'));
const Admin = lazy(() => import('./pages/admin/Admin'));
const EmiPage = lazy(() => import('./pages/EmiPage'));
const Static = lazy(() => import('./pages/Static'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RequireAuth({ children, roles }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="properties" element={<Listings />} />
          <Route path="property/:slug" element={<PropertyDetail />} />
          <Route path="agents/:id" element={<AgentProfile />} />
          <Route path="emi-calculator" element={<EmiPage />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="about" element={<Static page="about" />} />
          <Route path="contact" element={<Static page="contact" />} />
          <Route path="privacy" element={<Static page="privacy" />} />
          <Route path="terms" element={<Static page="terms" />} />
          <Route path="refund-policy" element={<Static page="refund" />} />

          <Route path="favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
          <Route path="post-property" element={<RequireAuth><PostProperty /></RequireAuth>} />
          <Route path="edit-property/:id" element={<RequireAuth><PostProperty /></RequireAuth>} />
          <Route path="account">
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="listings" element={<RequireAuth roles={['agent', 'admin']}><MyListings /></RequireAuth>} />
            <Route path="inquiries" element={<RequireAuth><Inquiries /></RequireAuth>} />
            <Route path="unlocked" element={<RequireAuth><UnlockedContacts /></RequireAuth>} />
            <Route path="credits" element={<RequireAuth><CreditsBilling /></RequireAuth>} />
          </Route>
          <Route path="admin" element={<RequireAuth roles={['admin']}><Admin /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
