// ============================================
// FILE: quizResultController.ts
// MÔ TẢ: Controller xử lý QuizResult (Kết quả bài thi)
// CHỨC NĂNG: Kiểm tra đã làm bài chưa, nộp kết quả, lấy danh sách kết quả, export Excel
// ============================================

import { Request, Response } from 'express';     // Types từ Express
import * as XLSX from 'xlsx';                     // Thư viện xử lý Excel
import QuizResult from '../models/QuizResult';   // Model QuizResult
import Quiz from '../models/Quiz';                // Model Quiz
import Question from '../models/Question';        // Model Question

// ============================================
// CHECK QUIZ COMPLETION - Kiểm tra đã làm bài thi chưa
// ============================================
/**
 * Kiểm tra sinh viên đã hoàn thành bài thi chưa (cho assignment cụ thể)
 * Route: GET /api/quiz-results/:quizId/check?assignmentId=xxx
 * Access: Private (Student)
 * 
 * Purpose:
 * - Kiểm tra sinh viên đã làm bài thi này cho assignment này chưa
 * - Mỗi assignment là độc lập (assignmentId là bắt buộc)
 */
// @desc    Check if student already completed a quiz for specific assignment
// @route   GET /api/quiz-results/:quizId/check?assignmentId=xxx
// @access  Private (Student)
export const checkQuizCompletion = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { assignmentId } = req.query;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if student already completed this quiz for this specific assignment
    // assignmentId is REQUIRED for students to ensure assignments are independent
    const query: any = {
      quizId,
      studentId
    };
    
    // assignmentId is REQUIRED - each assignment must be completely independent
    if (assignmentId) {
      query.assignmentId = assignmentId;
    } else {
      // If no assignmentId, this is likely an error - return false to be safe
      console.warn(`Warning: No assignmentId provided for quiz ${quizId}, student ${studentId}`);
      return res.status(200).json({
        success: true,
        data: {
          completed: false
        }
      });
    }

    const existingResult = await QuizResult.findOne(query);

    if (existingResult) {
      return res.status(200).json({
        success: true,
        data: {
          completed: true,
          result: existingResult
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        completed: false
      }
    });
  } catch (error) {
    console.error('Error checking quiz completion:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// SUBMIT QUIZ RESULT - Nộp kết quả bài thi
// ============================================
/**
 * Nộp kết quả bài thi của sinh viên
 * Route: POST /api/quiz-results
 * Access: Private (Student)
 * 
 * Flow:
 * 1. Validate input (quizId, answers, timeSpent)
 * 2. Lấy quiz và questions để tính điểm
 * 3. Tính điểm số (so sánh answers với correctAnswer)
 * 4. Lưu snapshot thông tin sinh viên tại thời điểm nộp bài
 * 5. Tạo QuizResult record
 */
// @desc    Submit quiz result
// @route   POST /api/quiz-results
// @access  Private (Student)
export const submitQuizResult = async (req: Request, res: Response) => {
  try {
    const { quizId, answers, timeSpent, assignmentId } = req.body;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if student already completed this quiz for this specific assignment
    // assignmentId is REQUIRED for students to ensure assignments are independent
    const query: any = {
      quizId,
      studentId
    };
    
    // assignmentId is REQUIRED - each assignment must be completely independent
    if (assignmentId) {
      query.assignmentId = assignmentId;
    } else {
      // If no assignmentId provided, reject submission to prevent conflicts
      return res.status(400).json({
        success: false,
        message: 'Assignment ID is required for quiz submission'
      });
    }

    const existingResult = await QuizResult.findOne(query);

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã hoàn thành bài thi này rồi!'
      });
    }

    // Get quiz and questions to calculate score
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    const questions = await Question.find({ _id: { $in: quiz.questions } });
    
    // Calculate score
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 10 * 100) / 100; // 10-point scale, 2 decimals

    // Create quiz result (with snapshot of student's profile)
    const quizResultData: any = {
      quizId,
      studentId,
      answers,
      score,
      totalQuestions: questions.length,
      timeSpent,
      completedAt: new Date() // store UTC; client formats to VN time
    };
    
    // Add assignmentId if provided
    if (assignmentId) {
      quizResultData.assignmentId = assignmentId;
    }

    // Snapshot student profile
    const u: any = req.user;
    quizResultData.studentCode = u?.studentId || '';
    quizResultData.fullName = u?.fullName || u?.username || '';
    quizResultData.className = u?.class || '';
    quizResultData.gender = u?.gender || undefined;

    const quizResult = new QuizResult(quizResultData);

    await quizResult.save();

    return res.status(201).json({
      success: true,
      data: quizResult,
      message: 'Quiz submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting quiz result:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get student's quiz results
// @route   GET /api/quiz-results
// @access  Private (Student)
export const getStudentQuizResults = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const quizId = (req.query.quizId as string) || '';
    const minScore = req.query.minScore !== undefined ? parseFloat(req.query.minScore as string) : undefined;
    const maxScore = req.query.maxScore !== undefined ? parseFloat(req.query.maxScore as string) : undefined;

    const filter: any = { studentId };
    if (quizId) filter.quizId = quizId;
    if (!Number.isNaN(minScore as number) && minScore !== undefined) {
      filter.score = { ...(filter.score || {}), $gte: minScore };
    }
    if (!Number.isNaN(maxScore as number) && maxScore !== undefined) {
      filter.score = { ...(filter.score || {}), $lte: maxScore };
    }

    const total = await QuizResult.countDocuments(filter);
    
    const results = await QuizResult.find(filter)
      .populate('quizId', 'title subject timeLimit')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    return res.status(200).json({
      success: true,
      data: { 
        results,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get quiz results for a specific quiz (for teachers)
// @route   GET /api/quiz-results/quiz/:quizId
// @access  Private (Teacher/Admin)
export const getQuizResults = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '10');
    const search = (req.query.search as string) || '';
    const className = (req.query.className as string) || '';
    const gender = (req.query.gender as string) || '';
    const minScore = req.query.minScore !== undefined ? parseFloat(req.query.minScore as string) : undefined;
    const maxScore = req.query.maxScore !== undefined ? parseFloat(req.query.maxScore as string) : undefined;

    const filter: any = { quizId };
    if (search) {
      filter.$or = [
        { studentCode: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { className: { $regex: search, $options: 'i' } }
      ];
    }
    if (className) filter.className = className;
    if (gender) filter.gender = gender;
    if (!Number.isNaN(minScore as number) && minScore !== undefined) {
      filter.score = { ...(filter.score || {}), $gte: minScore };
    }
    if (!Number.isNaN(maxScore as number) && maxScore !== undefined) {
      filter.score = { ...(filter.score || {}), $lte: maxScore };
    }

    const total = await QuizResult.countDocuments(filter);

    const results = await QuizResult.find(filter)
      .populate('studentId', 'name email studentId')
      .populate('quizId', 'title subject')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    return res.status(200).json({
      success: true,
      data: { 
        results,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Error getting quiz results:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Summary counts for teacher (results across own quizzes)
// @route   GET /api/quiz-results/summary/my
// @access  Private (Teacher)
export const getMyResultsSummary = async (req: Request, res: Response) => {
  try {
    const user: any = req.user;
    if (user?.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const myQuizzes = await Quiz.find({ createdBy: user.id }).select('_id');
    const quizIds = myQuizzes.map(q => q._id);
    const count = await QuizResult.countDocuments({ quizId: { $in: quizIds } });
    return res.json({ success: true, data: { totalResults: count } });
  } catch (error) {
    console.error('Error getting teacher results summary:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Export quiz results to Excel (for teachers)
// @route   GET /api/quiz-results/quiz/:quizId/export
// @access  Private (Teacher/Admin)
export const exportQuizResultsToExcel = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const search = (req.query.search as string) || '';
    const className = (req.query.className as string) || '';
    const gender = (req.query.gender as string) || '';
    const minScore = req.query.minScore !== undefined ? parseFloat(req.query.minScore as string) : undefined;
    const maxScore = req.query.maxScore !== undefined ? parseFloat(req.query.maxScore as string) : undefined;

    // Build filter (same as getQuizResults)
    const filter: any = { quizId };
    if (search) {
      filter.$or = [
        { studentCode: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { className: { $regex: search, $options: 'i' } }
      ];
    }
    if (className) filter.className = className;
    if (gender) filter.gender = gender;
    if (!Number.isNaN(minScore as number) && minScore !== undefined) {
      filter.score = { ...(filter.score || {}), $gte: minScore };
    }
    if (!Number.isNaN(maxScore as number) && maxScore !== undefined) {
      filter.score = { ...(filter.score || {}), $lte: maxScore };
    }

    // Get quiz info
    const quiz = await Quiz.findById(quizId).select('title subject');
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    // Get all results (no pagination for export)
    const results = await QuizResult.find(filter)
      .populate('studentId', 'name email studentId')
      .populate('quizId', 'title subject')
      .sort({ completedAt: -1 });

    // Format data for Excel
    const excelData = [
      ['MSSV', 'Họ tên', 'Lớp', 'Giới tính', 'Bài thi/Môn', 'Điểm', 'Số câu', 'Thời gian làm bài', 'Nộp lúc']
    ];

    results.forEach((result: any) => {
      const studentCode = result.studentCode || result.studentId?.studentId || '';
      const fullName = result.fullName || result.studentId?.fullName || result.studentId?.username || '';
      const className = result.className || result.studentId?.class || '';
      const gender = result.gender || result.studentId?.gender || '';
      const genderText = gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : gender ? 'Khác' : '';
      const quizTitle = result.quizId?.title || '';
      const score = result.score != null ? Number(result.score).toFixed(2) : '';
      const totalQuestions = result.totalQuestions || 0;
      
      // Format time spent (minutes to MM:SS)
      const timeSpent = result.timeSpent || 0;
      const totalSeconds = Math.round(timeSpent * 60);
      const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const ss = (totalSeconds % 60).toString().padStart(2, '0');
      const timeSpentFormatted = `${mm}:${ss}`;

      // Format completed date
      let completedAtFormatted = '';
      try {
        const d = new Date(result.completedAt);
        completedAtFormatted = new Intl.DateTimeFormat('vi-VN', {
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          day: '2-digit', month: '2-digit', year: 'numeric',
          timeZone: 'Asia/Ho_Chi_Minh'
        }).format(d);
      } catch {
        completedAtFormatted = result.completedAt ? new Date(result.completedAt).toLocaleString('vi-VN') : '';
      }

      excelData.push([
        studentCode,
        fullName,
        className,
        genderText,
        quizTitle,
        score,
        totalQuestions.toString(),
        timeSpentFormatted,
        completedAtFormatted
      ]);
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // MSSV
      { wch: 25 }, // Họ tên
      { wch: 15 }, // Lớp
      { wch: 12 }, // Giới tính
      { wch: 30 }, // Bài thi/Môn
      { wch: 10 }, // Điểm
      { wch: 10 }, // Số câu
      { wch: 18 }, // Thời gian làm bài
      { wch: 25 }, // Nộp lúc
    ];

    // Add header style (bold)
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E3F2FD' } }
      };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kết quả bài thi');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename with quiz title and current date
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const quizTitleClean = (quiz.title || 'KetQua').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `KetQua_${quizTitleClean}_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
    return;
  } catch (error: any) {
    console.error('Error exporting quiz results to Excel:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất file Excel: ' + (error.message || 'Lỗi không xác định')
    });
  }
};
