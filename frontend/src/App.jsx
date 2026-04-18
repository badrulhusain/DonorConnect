import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import BroadcastsPage from './pages/BroadcastsPage';
import CreateBroadcastPage from './pages/CreateBroadcastPage';
import BroadcastLogsPage from './pages/BroadcastLogsPage';
import Layout from './components/common/Layout';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <span className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
    </div>
  );
  return admin ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { admin, loading } = useAuth();
  if (loading) return null;
  return admin ? <Navigate to="/" replace /> : children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            success: { className: '!bg-green-50 !text-green-800 !border !border-green-200' },
            error: { className: '!bg-red-50 !text-red-800 !border !border-red-200' },
          }}
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="broadcasts" element={<BroadcastsPage />} />
            <Route path="broadcasts/new" element={<CreateBroadcastPage />} />
            <Route path="broadcasts/:id/logs" element={<BroadcastLogsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
