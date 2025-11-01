// ============================================
// FILE: server.ts
// MÔ TẢ: File khởi tạo và cấu hình server chính của ứng dụng
// CHỨC NĂNG: Thiết lập Express server, kết nối database, đăng ký routes, middleware
// ============================================

// Import các thư viện cần thiết
import express from 'express';           // Framework web server Node.js
import cors from 'cors';                    // Xử lý CORS (Cross-Origin Resource Sharing)
import helmet from 'helmet';                // Bảo mật HTTP headers
import rateLimit from 'express-rate-limit'; // Giới hạn số lượng request
import { createServer } from 'http';        // Tạo HTTP server
import { Server } from 'socket.io';         // WebSocket cho real-time communication
import dotenv from 'dotenv';                // Đọc biến môi trường từ file .env

// Import các module tự định nghĩa
import { connectDB } from './config/database';              // Kết nối MongoDB
import { errorHandler, notFound } from './middleware/errorHandler'; // Xử lý lỗi

// Import các routes (định tuyến API)
import authRoutes from './routes/auth';           // Routes xác thực (đăng nhập, đăng ký)
import userRoutes from './routes/user';           // Routes quản lý người dùng
import quizRoutes from './routes/quiz';           // Routes quản lý bài thi
import questionRoutes from './routes/question';   // Routes quản lý câu hỏi
import assignmentRoutes from './routes/assignment'; // Routes giao bài thi cho sinh viên
import quizResultRoutes from './routes/quizResult'; // Routes kết quả bài thi
import importRoutes from './routes/import';       // Routes import/export Excel

// Tải các biến môi trường từ file .env
dotenv.config();

// Khởi tạo Express application
const app = express();

// Tạo HTTP server từ Express app (cần cho Socket.io)
const server = createServer(app);

// Cấu hình Socket.io cho real-time features (chat, notifications)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000", // Cho phép kết nối từ frontend
    methods: ["GET", "POST"] // Phương thức HTTP được phép
  }
});

// Kết nối đến cơ sở dữ liệu MongoDB
connectDB();

// ============================================
// MIDDLEWARE BẢO MẬT
// ============================================

// Helmet: Bảo mật HTTP headers (chống XSS, clickjacking, etc.)
app.use(helmet());

// CORS: Cho phép frontend gọi API từ domain khác
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000", // Domain frontend được phép
  credentials: true // Cho phép gửi cookies, credentials
}));

// Rate Limiting: Giới hạn số lượng request để tránh DDoS và spam
// Development: 2000 requests/phút, Production: 300 requests/15 phút
const isProd = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  windowMs: isProd ? 15 * 60 * 1000 : 60 * 1000, // Thời gian window (15 phút hoặc 1 phút)
  max: isProd ? 300 : 2000 // Số lượng request tối đa
});
app.use(limiter);

// ============================================
// MIDDLEWARE XỬ LÝ REQUEST BODY
// ============================================

// Parse JSON body từ request (giới hạn 10MB)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded body (form data)
app.use(express.urlencoded({ extended: true }));

// ============================================
// STATIC FILES
// ============================================

// Phục vụ các file tĩnh (uploaded files) từ thư mục uploads
app.use('/uploads', express.static('uploads'));

// ============================================
// ĐĂNG KÝ CÁC ROUTES API (RESTful Endpoints)
// ============================================

app.use('/api/auth', authRoutes);           // /api/auth/* - Xác thực người dùng
app.use('/api/users', userRoutes);          // /api/users/* - Quản lý người dùng
app.use('/api/quizzes', quizRoutes);        // /api/quizzes/* - Quản lý bài thi
app.use('/api/questions', questionRoutes);  // /api/questions/* - Quản lý câu hỏi
app.use('/api/assignments', assignmentRoutes); // /api/assignments/* - Giao bài thi
app.use('/api/quiz-results', quizResultRoutes); // /api/quiz-results/* - Kết quả bài thi
app.use('/api/import', importRoutes);       // /api/import/* - Import/Export Excel

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

// Endpoint kiểm tra trạng thái server (cho monitoring, load balancer)
const SERVER_BOOT_ID = Date.now().toString(); // ID duy nhất khi server khởi động
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',                              // Trạng thái server
    timestamp: new Date().toISOString(),       // Thời gian hiện tại
    uptime: process.uptime(),                   // Thời gian server đã chạy (giây)
    bootId: SERVER_BOOT_ID                      // ID khởi động để phát hiện restart
  });
});

// ============================================
// SOCKET.IO - REAL-TIME COMMUNICATION
// ============================================

// Xử lý kết nối WebSocket (cho tính năng real-time như chat, notifications)
io.on('connection', (socket) => {
  console.log('User connected:', socket.id); // Log khi user kết nối
  
  // Xử lý khi user ngắt kết nối
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id); // Log khi user ngắt kết nối
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// Middleware xử lý route không tồn tại (404)
app.use(notFound);

// Middleware xử lý lỗi tổng quát (500, validation errors, etc.)
app.use(errorHandler);

// ============================================
// KHỞI ĐỘNG SERVER
// ============================================

// Lấy port từ biến môi trường hoặc mặc định 5000
const PORT = process.env.PORT || 5000;

// Lắng nghe requests trên port đã chỉ định
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

// Export Socket.io instance để sử dụng ở các module khác
export { io };