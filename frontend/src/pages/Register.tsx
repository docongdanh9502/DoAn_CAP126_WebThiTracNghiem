// ============================================
// FILE: Register.tsx
// MÔ TẢ: Trang đăng ký tài khoản
// CHỨC NĂNG: Form đăng ký với các fields khác nhau tùy role (student/teacher), validate và gọi API đăng ký
// ============================================

import React, { useState } from 'react'; // React hooks
import { useNavigate } from 'react-router-dom'; // React Router navigation
import {
  Container,          // Container component
  Paper,              // Paper component
  TextField,          // Input field component
  Button,             // Button component
  Typography,         // Typography component
  Box,               // Box component
  Alert,              // Alert component
  CircularProgress,   // Loading spinner
  FormControl,        // Form control component
  InputLabel,         // Input label
  Select,             // Select dropdown
  MenuItem,           // Select option item
  SelectChangeEvent,  // Select change event type
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext'; // Authentication context

/**
 * Component Register - Trang đăng ký
 * - Form đăng ký với các fields: email, password, role, username
 * - Nếu role = 'student': thêm studentId, fullName, class, gender
 * - Nếu role = 'teacher': thêm fullName
 * - Validate password (phải khớp, tối thiểu 6 ký tự)
 * - Gọi register API và redirect về dashboard khi thành công
 */
const Register: React.FC = () => {
  // State quản lý dữ liệu form
  const [formData, setFormData] = useState({
    email: '',            // Email
    password: '',         // Mật khẩu
    confirmPassword: '',  // Xác nhận mật khẩu
    role: 'student',      // Vai trò (student hoặc teacher)
    username: '',         // Tên đăng nhập
    // Các fields chỉ dành cho student
    studentId: '',        // MSSV
    fullName: '',         // Họ và tên
    class: '',           // Lớp học
    gender: 'male',      // Giới tính
  });
  
  // State quản lý thông báo lỗi
  const [error, setError] = useState('');
  
  // State quản lý trạng thái loading
  const [loading, setLoading] = useState(false);
  
  // Lấy function register từ AuthContext
  const { register } = useAuth();
  
  // Hook để điều hướng
  const navigate = useNavigate();

  // ============================================
  // HANDLE CHANGE - Xử lý thay đổi input field
  // ============================================
  /**
   * Function xử lý khi thay đổi giá trị trong TextField
   * - Cập nhật formData state với giá trị mới
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value, // Cập nhật field tương ứng với name
    });
  };

  // ============================================
  // HANDLE SELECT CHANGE - Xử lý thay đổi Select dropdown
  // ============================================
  /**
   * Function xử lý khi thay đổi giá trị trong Select dropdown
   * - Cập nhật formData state với giá trị mới
   */
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value, // Cập nhật field tương ứng với name
    });
  };

  // ============================================
  // HANDLE SUBMIT - Xử lý submit form đăng ký
  // ============================================
  /**
   * Function xử lý khi submit form đăng ký
   * - Validate password (phải khớp và >= 6 ký tự)
   * - Validate required fields theo role
   * - Gọi register API
   * - Redirect về dashboard nếu thành công
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Ngăn form submit mặc định
    setError('');       // Xóa lỗi cũ

    // Validate password phải khớp
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    // Validate độ dài password (tối thiểu 6 ký tự)
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        username: formData.username,
        fullName: formData.fullName,
      };
      // Include gender for both roles if provided
      if (formData.gender) {
        payload.gender = formData.gender;
      }
      if (formData.role === 'student') {
        // Basic client-side required checks for student
        if (!formData.studentId || !formData.fullName || !formData.class || !formData.gender) {
          setError('Vui lòng điền đầy đủ thông tin sinh viên');
          setLoading(false);
          return;
        }
        Object.assign(payload, {
          studentId: formData.studentId,
          fullName: formData.fullName,
          class: formData.class,
          gender: formData.gender,
        });
      } else if (formData.role === 'teacher') {
        if (!formData.fullName) {
          setError('Vui lòng nhập Họ và tên');
          setLoading(false);
          return;
        }
      }
      await register(payload);
      navigate('/dashboard');
    } catch (err: any) {
      const apiMsg = err?.response?.data?.errors?.[0]?.msg
        || err?.response?.data?.message
        || err?.message;
      setError(apiMsg || 'Đăng ký thất bại');
    } finally {
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
            Đăng ký tài khoản
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
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="username"
              label="Tên đăng nhập"
              id="username"
              value={formData.username}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="fullName"
              label="Họ và tên"
              id="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-label">Vai trò</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formData.role}
                label="Vai trò"
                onChange={handleSelectChange}
              >
                <MenuItem value="student">Sinh viên</MenuItem>
                <MenuItem value="teacher">Giáo viên</MenuItem>
              </Select>
            </FormControl>
        {formData.role === 'student' && (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              name="studentId"
              label="Mã số sinh viên"
              id="studentId"
              value={formData.studentId}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="class"
              label="Lớp"
              id="class"
              value={formData.class}
              onChange={handleChange}
            />
          </>
        )}

        {/* Giới tính: hiển thị cho cả giáo viên và sinh viên; bắt buộc với sinh viên */}
        <FormControl fullWidth margin="normal">
          <InputLabel id="gender-label">Giới tính</InputLabel>
          <Select
            labelId="gender-label"
            id="gender"
            name="gender"
            value={formData.gender}
            label="Giới tính"
            onChange={handleSelectChange}
          >
            <MenuItem value="male">Nam</MenuItem>
            <MenuItem value="female">Nữ</MenuItem>
            <MenuItem value="other">Khác</MenuItem>
          </Select>
        </FormControl>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Đăng ký'}
            </Button>
            
            <Box textAlign="center">
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ mt: 1 }}
              >
                Đã có tài khoản? Đăng nhập ngay
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;