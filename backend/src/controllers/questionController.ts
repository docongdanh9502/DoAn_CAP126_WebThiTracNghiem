// ============================================
// FILE: questionController.ts
// MÔ TẢ: Controller xử lý CRUD operations cho Question (Câu hỏi)
// CHỨC NĂNG: Lấy danh sách, tạo, sửa, xóa câu hỏi; thống kê câu hỏi
// ============================================

import { Request, Response } from 'express';     // Types từ Express
import Question from '../models/Question';       // Model Question
import { asyncHandler } from '../middleware/errorHandler'; // Wrapper bắt lỗi async

// ============================================
// GET QUESTIONS - Lấy danh sách câu hỏi
// ============================================
/**
 * Lấy danh sách câu hỏi với pagination và filter
 * Route: GET /api/questions
 * Access: Private
 * 
 * Features:
 * - Pagination (page, limit)
 * - Tìm kiếm theo nội dung (search)
 * - Lọc theo môn học (subject)
 * - Lọc theo độ khó (difficulty)
 * - Teacher chỉ thấy câu hỏi của mình, Admin thấy tất cả, Student không thấy
 */
// @desc    Get all questions
// @route   GET /api/questions
// @access  Private
export const getQuestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Lấy các tham số pagination và filter từ query string
  const page = parseInt(req.query.page as string) || 1;        // Trang hiện tại (mặc định 1)
  const limit = parseInt(req.query.limit as string) || 10;    // Số lượng mỗi trang (mặc định 10)
  const subject = req.query.subject as string;                 // Lọc theo môn học
  const difficulty = req.query.difficulty as string;           // Lọc theo độ khó
  const search = req.query.search as string;                   // Tìm kiếm theo nội dung

  // Xây dựng query filter
  let query: any = {};

  // Lọc theo môn học
  if (subject) {
    query.subject = subject;
  }

  // Lọc theo độ khó (easy, medium, hard)
  if (difficulty) {
    query.difficulty = difficulty;
  }

  // Tìm kiếm theo nội dung câu hỏi (không phân biệt hoa thường)
  if (search) {
    query.text = { $regex: search, $options: 'i' }; // 'i' = case insensitive
  }

  // Phân quyền: Teacher chỉ thấy câu hỏi của mình, Admin thấy tất cả, Student không thấy
  const user: any = req.user;
  if (user?.role === 'teacher') {
    query.createdBy = user.id; // Chỉ lấy câu hỏi do giáo viên này tạo
  } else if (user?.role === 'student') {
    // Sinh viên không được xem danh sách câu hỏi
    res.json({
      success: true,
      data: {
        questions: [],
        pagination: { page, limit, total: 0, pages: 0 }
      }
    });
    return;
  }

  // Tìm câu hỏi với pagination và populate thông tin người tạo
  const questions = await Question.find(query)
    .populate('createdBy', 'username email')  // Lấy thông tin người tạo (username, email)
    .sort({ createdAt: -1 })                  // Sắp xếp mới nhất trước
    .limit(limit * 1)                        // Giới hạn số lượng
    .skip((page - 1) * limit);               // Bỏ qua các bản ghi ở trang trước

  // Đếm tổng số câu hỏi thỏa mãn filter (cho pagination)
  const total = await Question.countDocuments(query);

  // Trả về danh sách câu hỏi và thông tin pagination
  res.json({
    success: true,
    data: {
      questions,
      pagination: {
        page,                                    // Trang hiện tại
        limit,                                   // Số lượng mỗi trang
        total,                                   // Tổng số câu hỏi
        pages: Math.ceil(total / limit)          // Tổng số trang
      }
    }
  });
});

// ============================================
// GET QUESTION - Lấy chi tiết một câu hỏi
// ============================================
/**
 * Lấy thông tin chi tiết một câu hỏi theo ID
 * Route: GET /api/questions/:id
 * Access: Private
 */
// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
export const getQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const question = await Question.findById(req.params.id)
    .populate('createdBy', 'username email');

  if (!question) {
    res.status(404).json({
      success: false,
      message: 'Question not found'
    });
    return;
  }

  res.json({
    success: true,
    data: { question }
  });
});

// ============================================
// CREATE QUESTION - Tạo câu hỏi mới
// ============================================
/**
 * Tạo câu hỏi mới
 * Route: POST /api/questions
 * Access: Private (Teacher/Admin)
 * 
 * Required fields: text, options, correctAnswer, subject, difficulty
 */
// @desc    Create new question
// @route   POST /api/questions
// @access  Private (Teacher/Admin)
export const createQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { text, options, correctAnswer, subject, difficulty } = req.body;
  const user = req.user;

  const question = await Question.create({
    text,
    options,
    correctAnswer,
    subject,
    difficulty,
    createdBy: user!.id
  });

  const populatedQuestion = await Question.findById(question._id)
    .populate('createdBy', 'username email');

  res.status(201).json({
    success: true,
    message: 'Question created successfully',
    data: { question: populatedQuestion }
  });
});

// ============================================
// UPDATE QUESTION - Cập nhật câu hỏi
// ============================================
/**
 * Cập nhật thông tin câu hỏi
 * Route: PUT /api/questions/:id
 * Access: Private (Teacher/Admin)
 */
// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Teacher/Admin)
export const updateQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { text, options, correctAnswer, subject, difficulty } = req.body;

  const question = await Question.findByIdAndUpdate(
    req.params.id,
    {
      text,
      options,
      correctAnswer,
      subject,
      difficulty
    },
    { new: true, runValidators: true }
  )
    .populate('createdBy', 'username email');

  if (!question) {
    res.status(404).json({
      success: false,
      message: 'Question not found'
    });
    return;
  }

  res.json({
    success: true,
    message: 'Question updated successfully',
    data: { question }
  });
});

// ============================================
// DELETE QUESTION - Xóa câu hỏi
// ============================================
/**
 * Xóa câu hỏi
 * Route: DELETE /api/questions/:id
 * Access: Private (Teacher/Admin)
 */
// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private (Teacher/Admin)
export const deleteQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const question = await Question.findByIdAndDelete(req.params.id);

  if (!question) {
    res.status(404).json({
      success: false,
      message: 'Question not found'
    });
    return;
  }

  res.json({
    success: true,
    message: 'Question deleted successfully'
  });
});

// ============================================
// GET QUESTION STATS - Thống kê câu hỏi
// ============================================
/**
 * Lấy thống kê về câu hỏi
 * Route: GET /api/questions/stats
 * Access: Private (Teacher/Admin)
 * 
 * Returns:
 * - Tổng số câu hỏi
 * - Số câu hỏi theo độ khó (easy, medium, hard)
 * - Số câu hỏi theo môn học
 */
// @desc    Get question statistics
// @route   GET /api/questions/stats
// @access  Private (Teacher/Admin)
export const getQuestionStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const totalQuestions = await Question.countDocuments();
  const easyQuestions = await Question.countDocuments({ difficulty: 'easy' });
  const mediumQuestions = await Question.countDocuments({ difficulty: 'medium' });
  const hardQuestions = await Question.countDocuments({ difficulty: 'hard' });

  // Get questions by subject
  const questionsBySubject = await Question.aggregate([
    {
      $group: {
        _id: '$subject',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        subject: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      totalQuestions,
      easyQuestions,
      mediumQuestions,
      hardQuestions,
      questionsBySubject
    }
  });
});