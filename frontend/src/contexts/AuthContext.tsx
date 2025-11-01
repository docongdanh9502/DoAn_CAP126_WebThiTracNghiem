// ============================================
// FILE: AuthContext.tsx
// MÔ TẢ: Context API quản lý authentication state cho toàn bộ ứng dụng
// CHỨC NĂNG: Lưu trữ user, token; cung cấp functions login, register, logout, refreshUser
// ============================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types'; // Type định nghĩa User
import { authAPI } from '../services/api'; // API calls cho authentication

// ============================================
// AUTH CONTEXT TYPE - Định nghĩa interface cho context
// ============================================
/**
 * Interface định nghĩa các giá trị và functions được cung cấp bởi AuthContext
 */
interface AuthContextType {
  user: User | null;              // Thông tin user hiện tại (null nếu chưa đăng nhập)
  token: string | null;           // JWT token (null nếu chưa đăng nhập)
  login: (username: string, password: string) => Promise<void>; // Function đăng nhập
  register: (data: any) => Promise<void>; // Function đăng ký
  logout: () => void;             // Function đăng xuất
  loading: boolean;               // Trạng thái đang load (kiểm tra token từ localStorage)
  refreshUser: () => Promise<void>; // Function refresh thông tin user từ server
}

// ============================================
// CREATE CONTEXT - Tạo AuthContext
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// USE AUTH HOOK - Hook để sử dụng AuthContext
// ============================================
/**
 * Custom hook để truy cập AuthContext
 * @returns AuthContextType
 * @throws Error nếu được sử dụng bên ngoài AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ============================================
// AUTH PROVIDER PROPS - Props cho AuthProvider
// ============================================
interface AuthProviderProps {
  children: ReactNode; // Các components con
}

// ============================================
// AUTH PROVIDER - Component cung cấp AuthContext
// ============================================
/**
 * Component Provider cung cấp authentication state cho toàn bộ app
 * - Quản lý user state và token state
 * - Lưu token và user vào localStorage để persist qua refresh
 * - Cung cấp các functions: login, register, logout, refreshUser
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State quản lý user hiện tại
  const [user, setUser] = useState<User | null>(null);
  
  // State quản lý JWT token
  const [token, setToken] = useState<string | null>(null);
  
  // State đang load (kiểm tra token từ localStorage khi app khởi động)
  const [loading, setLoading] = useState(true);

  // ============================================
  // INITIALIZE AUTH - Khởi tạo auth state từ localStorage
  // ============================================
  /**
   * useEffect chạy khi component mount
   * - Đọc token và user từ localStorage (nếu có)
   * - Khôi phục session khi user refresh trang
   * - Normalize _id field để đảm bảo tương thích
   */
  useEffect(() => {
    // Lấy token và user từ localStorage (nếu có)
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    // Nếu có token và user, khôi phục session
    if (storedToken && storedUser) {
      setToken(storedToken);
      const parsed = JSON.parse(storedUser);
      
      // Normalize _id (đảm bảo có _id field, có thể từ id hoặc _id)
      const normalized = { ...parsed, _id: parsed._id || parsed.id };
      setUser(normalized);
      
      // Cập nhật lại localStorage nếu cần normalize
      if (!parsed._id && parsed.id) {
        localStorage.setItem('user', JSON.stringify(normalized));
      }
    }
    
    // Đánh dấu đã hoàn tất kiểm tra
    setLoading(false);
  }, []);

  // ============================================
  // LOGIN FUNCTION - Đăng nhập
  // ============================================
  /**
   * Function đăng nhập user
   * @param username - Username hoặc email
   * @param password - Mật khẩu
   * @throws Error nếu đăng nhập thất bại
   */
  const login = async (username: string, password: string) => {
    try {
      // Gọi API đăng nhập
      const response = await authAPI.login({ username, password });
      const { user: userData, token: userToken } = response.data.data!;
      
      // Normalize user object (đảm bảo có _id field)
      const normalizedUser = { ...userData, _id: (userData as any).id || (userData as any)._id } as User;
      
      // Cập nhật state
      setUser(normalizedUser);
      setToken(userToken);
      
      // Lưu vào localStorage để persist qua refresh
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    } catch (error) {
      throw error;
    }
  };

  // ============================================
  // REGISTER FUNCTION - Đăng ký
  // ============================================
  /**
   * Function đăng ký user mới
   * @param data - Dữ liệu đăng ký (email, password, role, username, etc.)
   * @throws Error nếu đăng ký thất bại
   */
  const register = async (data: any) => {
    try {
      // Gọi API đăng ký
      const response = await authAPI.register(data);
      const { user: userData, token: userToken } = response.data.data!;
      
      // Normalize user object
      const normalizedUser = { ...userData, _id: (userData as any).id || (userData as any)._id } as User;
      
      // Cập nhật state
      setUser(normalizedUser);
      setToken(userToken);
      
      // Lưu vào localStorage
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    } catch (error) {
      throw error;
    }
  };

  // ============================================
  // LOGOUT FUNCTION - Đăng xuất
  // ============================================
  /**
   * Function đăng xuất user
   * - Xóa user và token khỏi state
   * - Xóa token và user khỏi localStorage
   */
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // ============================================
  // REFRESH USER FUNCTION - Refresh thông tin user
  // ============================================
  /**
   * Function refresh thông tin user từ server
   * - Gọi API /auth/me để lấy thông tin user mới nhất
   * - Cập nhật state và localStorage
   * - Dùng khi cần cập nhật user info sau khi edit profile
   */
  const refreshUser = async () => {
    try {
      // Gọi API lấy thông tin user hiện tại
      const res = await authAPI.getMe();
      const fresh = res.data.data!.user as any;
      
      // Normalize user object
      const normalized = { ...fresh, _id: fresh._id || fresh.id } as User;
      
      // Cập nhật state và localStorage
      setUser(normalized);
      localStorage.setItem('user', JSON.stringify(normalized));
    } catch (e) {
      // Bỏ qua lỗi, giữ nguyên state hiện tại
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};