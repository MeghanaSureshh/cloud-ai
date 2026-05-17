import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ChatApp from './components/ChatApp';
import Login from './components/Login';
import Signup from './components/Signup';
import CustomCursor from './components/CustomCursor';
import RippleEffect from './components/RippleEffect';
import './App.css';
import './styles/animations.css';
import './styles/creative-animations.css';

// Redirect to /chat if already logged in
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading"><span className="btn-spinner" /></div>;
  return user ? <Navigate to="/chat" replace /> : children;
};

// Redirect to /login if not logged in
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading"><span className="btn-spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/chat" element={<PrivateRoute><ChatApp /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomCursor />
        <RippleEffect />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
