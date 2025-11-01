// ============================================
// FILE: Login.tsx
// MÔ TẢ: Trang đăng nhập
// CHỨC NĂNG: Form đăng nhập với username và password, redirect về dashboard sau khi đăng nhập thành công
// ============================================

import React, { useState } from 'react'; // React hooks
import { useNavigate } from 'react-router-dom'; // React Router navigation
import {
  Container,        // Container component (Material-UI)
  Paper,           // Paper component (card-like container)
  TextField,       // Input field component
  Button,          // Button component
  Typography,      // Typography component
  Box,             // Box component (flexbox container)
  Alert,           // Alert component (hiển thị lỗi)
  CircularProgress, // Loading spinner
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext'; // Hook để truy cập authentication context

/**
 * Component Login - Trang đăng nhập
 * - Form đăng nhập với username và password
 * - Validate input và hiển thị lỗi
 * - Gọi login API và redirect về dashboard khi thành công
 */
const Login: React.FC = () => {
  // State quản lý username
  const [username, setUsername] = useState('');
  
  // State quản lý password
  const [password, setPassword] = useState('');
  
  // State quản lý thông báo lỗi
  const [error, setError] = useState('');
  
  // State quản lý trạng thái loading
  const [loading, setLoading] = useState(false);
  
  // Lấy function login từ AuthContext
  const { login } = useAuth();
  
  // Hook để điều hướng (navigate)
  const navigate = useNavigate();

  // ============================================
  // HANDLE SUBMIT - Xử lý submit form đăng nhập
  // ============================================
  /**
   * Function xử lý khi submit form đăng nhập
   * - Ngăn default form submission
   * - Gọi login API với username và password
   * - Redirect về /dashboard nếu thành công
   * - Hiển thị lỗi nếu thất bại
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn form submit mặc định (reload page)
    setError('');       // Xóa lỗi cũ
    setLoading(true);   // Bắt đầu loading

    try {
      // Gọi login API từ AuthContext
      await login(username, password);
      
      // Nếu thành công, redirect về dashboard
      navigate('/dashboard');
    } catch (err: any) {
      // Nếu lỗi, hiển thị thông báo lỗi từ server hoặc message mặc định
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      // Tắt loading dù thành công hay thất bại
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Đăng nhập
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Tên đăng nhập"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Đăng nhập'}
            </Button>
            
            <Box textAlign="center">
              <Button
                variant="text"
                onClick={() => navigate('/register')}
                sx={{ mt: 1 }}
              >
                Chưa có tài khoản? Đăng ký ngay
              </Button>
              <Button
                variant="text"
                onClick={() => navigate('/forgot')}
                sx={{ mt: 1 }}
              >
                Quên mật khẩu?
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;