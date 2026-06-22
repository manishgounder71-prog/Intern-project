import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStudyStore } from './store/useStudyStore';
import MainLayout from './components/MainLayout';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Library = lazy(() => import('./pages/Library'));
const StudyArena = lazy(() => import('./pages/StudyArena'));
const Analytics = lazy(() => import('./pages/Analytics'));

const PageLoader: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center space-y-4">
    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sm text-slate-400 font-medium animate-pulse">Loading StudyGen AI...</p>
  </div>
);

// Protected Route Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useStudyStore();
  if (!token) {
    return <Navigate to="/landing" replace />;
  }
  return <>{children}</>;
};

// Guest Route Guard (Redirect to dashboard if logged in)
const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useStudyStore();
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Guest Routes */}
          <Route 
            path="/landing" 
            element={
              <GuestRoute>
                <Landing />
              </GuestRoute>
            } 
          />
          <Route 
            path="/login" 
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            } 
          />

          {/* Protected Dashboard Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="arena" element={<StudyArena />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
