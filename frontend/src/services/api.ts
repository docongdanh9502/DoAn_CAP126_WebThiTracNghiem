import axios from 'axios';
import { ApiResponse, User, Question, Quiz } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

  getMe: () => api.get<ApiResponse<{ user: User }>>('/auth/me'),

  logout: () => api.post<ApiResponse<null>>('/auth/logout'),
};

// User API
export const userAPI = {
  getUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) => api.get<ApiResponse<{ users: User[]; pagination: any }>>('/users', { params }),

  getUser: (id: string) => api.get<ApiResponse<{ user: User }>>(`/users/${id}`),

  updateUser: (id: string, data: { profile?: any; isActive?: boolean }) =>
    api.put<ApiResponse<{ user: User }>>(`/users/${id}`, data),

  deleteUser: (id: string) => api.delete<ApiResponse<null>>(`/users/${id}`),

  getUserStats: () => api.get<ApiResponse<any>>('/users/stats'),
};

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

  getMyResultsSummary: () =>
    api.get<ApiResponse<{ totalResults: number }>>('/quiz-results/summary/my'),
};

export default api;