// ============================================
// FILE: quizController.ts
// MÔ TẢ: Controller xử lý CRUD operations cho Quiz (Bài thi)
// CHỨC NĂNG: Lấy danh sách, tạo, sửa, xóa bài thi
// ============================================

import { Request, Response } from 'express';     // Types từ Express
import Quiz from '../models/Quiz';                // Model Quiz

// ============================================
// GET QUIZZES - Lấy danh sách bài thi
// ============================================
/**
 * Lấy danh sách bài thi với pagination và filter
 * Route: GET /api/quizzes
 * Access: Private
 * 
 * Features:
 * - Pagination (page, limit)
 * - Tìm kiếm theo title, description, subject
 * - Teacher chỉ thấy bài thi của mình, Admin thấy tất cả
 * - Student không sử dụng endpoint này (dùng assignments API)
 */
// Get all quizzes
export const getQuizzes = async (req: Request, res: Response): Promise<void> => {
  try {
    // Lấy thông tin user và các tham số pagination
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;        // Trang hiện tại
    const limit = parseInt(req.query.limit as string) || 10;    // Số lượng mỗi trang
    const search = req.query.search as string;                  // Từ khóa tìm kiếm
    
    // Xây dựng filter
    const filter: any = {};
    
    // Phân quyền: Teacher chỉ thấy bài thi của mình, Admin thấy tất cả
    if (user?.role === 'teacher') {
      filter.createdBy = user.id; // Chỉ lấy bài thi do giáo viên này tạo
    }
    
    // Sinh viên không sử dụng endpoint này (dùng assignments API để xem bài thi được giao)
    if (user?.role === 'student') {
      res.json({ 
        success: true, 
        data: { 
          quizzes: [],
          pagination: { page, limit, total: 0, pages: 0 }
        } 
      });
      return;
    }
    
    // Tìm kiếm theo title, description hoặc subject (không phân biệt hoa thường)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },           // Tìm trong tiêu đề
        { description: { $regex: search, $options: 'i' } },     // Tìm trong mô tả
        { subject: { $regex: search, $options: 'i' } }         // Tìm trong môn học
      ];
    }
    
    // Tìm bài thi với pagination và populate thông tin người tạo
    const quizzes = await Quiz.find(filter)
      .populate('createdBy', 'username email')  // Lấy thông tin người tạo
      .sort({ createdAt: -1 })              // Sắp xếp mới nhất trước
      .limit(limit * 1)                     // Giới hạn số lượng
      .skip((page - 1) * limit);            // Bỏ qua các bản ghi ở trang trước
    
    // Đếm tổng số bài thi thỏa mãn filter
    const total = await Quiz.countDocuments(filter);
    
    res.json({
      success: true,
      data: { 
        quizzes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// GET QUIZ - Lấy chi tiết một bài thi
// ============================================
/**
 * Lấy thông tin chi tiết một bài thi theo ID
 * Route: GET /api/quizzes/:id
 * Access: Private
 */
// Get single quiz
export const getQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('createdBy', 'username email');
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
      return;
    }
    res.json({
      success: true,
      data: { quiz }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// CREATE QUIZ - Tạo bài thi mới
// ============================================
/**
 * Tạo bài thi mới
 * Route: POST /api/quizzes
 * Access: Private (Teacher/Admin)
 * 
 * Required fields: title, description, subject, timeLimit
 * Optional: questions (mảng ID câu hỏi)
 */
// Create quiz
export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, subject, timeLimit, questions } = req.body;
    
    const quiz = await Quiz.create({
      title,
      description,
      subject,
      timeLimit,
      questions: questions || [],
      createdBy: req.user!.id
    });

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: quiz
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// UPDATE QUIZ - Cập nhật bài thi
// ============================================
/**
 * Cập nhật thông tin bài thi
 * Route: PUT /api/quizzes/:id
 * Access: Private (Teacher/Admin)
 */
// Update quiz
export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, subject, timeLimit, questions } = req.body;
    
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { title, description, subject, timeLimit, questions },
      { new: true, runValidators: true }
    );

    if (!quiz) {
      res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: quiz
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// DELETE QUIZ - Xóa bài thi
// ============================================
/**
 * Xóa bài thi
 * Route: DELETE /api/quizzes/:id
 * Access: Private (Teacher/Admin)
 */
// Delete quiz
export const deleteQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};