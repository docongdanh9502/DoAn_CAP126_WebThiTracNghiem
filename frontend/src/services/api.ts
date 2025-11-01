// ============================================
// FILE: api.ts
// MÔ TẢ: Centralized API service - tập trung tất cả API calls
// CHỨC NĂNG: Định nghĩa axios instance, interceptors, và các API functions cho từng module
// ============================================

import axios from 'axios'; // Thư viện HTTP client
import { ApiResponse, User, Question, Quiz } from '../types'; // Type definitions

// Base URL của backend API (đọc từ biến môi trường hoặc mặc định localhost:5000)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ============================================
// AXIOS INSTANCE - Tạo axios instance với base config
// ============================================
/**
 * Tạo axios instance với base URL và default headers
 * - baseURL: URL của backend API
 * - headers: Content-Type là JSON
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json', // Mặc định gửi JSON
  },
});

// ============================================
// REQUEST INTERCEPTOR - Thêm JWT token vào header
// ============================================
/**
 * Interceptor tự động thêm JWT token vào request header
 * - Đọc token từ localStorage
 * - Thêm vào header Authorization với format "Bearer <token>"
 * - Chạy trước mỗi request
 */
api.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage
    const token = localStorage.getItem('token');
    if (token) {
      // Thêm token vào header Authorization
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR - Xử lý lỗi 401 (Unauthorized)
// ============================================
/**
 * Interceptor xử lý response errors
 * - Nếu gặp lỗi 401 (Unauthorized), token đã hết hạn hoặc không hợp lệ
 * - Tự động xóa token và user khỏi localStorage
 * - Redirect về trang login
 */
api.interceptors.response.use(
  (response) => response, // Trả về response nếu thành công
  (error) => {
    // Nếu lỗi 401 (Unauthorized), token không hợp lệ
    if (error.response?.status === 401) {
      // Xóa token và user khỏi localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect về trang login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API - Authentication endpoints
// ============================================
/**
 * Các API calls cho authentication
 * - register: Đăng ký user mới
 * - login: Đăng nhập
 * - requestPasswordReset: Yêu cầu OTP reset mật khẩu (public)
 * - resetPasswordWithOtp: Reset mật khẩu với OTP (public)
 * - requestChangePasswordOtp: Yêu cầu OTP đổi mật khẩu (private)
 * - changePasswordWithOtp: Đổi mật khẩu với OTP (private)
 * - getMe: Lấy thông tin user hiện tại
 * - logout: Đăng xuất
 */
// Auth API
export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    role: string;
    username: string;
  }) => api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', data),

  login: (data: { username: string; password: string }) =>
    api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data),

  requestPasswordReset: (data: { email?: string; username?: string }) =>
    api.post<ApiResponse<null>>('/auth/forgot', data),

  resetPasswordWithOtp: (data: { email?: string; username?: string; otp: string; newPassword: string }) =>
    api.post<ApiResponse<null>>('/auth/reset', data),

  requestChangePasswordOtp: () => api.post<ApiResponse<null>>('/auth/change-password/request-otp'),

  changePasswordWithOtp: (data: { currentPassword: string; otp: string; newPassword: string }) =>
    api.post<ApiResponse<null>>('/auth/change-password', data),

  getMe: () => api.get<ApiResponse<{ user: User }>>('/auth/me'),

  logout: () => api.post<ApiResponse<null>>('/auth/logout'),
};

// ============================================
// USER API - User management endpoints (Admin)
// ============================================
/**
 * Các API calls cho quản lý users (chỉ Admin)
 * - getUsers: Lấy danh sách users (có pagination, search, filter)
 * - getUser: Lấy chi tiết một user
 * - createUser: Tạo user mới
 * - updateUser: Cập nhật user (Admin hoặc Self)
 * - deleteUser: Xóa user
 */
// User API
export const userAPI = {
  getUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) => api.get<ApiResponse<{ users: User[]; pagination: any }>>('/users', { params }),

  getUser: (id: string) => api.get<ApiResponse<{ user: User }>>(`/users/${id}`),

  createUser: (data: {
    email: string;
    username: string;
    password: string;
    role: 'admin' | 'teacher' | 'student';
    fullName?: string;
    studentId?: string;
    class?: string;
    gender?: 'male' | 'female' | 'other';
    isActive?: boolean;
  }) => api.post<ApiResponse<{ user: User }>>('/users', data),

  updateUser: (id: string, data: { profile?: any; isActive?: boolean }) =>
    api.put<ApiResponse<{ user: User }>>(`/users/${id}`, data),

  deleteUser: (id: string) => api.delete<ApiResponse<null>>(`/users/${id}`),
};

// ============================================
// QUESTION API - Question management endpoints
// ============================================
/**
 * Các API calls cho quản lý questions (Teacher/Admin)
 * - getQuestions: Lấy danh sách questions (có pagination, filter)
 * - getQuestion: Lấy chi tiết một question
 * - createQuestion: Tạo question mới
 * - updateQuestion: Cập nhật question
 * - deleteQuestion: Xóa question
 * - getQuestionStats: Lấy thống kê questions
 */
// Question API
export const questionAPI = {
  getQuestions: (params?: {
    page?: number;
    limit?: number;
    subject?: string;
    difficulty?: string;
    search?: string;
  }) => api.get<ApiResponse<{ questions: Question[]; pagination: any }>>('/questions', { params }),

  getQuestion: (id: string) => api.get<ApiResponse<{ question: Question }>>(`/questions/${id}`),

  createQuestion: (data: {
    text: string;
    options: string[];
    correctAnswer: number;
    subject: string;
    difficulty: string;
  }) => api.post<ApiResponse<{ question: Question }>>('/questions', data),

  updateQuestion: (id: string, data: any) =>
    api.put<ApiResponse<{ question: Question }>>(`/questions/${id}`, data),

  deleteQuestion: (id: string) => api.delete<ApiResponse<null>>(`/questions/${id}`),

  getQuestionStats: () => api.get<ApiResponse<any>>('/questions/stats'),
};

// ============================================
// QUIZ API - Quiz management endpoints
// ============================================
/**
 * Các API calls cho quản lý quizzes và assignments (Teacher/Admin/Student)
 * - getQuizzes: Lấy danh sách quizzes (Teacher/Admin)
 * - getQuiz: Lấy chi tiết một quiz
 * - createQuiz: Tạo quiz mới
 * - updateQuiz: Cập nhật quiz
 * - deleteQuiz: Xóa quiz
 * - getAssignedQuizzes: Lấy danh sách bài thi được giao (Student)
 * - assignQuiz: Giao bài thi cho sinh viên (Teacher)
 * - getAssignments: Lấy danh sách assignments đã giao (Teacher)
 */
// Quiz API
export const quizAPI = {
  getQuizzes: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => api.get<ApiResponse<{ quizzes: Quiz[]; pagination: any }>>('/quizzes', { params }),

  getQuiz: (id: string) => api.get<ApiResponse<{ quiz: Quiz }>>(`/quizzes/${id}`),

  createQuiz: (data: {
    title: string;
    description: string;
    subject: string;
    timeLimit: number;
    questions: string[];
  }) => api.post<ApiResponse<{ quiz: Quiz }>>('/quizzes', data),

  updateQuiz: (id: string, data: {
    title: string;
    description: string;
    subject: string;
    timeLimit: number;
    questions: string[];
  }) => api.put<ApiResponse<{ quiz: Quiz }>>(`/quizzes/${id}`, data),

  deleteQuiz: (id: string) => api.delete<ApiResponse<null>>(`/quizzes/${id}`),

  // Assignment API
  getAssignedQuizzes: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => api.get<ApiResponse<{ assignments: any[]; pagination: any }>>('/assignments/assigned-to-me', { params }),

  assignQuiz: (data: {
    quizId: string;
    assignedTo: string[];
    dueDate: string;
  }) => api.post<ApiResponse<{ assignment: any }>>('/assignments', data),

  getAssignments: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => api.get<ApiResponse<{ assignments: any[]; pagination: any }>>('/assignments', { params }),
};

// ============================================
// QUIZ RESULT API - Quiz result endpoints
// ============================================
/**
 * Các API calls cho quiz results
 * - checkQuizCompletion: Kiểm tra đã làm bài thi chưa
 * - submitQuizResult: Nộp kết quả bài thi
 * - getStudentQuizResults: Lấy kết quả của sinh viên (Student)
 * - getQuizResults: Lấy kết quả một bài thi (Teacher - có filter)
 * - exportQuizResultsToExcel: Xuất kết quả ra Excel (Teacher)
 * - getMyResultsSummary: Lấy tổng kết kết quả của tôi
 */
// Quiz Result API
export const quizResultAPI = {
  checkQuizCompletion: (quizId: string, assignmentId?: string) => {
    const url = assignmentId 
      ? `/quiz-results/${quizId}/check?assignmentId=${assignmentId}`
      : `/quiz-results/${quizId}/check`;
    return api.get<ApiResponse<{ completed: boolean; result?: any }>>(url);
  },

  submitQuizResult: (data: {
    quizId: string;
    answers: number[];
    timeSpent: number;
    assignmentId?: string;
  }) => api.post<ApiResponse<{ result: any }>>('/quiz-results', data),

  getStudentQuizResults: (params?: { page?: number; limit?: number; quizId?: string; minScore?: number; maxScore?: number }) => 
    api.get<ApiResponse<{ results: any[]; pagination: any }>>('/quiz-results', { params }),

  getQuizResults: (quizId: string, params?: { page?: number; limit?: number; search?: string; className?: string; gender?: string; minScore?: number; maxScore?: number }) => 
    api.get<ApiResponse<{ results: any[]; pagination: any }>>(`/quiz-results/quiz/${quizId}`, { params }),

  exportQuizResultsToExcel: (quizId: string, params?: { search?: string; className?: string; gender?: string; minScore?: number; maxScore?: number }) => {
    const token = localStorage.getItem('token');
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.className) queryParams.append('className', params.className);
    if (params?.gender) queryParams.append('gender', params.gender);
    if (params?.minScore !== undefined) queryParams.append('minScore', params.minScore.toString());
    if (params?.maxScore !== undefined) queryParams.append('maxScore', params.maxScore.toString());
    
    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/quiz-results/quiz/${quizId}/export${queryString ? '?' + queryString : ''}`;
    
    return fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export Excel');
      return res.blob();
    });
  },

  getMyResultsSummary: () =>
    api.get<ApiResponse<{ totalResults: number }>>('/quiz-results/summary/my'),
};

// ============================================
// IMPORT API - Excel import/export endpoints
// ============================================
/**
 * Các API calls cho import/export Excel
 * - downloadTemplate: Tải file mẫu Excel để import
 * - importExcel: Upload và import file Excel (tạo questions và quizzes)
 */
// Import API
export const importAPI = {
  downloadTemplate: () => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/import/template`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download template');
      return res.blob();
    });
  },

  importExcel: (file: File) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('excelFile', file);
    
    return fetch(`${API_BASE_URL}/import/excel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Import failed');
      }
      return data;
    });
  },
};

export default api;