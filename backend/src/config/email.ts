import nodemailer from 'nodemailer';

export const createTransporter = () => {
    return nodemailer.createTransport({  // Đổi từ createTransporter thành createTransport
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  };

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

export const emailTemplates = {
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