// ============================================
// FILE: types/index.ts
// MÔ TẢ: Type definitions cho toàn bộ frontend
// CHỨC NĂNG: Định nghĩa các interfaces và types cho User, Question, Quiz, Assignment, QuizResult, ApiResponse
// ============================================

// ============================================
// USER INTERFACE - Định nghĩa type cho User
// ============================================
/**
 * Interface định nghĩa cấu trúc dữ liệu User
 * - Bao gồm thông tin cơ bản (username, email, role)
 * - Thông tin profile (studentId, class, phone)
 * - Trạng thái (isActive, isVerified)
 */
export interface User {
  _id: string;                                    // ID của user
  username: string;                               // Tên đăng nhập
  email: string;                                  // Email
  role: 'admin' | 'teacher' | 'student';        // Vai trò (admin, giáo viên, sinh viên)
  isVerified: boolean;                           // Email đã xác thực chưa
  studentId?: string;                            // MSSV (chỉ cho sinh viên, optional)
  class?: string;                                // Lớp học (chỉ cho sinh viên, optional)
  phone?: string;                                // Số điện thoại (optional)
  isActive?: boolean;                            // Tài khoản có đang hoạt động không (optional)
  createdAt: string;                             // Ngày tạo
  updatedAt: string;                             // Ngày cập nhật cuối
}

// ============================================
// QUESTION INTERFACE - Định nghĩa type cho Question
// ============================================
/**
 * Interface định nghĩa cấu trúc dữ liệu Question (Câu hỏi)
 * - Nội dung câu hỏi (text)
 * - Các phương án trả lời (options - mảng string)
 * - Đáp án đúng (correctAnswer - index trong mảng options)
 * - Môn học (subject)
 * - Độ khó (difficulty)
 */
export interface Question {
  _id: string;                                    // ID của câu hỏi
  text: string;                                  // Nội dung câu hỏi
  options: string[];                             // Mảng các phương án trả lời (A, B, C, D)
  correctAnswer: number;                         // Index của đáp án đúng trong mảng options (0 = A, 1 = B, ...)
  subject: string;                               // Môn học (ví dụ: Toán học, Vật lý)
  difficulty: 'easy' | 'medium' | 'hard';      // Độ khó (dễ, trung bình, khó)
  createdBy: string;                             // ID của người tạo (giáo viên)
  createdAt: string;                             // Ngày tạo
  updatedAt: string;                             // Ngày cập nhật cuối
}

// ============================================
// QUIZ INTERFACE - Định nghĩa type cho Quiz
// ============================================
/**
 * Interface định nghĩa cấu trúc dữ liệu Quiz (Bài thi)
 * - Thông tin bài thi (title, description, subject)
 * - Thời gian làm bài (timeLimit - phút)
 * - Danh sách ID câu hỏi (questions - mảng string)
 * - Trạng thái (isActive)
 */
export interface Quiz {
  _id: string;                                    // ID của bài thi
  title: string;                                 // Tiêu đề bài thi
  description: string;                           // Mô tả bài thi
  subject: string;                               // Môn học
  timeLimit: number;                             // Thời gian làm bài (phút)
  questions: string[];                           // Mảng ID các câu hỏi (reference đến Question)
  isActive: boolean;                             // Bài thi có đang hoạt động không
  createdBy: string;                             // ID của người tạo (giáo viên)
  createdAt: string;                             // Ngày tạo
  updatedAt: string;                             // Ngày cập nhật cuối
}

// ============================================
// QUIZ WITH ASSIGNMENT INTERFACE - Quiz có thông tin assignment
// ============================================
/**
 * Interface mở rộng Quiz với thông tin assignment (khi sinh viên xem bài được giao)
 * - Bao gồm tất cả fields của Quiz
 * - Thêm assignmentInfo (hạn nộp, ngày giao, ID assignment)
 */
export interface QuizWithAssignment extends Quiz {
  assignmentInfo?: {                             // Thông tin assignment (optional)
    dueDate: string;                            // Hạn nộp bài
    assignedAt: string;                         // Ngày giao bài
    assignmentId: string;                       // ID của assignment
  };
}

// ============================================
// ASSIGNMENT INTERFACE - Định nghĩa type cho Assignment
// ============================================
/**
 * Interface định nghĩa cấu trúc dữ liệu Assignment (Giao bài thi)
 * - ID bài thi (quizId)
 * - Quiz object (populated)
 * - Danh sách email sinh viên được giao (assignedTo)
 * - ID giáo viên giao bài (assignedBy)
 * - Hạn nộp (dueDate)
 */
export interface Assignment {
  _id: string;                                    // ID của assignment
  quizId: string;                                // ID của bài thi
  quiz: Quiz;                                    // Quiz object (đã populate)
  assignedTo: string[];                          // Mảng email của các sinh viên được giao bài
  assignedBy: string;                            // ID của giáo viên giao bài
  dueDate: string;                              // Hạn nộp bài
  isActive: boolean;                             // Assignment có đang hoạt động không
  createdAt: string;                             // Ngày tạo
  updatedAt: string;                             // Ngày cập nhật cuối
}

// ============================================
// QUIZ RESULT INTERFACE - Định nghĩa type cho QuizResult
// ============================================
/**
 * Interface định nghĩa cấu trúc dữ liệu QuizResult (Kết quả bài thi)
 * - ID bài thi (quizId)
 * - ID sinh viên (studentId)
 * - Mảng câu trả lời (answers - mảng index)
 * - Điểm số (score)
 * - Thời gian làm bài (timeSpent - phút)
 */
export interface QuizResult {
  _id: string;                                    // ID của kết quả
  quizId: string;                                // ID của bài thi
  studentId: string;                             // ID của sinh viên
  answers: number[];                             // Mảng câu trả lời (index của đáp án đã chọn)
  score: number;                                 // Điểm số
  totalQuestions: number;                        // Tổng số câu hỏi
  timeSpent: number;                             // Thời gian làm bài (phút)
  completedAt: string;                           // Thời gian hoàn thành
  createdAt: string;                              // Ngày tạo
}

// ============================================
// API RESPONSE INTERFACE - Định nghĩa type cho API Response
// ============================================
/**
 * Generic interface cho tất cả API responses
 * - success: Thành công hay thất bại
 * - message: Thông báo (lỗi hoặc thành công)
 * - data: Dữ liệu trả về (generic type T)
 */
export interface ApiResponse<T> {
  success: boolean;                               // Thành công hay thất bại
  message: string;                               // Thông báo
  data: T;                                       // Dữ liệu trả về (generic type)
}