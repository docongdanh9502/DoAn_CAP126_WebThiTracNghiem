import { Request, Response } from 'express';
import Assignment from '../models/Assignment';
import Quiz from '../models/Quiz';
import User from '../models/User';
import { validationResult } from 'express-validator';

// Get assignments assigned to current user (student)
export const getAssignedQuizzes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const userEmail = req.user!.email;

    const query: any = {
      assignedTo: userEmail,
      isActive: true
    };

    if (search) {
      query['quiz.title'] = { $regex: search, $options: 'i' };
    }

    const assignments = await Assignment.find(query)
      .populate('quizId', 'title description subject timeLimit questions isActive createdAt')
      .populate('assignedBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching assigned quizzes:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách bài thi được giao'
    });
  }
};

// Get all assignments (for teachers)
export const getAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const teacherId = req.user!.id;

    const query: any = {
      assignedBy: teacherId
    };

    if (search) {
      query['quiz.title'] = { $regex: search, $options: 'i' };
    }

    const assignments = await Assignment.find(query)
      .populate('quizId', 'title description subject timeLimit questions isActive createdAt')
      .sort({ createdAt: -1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách bài giao'
    });
  }
};

// Assign quiz to students
export const assignQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
      return;
    }

    const { quizId, assignedTo, dueDate } = req.body;
    const teacherId = req.user!.id;

    // Check if quiz exists and belongs to teacher
    const quiz = await Quiz.findOne({ _id: quizId, createdBy: teacherId });
    if (!quiz) {
      res.status(404).json({
        success: false,
        message: 'Bài thi không tồn tại hoặc không thuộc về bạn'
      });
      return;
    }

    // Validate student emails
    const students = await User.find({ 
      email: { $in: assignedTo }, 
      role: 'student' 
    });

    if (students.length !== assignedTo.length) {
      res.status(400).json({
        success: false,
        message: 'Một số email sinh viên không tồn tại'
      });
      return;
    }

    // Create assignment
    const assignment = new Assignment({
      quizId,
      assignedTo,
      assignedBy: teacherId,
      dueDate: new Date(dueDate)
    });

    await assignment.save();

    res.status(201).json({
      success: true,
      message: 'Giao bài thành công',
      data: { assignment }
    });
  } catch (error) {
    console.error('Error assigning quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi giao bài'
    });
  }
};

// Update assignment
export const updateAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedTo, dueDate } = req.body;
    const teacherId = req.user!.id;

    const assignment = await Assignment.findOne({ 
      _id: id, 
      assignedBy: teacherId 
    });

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Bài giao không tồn tại hoặc không thuộc về bạn'
      });
      return;
    }

    if (assignedTo) {
      // Validate student emails
      const students = await User.find({ 
        email: { $in: assignedTo }, 
        role: 'student' 
      });

      if (students.length !== assignedTo.length) {
        res.status(400).json({
          success: false,
          message: 'Một số email sinh viên không tồn tại'
        });
        return;
      }

      assignment.assignedTo = assignedTo;
    }

    if (dueDate) {
      assignment.dueDate = new Date(dueDate);
    }

    await assignment.save();

    res.json({
      success: true,
      message: 'Cập nhật bài giao thành công',
      data: { assignment }
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật bài giao'
    });
  }
};

// Delete assignment
export const deleteAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const teacherId = req.user!.id;

    const assignment = await Assignment.findOne({ 
      _id: id, 
      assignedBy: teacherId 
    });

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: 'Bài giao không tồn tại hoặc không thuộc về bạn'
      });
      return;
    }

    await Assignment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Xóa bài giao thành công'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa bài giao'
    });
  }
};
