// ============================================
// FILE: App.tsx
// MÔ TẢ: Component chính của ứng dụng React, định nghĩa routing và theme
// CHỨC NĂNG: Khởi tạo Router, Theme, AuthProvider và các routes (public, protected, admin)
// ============================================

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // React Router
import { ThemeProvider, createTheme } from '@mui/material/styles'; // Material-UI Theme
import CssBaseline from '@mui/material/CssBaseline'; // Material-UI CssBaseline (reset CSS)
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Context quản lý authentication
import Layout from './components/Layout'; // Layout component (header, footer, sidebar)
import Login from './pages/Login'; // Trang đăng nhập
import Register from './pages/Register'; // Trang đăng ký
import Dashboard from './pages/Dashboard'; // Trang dashboard
import Quizzes from './pages/Quizzes'; // Trang quản lý bài thi
import Questions from './pages/Questions'; // Trang quản lý câu hỏi
import Profile from './pages/Profile'; // Trang profile
import QuizTaking from './pages/QuizTaking'; // Trang làm bài thi
import Home from './pages/Home'; // Trang chủ (public)
import ForgotPassword from './pages/ForgotPassword'; // Trang quên mật khẩu
import Results from './pages/Results'; // Trang xem kết quả
import Users from './pages/Users'; // Trang quản lý users (Admin)

// ============================================
// MATERIAL-UI THEME - Cấu hình giao diện
// ============================================
/**
 * Theme configuration cho Material-UI
 * - Định nghĩa màu sắc (primary, secondary, success, warning, error, info)
 * - Cấu hình typography (font, font-weight)
 * - Custom component styles (Button, Card, TextField, Chip)
 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

// ============================================
// PROTECTED ROUTE - Route yêu cầu đăng nhập
// ============================================
/**
 * Component bảo vệ route - chỉ cho phép user đã đăng nhập truy cập
 * - Nếu đang loading, hiển thị "Loading..."
 * - Nếu chưa đăng nhập, redirect về /login
 * - Nếu đã đăng nhập, cho phép truy cập
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  // Hiển thị loading khi đang kiểm tra authentication
  if (loading) {
    return <div>Loading...</div>;
  }

  // Nếu có user, cho phép truy cập; ngược lại redirect về login
  return user ? <>{children}</> : <Navigate to="/login" />;
};

// ============================================
// PUBLIC ROUTE - Route công khai (không cho phép đã đăng nhập)
// ============================================
/**
 * Component route công khai - chỉ cho phép user chưa đăng nhập truy cập
 * - Nếu đang loading, hiển thị "Loading..."
 * - Nếu đã đăng nhập, redirect về /dashboard
 * - Nếu chưa đăng nhập, cho phép truy cập (login, register, forgot password)
 */
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  // Hiển thị loading khi đang kiểm tra authentication
  if (loading) {
    return <div>Loading...</div>;
  }

  // Nếu đã đăng nhập, redirect về dashboard; ngược lại cho phép truy cập
  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};

// ============================================
// ADMIN ROUTE - Route chỉ dành cho Admin
// ============================================
/**
 * Component route chỉ dành cho Admin
 * - Nếu đang loading, hiển thị "Loading..."
 * - Nếu chưa đăng nhập, redirect về /login
 * - Nếu không phải admin, redirect về /dashboard
 * - Chỉ admin mới được truy cập
 */
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>; // Đang kiểm tra
  if (!user) return <Navigate to="/login" />; // Chưa đăng nhập
  if (user.role !== 'admin') return <Navigate to="/dashboard" />; // Không phải admin
  
  return <>{children}</>; // Cho phép admin truy cập
};

// ============================================
// APP COMPONENT - Component chính
// ============================================
/**
 * Component App - Entry point của ứng dụng React
 * - Wrap toàn bộ app với ThemeProvider (Material-UI theme)
 * - Wrap với AuthProvider (quản lý authentication state)
 * - Định nghĩa tất cả routes của ứng dụng
 */
function App() {
  return (
    // ThemeProvider: Áp dụng Material-UI theme cho toàn bộ app
    <ThemeProvider theme={theme}>
      {/* CssBaseline: Reset CSS và normalize styles */}
      <CssBaseline />
      
      {/* AuthProvider: Cung cấp authentication context cho toàn bộ app */}
      <AuthProvider>
        {/* Router: React Router để điều hướng giữa các trang */}
        <Router>
          <Routes>
            {/* ============================================
                PUBLIC ROUTES - Không cần đăng nhập
                ============================================ */}
            
            {/* Trang đăng nhập */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            
            {/* Trang quên mật khẩu */}
            <Route 
              path="/forgot" 
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } 
            />
            
            {/* Trang đăng ký */}
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />
            
            {/* Trang chủ (public) */}
            <Route path="/" element={<Home />} />
            
            {/* ============================================
                PROTECTED ROUTES - Cần đăng nhập
                ============================================ */}
            
            {/* Trang dashboard (tùy role hiển thị khác nhau) */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Trang quản lý bài thi */}
            <Route 
              path="/quizzes" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Quizzes />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Trang quản lý câu hỏi */}
            <Route 
              path="/questions" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Questions />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Trang profile */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Trang làm bài thi */}
            {/* :quizId - ID bài thi, :assignmentId? - ID assignment (optional) */}
            <Route 
              path="/quiz/:quizId/:assignmentId?" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <QuizTaking />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Trang xem kết quả */}
            <Route 
              path="/results" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Results />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Trang Exams (chưa implement) */}
            <Route 
              path="/exams" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <div>Exams Page - Coming Soon</div>
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* ============================================
                ADMIN ROUTES - Chỉ Admin mới có quyền
                ============================================ */}
            
            {/* Trang quản lý users (chỉ Admin) */}
            <Route 
              path="/users" 
              element={
                <AdminRoute>
                  <Layout>
                    <Users />
                  </Layout>
                </AdminRoute>
              } 
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;