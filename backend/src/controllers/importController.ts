// ============================================
// FILE: importController.ts
// MÔ TẢ: Controller xử lý import/export Excel cho Questions và Quizzes
// CHỨC NĂNG: Tạo file mẫu Excel, import questions và quizzes từ Excel
// ============================================

import { Request, Response } from 'express';     // Types từ Express
import * as XLSX from 'xlsx';                    // Thư viện xử lý Excel
import Question from '../models/Question';       // Model Question
import Quiz from '../models/Quiz';               // Model Quiz
import { asyncHandler } from '../middleware/errorHandler'; // Wrapper bắt lỗi async

// ============================================
// EXPORT TEMPLATE - Xuất file mẫu Excel
// ============================================
/**
 * Tạo và xuất file Excel mẫu để import questions và quizzes
 * Route: GET /api/import/template
 * Access: Private (Teacher)
 * 
 * File Excel gồm 2 sheets:
 * - Sheet "Câu hỏi": Chứa mẫu câu hỏi với STT, nội dung, đáp án A/B/C/D, đáp án đúng, môn học, độ khó
 * - Sheet "Bài thi": Chứa mẫu bài thi với tiêu đề, mô tả, môn học, thời gian, danh sách STT câu hỏi
 */
// Export file mẫu Excel
export const exportTemplate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Tạo workbook
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Câu hỏi mẫu
  const questionsData = [
    ['STT', 'Nội dung câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng', 'Môn học', 'Độ khó'],
    ['1', 'Câu hỏi ví dụ 1: 2 + 2 bằng bao nhiêu?', '3', '4', '5', '6', 'B', 'Toán học', 'Dễ'],
    ['2', 'Câu hỏi ví dụ 2: Thủ đô của Việt Nam là?', 'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Huế', 'A', 'Địa lý', 'Dễ'],
    ['3', 'Câu hỏi ví dụ 3: HTML là viết tắt của?', 'HyperText Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Markup Language', 'A', 'Công nghệ', 'Trung bình'],
  ];

  const questionsSheet = XLSX.utils.aoa_to_sheet(questionsData);
  
  // Set column widths
  questionsSheet['!cols'] = [
    { wch: 8 },  // STT
    { wch: 50 }, // Nội dung câu hỏi
    { wch: 30 }, // Đáp án A
    { wch: 30 }, // Đáp án B
    { wch: 30 }, // Đáp án C
    { wch: 30 }, // Đáp án D
    { wch: 15 }, // Đáp án đúng
    { wch: 20 }, // Môn học
    { wch: 15 }, // Độ khó
  ];

  XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Câu hỏi');

  // Sheet 2: Bài thi mẫu
  const quizData = [
    ['Tiêu đề bài thi', 'Mô tả', 'Môn học', 'Thời gian (phút)', 'Danh sách câu hỏi (STT)'],
    ['Bài thi mẫu Toán học', 'Bài thi kiểm tra kiến thức toán cơ bản', 'Toán học', '30', '1,2'],
    ['Bài thi mẫu Tổng hợp', 'Bài thi tổng hợp nhiều môn', 'Tổng hợp', '60', '1,2,3'],
  ];

  const quizSheet = XLSX.utils.aoa_to_sheet(quizData);
  
  // Set column widths
  quizSheet['!cols'] = [
    { wch: 30 }, // Tiêu đề bài thi
    { wch: 50 }, // Mô tả
    { wch: 20 }, // Môn học
    { wch: 18 }, // Thời gian
    { wch: 30 }, // Danh sách câu hỏi
  ];

  XLSX.utils.book_append_sheet(workbook, quizSheet, 'Bài thi');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Mau_Import_CauHoi_Va_BaiThi.xlsx"');
  res.send(buffer);
});

// ============================================
// IMPORT EXCEL - Import questions và quizzes từ file Excel
// ============================================
/**
 * Import questions và quizzes từ file Excel
 * Route: POST /api/import/excel
 * Access: Private (Teacher)
 * 
 * Flow:
 * 1. Đọc file Excel (có 2 sheets: "Câu hỏi" và "Bài thi")
 * 2. Validate và tạo questions từ sheet "Câu hỏi" (map theo STT)
 * 3. Validate và tạo quizzes từ sheet "Bài thi" (map questions bằng STT)
 * 4. Trả về kết quả (số lượng questions và quizzes đã tạo)
 */
// Import file Excel (tạo cả câu hỏi và bài thi)
export const importExcel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user: any = req.user;
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'Vui lòng chọn file Excel để import'
    });
    return;
  }

  try {
    // Đọc file Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // Đọc sheet Câu hỏi
    const questionsSheet = workbook.Sheets['Câu hỏi'];
    if (!questionsSheet) {
      res.status(400).json({
        success: false,
        message: 'File Excel thiếu sheet "Câu hỏi"'
      });
      return;
    }

    const questionsData = XLSX.utils.sheet_to_json(questionsSheet);
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Sheet "Câu hỏi" không có dữ liệu'
      });
      return;
    }

    // Đọc sheet Bài thi
    const quizSheet = workbook.Sheets['Bài thi'];
    if (!quizSheet) {
      res.status(400).json({
        success: false,
        message: 'File Excel thiếu sheet "Bài thi"'
      });
      return;
    }

    const quizData = XLSX.utils.sheet_to_json(quizSheet);
    if (!Array.isArray(quizData) || quizData.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Sheet "Bài thi" không có dữ liệu'
      });
      return;
    }

    const errors: string[] = [];
    const createdQuestions: { [key: number]: string } = {}; // Mapping STT -> Question ID
    const createdQuizzes: string[] = [];

    // Tạo các câu hỏi
    for (let i = 0; i < questionsData.length; i++) {
      const row: any = questionsData[i];
      const rowNum = i + 2; // +2 vì có header và index bắt đầu từ 0

      try {
        // Lấy STT để map với danh sách câu hỏi
        const stt = parseInt((row['STT'] || '').toString().trim());
        if (isNaN(stt) || stt < 1) {
          errors.push(`Dòng ${rowNum} (Câu hỏi): STT không hợp lệ`);
          continue;
        }

        // Lấy dữ liệu từ các cột
        const text = (row['Nội dung câu hỏi'] || '').toString().trim();
        const optionA = (row['Đáp án A'] || '').toString().trim();
        const optionB = (row['Đáp án B'] || '').toString().trim();
        const optionC = (row['Đáp án C'] || '').toString().trim();
        const optionD = (row['Đáp án D'] || '').toString().trim();
        let correctAnswer: any = row['Đáp án đúng'];
        const subject = (row['Môn học'] || '').toString().trim();
        let difficulty = (row['Độ khó'] || '').toString().trim();

        // Validate required fields
        if (!text || !optionA || !optionB) {
          errors.push(`Dòng ${rowNum} (Câu hỏi): Thiếu nội dung câu hỏi hoặc đáp án A, B`);
          continue;
        }

        // Chuyển đổi đáp án đúng (chỉ nhận A, B, C, D)
        if (typeof correctAnswer === 'string') {
          const upper = correctAnswer.toUpperCase().trim();
          if (upper === 'A') correctAnswer = 0;
          else if (upper === 'B') correctAnswer = 1;
          else if (upper === 'C') correctAnswer = 2;
          else if (upper === 'D') correctAnswer = 3;
          else {
            errors.push(`Dòng ${rowNum} (Câu hỏi): Đáp án đúng không hợp lệ (phải là A, B, C, hoặc D)`);
            continue;
          }
        } else {
          errors.push(`Dòng ${rowNum} (Câu hỏi): Đáp án đúng không hợp lệ (phải là A, B, C, hoặc D)`);
          continue;
        }

        if (correctAnswer < 0 || correctAnswer > 3) {
          errors.push(`Dòng ${rowNum} (Câu hỏi): Đáp án đúng không hợp lệ (phải là A, B, C, hoặc D)`);
          continue;
        }

        // Xây dựng mảng options
        const options: string[] = [optionA, optionB];
        if (optionC) options.push(optionC);
        if (optionD) options.push(optionD);

        if (correctAnswer >= options.length) {
          errors.push(`Dòng ${rowNum} (Câu hỏi): Đáp án đúng (${correctAnswer}) vượt quá số lựa chọn (${options.length})`);
          continue;
        }

        // Chuyển đổi độ khó
        if (typeof difficulty === 'string') {
          const lower = difficulty.toLowerCase().trim();
          if (lower === 'dễ' || lower === 'de') difficulty = 'easy';
          else if (lower === 'trung bình' || lower === 'trungbinh' || lower === 'tb') difficulty = 'medium';
          else if (lower === 'khó' || lower === 'kho') difficulty = 'hard';
        }

        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
          errors.push(`Dòng ${rowNum} (Câu hỏi): Độ khó không hợp lệ (phải là Dễ, Trung bình, hoặc Khó)`);
          continue;
        }

        // Tạo câu hỏi
        const question = await Question.create({
          text: text.trim(),
          options: options.map(opt => opt.trim()),
          correctAnswer,
          subject: subject.trim(),
          difficulty: difficulty as 'easy' | 'medium' | 'hard',
          createdBy: user.id
        });

        // Lưu mapping: STT -> Question ID
        createdQuestions[stt] = (question._id as any).toString();
      } catch (err: any) {
        errors.push(`Dòng ${rowNum} (Câu hỏi): ${err.message || 'Lỗi không xác định'}`);
      }
    }

    // Tạo các bài thi
    for (let i = 0; i < quizData.length; i++) {
      const row: any = quizData[i];
      const rowNum = i + 2;

      try {
        const title = (row['Tiêu đề bài thi'] || '').toString().trim();
        const description = (row['Mô tả'] || '').toString().trim();
        const subject = (row['Môn học'] || '').toString().trim();
        let timeLimit = row['Thời gian (phút)'] || row['Thời gian (phút)'];
        const questionList = (row['Danh sách câu hỏi (STT)'] || row['Danh sách câu hỏi'] || '').toString().trim();

        // Validate required fields
        if (!title || !subject) {
          errors.push(`Dòng ${rowNum} (Bài thi): Thiếu tiêu đề hoặc môn học`);
          continue;
        }

        // Parse timeLimit
        timeLimit = parseInt(timeLimit);
        if (isNaN(timeLimit) || timeLimit < 1) {
          errors.push(`Dòng ${rowNum} (Bài thi): Thời gian không hợp lệ`);
          continue;
        }

        // Parse danh sách câu hỏi (STT từ cột STT trong sheet Câu hỏi)
        let questionStts: number[] = [];
        if (typeof questionList === 'string') {
          questionStts = questionList.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
        } else if (Array.isArray(questionList)) {
          questionStts = questionList.map(n => parseInt(n)).filter(n => !isNaN(n) && n > 0);
        } else {
          questionStts = [parseInt(questionList)].filter(n => !isNaN(n) && n > 0);
        }

        if (questionStts.length === 0) {
          errors.push(`Dòng ${rowNum} (Bài thi): Danh sách câu hỏi không hợp lệ`);
          continue;
        }

        // Lấy question IDs từ STT (STT -> Question ID mapping)
        const questionIds: string[] = [];
        for (const stt of questionStts) {
          if (createdQuestions[stt]) {
            questionIds.push(createdQuestions[stt]);
          } else {
            errors.push(`Dòng ${rowNum} (Bài thi): Không tìm thấy câu hỏi có STT = ${stt}. Hãy kiểm tra cột STT trong sheet "Câu hỏi"`);
          }
        }

        if (questionIds.length === 0) {
          errors.push(`Dòng ${rowNum} (Bài thi): Không có câu hỏi hợp lệ`);
          continue;
        }

        // Tạo bài thi
        const quiz = await Quiz.create({
          title: title.trim(),
          description: description.trim() || `Bài thi môn ${subject}`,
          subject: subject.trim(),
          timeLimit,
          questions: questionIds,
          isActive: true,
          createdBy: user.id
        });

        createdQuizzes.push((quiz._id as any).toString());
      } catch (err: any) {
        errors.push(`Dòng ${rowNum} (Bài thi): ${err.message || 'Lỗi không xác định'}`);
      }
    }

    // Trả về kết quả
    const questionsCount = Object.keys(createdQuestions).length;
    res.json({
      success: true,
      message: `Import thành công: ${questionsCount} câu hỏi, ${createdQuizzes.length} bài thi`,
      data: {
        questionsCreated: questionsCount,
        quizzesCreated: createdQuizzes.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Lỗi khi xử lý file Excel: ${error.message}`
    });
  }
});

