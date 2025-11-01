// ============================================
// FILE: ForgotPassword.tsx
// MÔ TẢ: Trang quên mật khẩu - Reset password với OTP
// CHỨC NĂNG: 2 bước: 1) Nhập email/username để nhận OTP, 2) Nhập OTP và mật khẩu mới
// ============================================

import React, { useState } from 'react'; // React hooks
import { useNavigate } from 'react-router-dom'; // React Router navigation
import { Container, Paper, Typography, Box, TextField, Button, Alert, CircularProgress, Stack } from '@mui/material';
import { authAPI } from '../services/api'; // API service

/**
 * Component ForgotPassword - Trang quên mật khẩu
 * - Step 1: Nhập email hoặc username, gửi OTP
 * - Step 2: Nhập OTP và mật khẩu mới, reset password
 * - Tự động redirect về login sau khi thành công
 */
const ForgotPassword: React.FC = () => {
  // Hook để điều hướng
  const navigate = useNavigate();
  
  // State quản lý email hoặc username (identifier)
  const [identifier, setIdentifier] = useState(''); // email or username
  
  // State quản lý mã OTP
  const [otp, setOtp] = useState('');
  
  // State quản lý mật khẩu mới
  const [newPassword, setNewPassword] = useState('');
  
  // State quản lý bước hiện tại (1: gửi OTP, 2: nhập OTP và reset)
  const [step, setStep] = useState<1 | 2>(1);
  
  // State quản lý trạng thái loading
  const [loading, setLoading] = useState(false);
  
  // State quản lý thông báo thành công
  const [message, setMessage] = useState<string | null>(null);
  
  // State quản lý thông báo lỗi
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // SEND OTP - Gửi mã OTP
  // ============================================
  /**
   * Function gửi OTP đến email của user
   * - Phân biệt email hay username (kiểm tra có '@')
   * - Gọi API requestPasswordReset
   * - Chuyển sang step 2 nếu thành công
   */
  const sendOtp = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const payload: any = identifier.includes('@') ? { email: identifier } : { username: identifier };
      await authAPI.requestPasswordReset(payload);
      setMessage('Đã gửi mã OTP tới email của bạn. Vui lòng kiểm tra hộp thư.');
      // Reset fields to avoid any prefill/autofill
      setOtp('');
      setNewPassword('');
      setStep(2);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Không thể gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RESET PASSWORD - Reset mật khẩu với OTP
  // ============================================
  /**
   * Function reset mật khẩu với OTP
   * - Validate OTP và mật khẩu mới
   * - Gọi API resetPasswordWithOtp
   * - Redirect về login sau 2 giây nếu thành công
   */
  const resetPassword = async () => {
    try {
      if (!otp || !newPassword) {
        setError('Vui lòng nhập đầy đủ OTP và mật khẩu mới');
        return;
      }
      setLoading(true);
      setError(null);
      setMessage(null);
      const payload: any = identifier.includes('@') ? { email: identifier } : { username: identifier };
      payload.otp = otp;
      payload.newPassword = newPassword;
      await authAPI.resetPasswordWithOtp(payload);
      setMessage('Đặt lại mật khẩu thành công. Đang chuyển về trang đăng nhập...');
      
      // Redirect về trang đăng nhập sau 2 giây
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" align="center" gutterBottom>Quên mật khẩu</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

          {step === 1 && (
            <Stack spacing={2}>
              <TextField label="Email hoặc Tên đăng nhập" value={identifier} onChange={(e) => setIdentifier(e.target.value)} fullWidth />
              <Button variant="contained" onClick={sendOtp} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Gửi mã OTP'}
              </Button>
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={2}>
              <TextField label="Mã OTP" value={otp} onChange={(e) => setOtp(e.target.value)} fullWidth inputProps={{ autoComplete: 'one-time-code' }} />
              <TextField label="Mật khẩu mới" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth inputProps={{ autoComplete: 'new-password' }} />
              <Button variant="contained" onClick={resetPassword} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Đặt lại mật khẩu'}
              </Button>
            </Stack>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;


