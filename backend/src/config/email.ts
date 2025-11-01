// ============================================
// FILE: email.ts
// MÔ TẢ: Cấu hình và xử lý gửi email qua Nodemailer
// CHỨC NĂNG: Tạo SMTP transporter, gửi email (OTP, thông báo), email templates
// ============================================

import nodemailer from 'nodemailer'; // Thư viện gửi email

// ============================================
// TẠO SMTP TRANSPORTER
// ============================================
/**
 * Tạo và cấu hình SMTP transporter để gửi email
 * - Đọc cấu hình từ biến môi trường (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS)
 * - Hỗ trợ Gmail và các SMTP server khác
 * @returns Nodemailer transporter object
 */
export const createTransporter = () => {
  // Đọc cấu hình email từ biến môi trường
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com'; // SMTP server (mặc định Gmail)
  const port = parseInt(process.env.EMAIL_PORT || '587');  // SMTP port (587 cho TLS, 465 cho SSL)
  const user = process.env.EMAIL_USER;                     // Email đăng nhập
  const pass = process.env.EMAIL_PASS;                     // Mật khẩu email (hoặc App Password cho Gmail)

  // Kiểm tra cấu hình email đã đầy đủ chưa
  if (!user || !pass) {
    console.error('❌ EMAIL_USER hoặc EMAIL_PASS chưa được cấu hình trong .env');
    throw new Error('Email configuration is missing');
  }

  // Tạo SMTP transporter với cấu hình trên
  const transporter = nodemailer.createTransport({
    host,                                    // Địa chỉ SMTP server
    port,                                    // Port kết nối
    secure: port === 465,                    // true cho SSL (port 465), false cho TLS (port 587)
    auth: {
      user,                                  // Email đăng nhập
      pass                                   // Mật khẩu hoặc App Password
    },
    tls: {
      rejectUnauthorized: false              // Cho phép certificate không được xác thực (cho development)
    }
  });

  return transporter;
};

// ============================================
// GỬI EMAIL
// ============================================
/**
 * Gửi email đến địa chỉ chỉ định
 * @param to - Địa chỉ email người nhận
 * @param subject - Tiêu đề email
 * @param html - Nội dung email dạng HTML
 * @returns Kết quả gửi email từ Nodemailer
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    // Tạo transporter
    const transporter = createTransporter();
    
    // Xác minh kết nối SMTP trước khi gửi
    await transporter.verify();

    // Cấu hình thông tin email
    const mailOptions = {
      from: `"Quiz Platform" <${process.env.EMAIL_USER}>`, // Email người gửi (hiển thị tên "Quiz Platform")
      to,                                                   // Email người nhận
      subject,                                              // Tiêu đề email
      html                                                  // Nội dung email (HTML)
    };

    // Gửi email
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error: any) {
    // Log chi tiết lỗi để debug
    console.error('❌ Email sending failed:');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    if (error.response) {
      console.error('   SMTP response:', error.response);
    }
    throw error;
  }
};

// ============================================
// EMAIL TEMPLATES
// ============================================
/**
 * Các template email được sử dụng trong hệ thống
 * - examInvitation: Email mời sinh viên tham gia bài thi
 */
export const emailTemplates = {
  /**
   * Template email mời sinh viên tham gia bài thi
   * @param studentName - Tên sinh viên
   * @param quizTitle - Tiêu đề bài thi
   * @param examLink - Link để tham gia thi
   * @param timeLimit - Thời gian làm bài (phút)
   * @returns HTML template của email
   */
  examInvitation: (studentName: string, quizTitle: string, examLink: string, timeLimit: number) => `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mời tham gia thi trắc nghiệm</title>
    </head>
    <body>
        <h2>Mời tham gia thi trắc nghiệm</h2>
        <p>Xin chào <strong>${studentName}</strong>,</p>
        <p>Bạn được mời tham gia bài thi: <strong>${quizTitle}</strong></p>
        <p>Thời gian thi: <strong>${timeLimit}</strong> phút</p>
        <p>Vui lòng click vào link bên dưới để tham gia thi:</p>
        <a href="${examLink}" style="background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Tham gia thi
        </a>
        <p>Link này sẽ hết hạn sau 24 giờ.</p>
        <p>Trân trọng,<br>Hệ thống thi trắc nghiệm</p>
    </body>
    </html>
  `
};