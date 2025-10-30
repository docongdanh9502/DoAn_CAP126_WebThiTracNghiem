import React, { useState } from 'react';
import { Container, Paper, Typography, Box, TextField, Button, Alert, CircularProgress, Stack } from '@mui/material';
import { authAPI } from '../services/api';

const ForgotPassword: React.FC = () => {
  const [identifier, setIdentifier] = useState(''); // email or username
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.');
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


