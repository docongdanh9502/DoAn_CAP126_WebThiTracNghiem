// ============================================
// FILE: multer.ts
// MÔ TẢ: Cấu hình Multer để xử lý upload file (ảnh, Excel)
// CHỨC NĂNG: Upload avatar, import file Excel cho câu hỏi và bài thi
// ============================================

import multer from 'multer';  // Thư viện xử lý multipart/form-data (file upload)
import path from 'path';       // Thư viện xử lý đường dẫn file

// ============================================
// CẤU HÌNH STORAGE CHO UPLOAD ẢNH
// ============================================
// Cấu hình lưu file ảnh vào thư mục 'uploads/' trên disk
const storage = multer.diskStorage({
  // Xác định thư mục lưu file
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Lưu vào thư mục uploads/
  },
  // Đặt tên file với timestamp và random để tránh trùng tên
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Timestamp + random number
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); // Tên: fieldname-timestamp-random.extension
  }
});

// ============================================
// FILTER FILE TYPES - CHỈ CHO PHÉP ẢNH
// ============================================
// Kiểm tra loại file, chỉ cho phép upload file ảnh
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Kiểm tra MIME type bắt đầu bằng 'image/'
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Cho phép upload
  } else {
    cb(new Error('Chỉ cho phép upload file ảnh!'), false); // Từ chối file không phải ảnh
  }
};

// ============================================
// CẤU HÌNH MULTER CHO UPLOAD ẢNH
// ============================================
export const upload = multer({
  storage: storage,                                           // Lưu vào disk
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // Giới hạn kích thước (mặc định 5MB = 5242880 bytes)
  },
  fileFilter: fileFilter                                      // Chỉ cho phép ảnh
});

// Middleware upload một file (dùng cho avatar)
export const uploadSingle = upload.single('avatar');

// Middleware upload nhiều file (tối đa 5 file)
export const uploadMultiple = upload.array('images', 5);

// ============================================
// CẤU HÌNH MULTER CHO FILE EXCEL
// ============================================
// Lưu file Excel vào memory (không lưu vào disk) để xử lý ngay
const excelStorage = multer.memoryStorage();

// Filter chỉ cho phép file Excel (.xlsx, .xls)
const excelFileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Các MIME type của file Excel
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                           // .xls
    'application/vnd.ms-office',                                          // .xls (old format)
  ];
  
  // Kiểm tra MIME type hoặc extension của file
  if (allowedMimes.includes(file.mimetype) || 
      file.originalname.endsWith('.xlsx') || 
      file.originalname.endsWith('.xls')) {
    cb(null, true); // Cho phép upload
  } else {
    cb(new Error('Chỉ cho phép upload file Excel (.xlsx, .xls)!'), false); // Từ chối file không phải Excel
  }
};

// Cấu hình multer cho Excel files
export const uploadExcel = multer({
  storage: excelStorage,           // Lưu vào memory (không lưu vào disk)
  limits: {
    fileSize: 10 * 1024 * 1024     // Giới hạn kích thước 10MB
  },
  fileFilter: excelFileFilter      // Chỉ cho phép file Excel
}).single('excelFile');            // Chỉ cho phép upload 1 file với field name 'excelFile'