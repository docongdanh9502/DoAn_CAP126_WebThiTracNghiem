// ============================================
// FILE: index.tsx
// MÔ TẢ: Entry point của ứng dụng React (React 18)
// CHỨC NĂNG: Render App component vào DOM element #root
// ============================================

import React from 'react';                      // React library
import ReactDOM from 'react-dom/client';         // ReactDOM client (React 18 - createRoot API)
import './index.css';                            // CSS styles cho toàn bộ app
import App from './App';                         // Component App chính
import reportWebVitals from './reportWebVitals'; // Performance monitoring

// ============================================
// ROOT RENDERING - Render App vào DOM
// ============================================
/**
 * Tạo root element và render App component
 * - Sử dụng createRoot API của React 18 (thay vì ReactDOM.render)
 * - StrictMode: Bật strict mode để phát hiện potential problems
 */
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement // Lấy element #root từ HTML
);

// Render App component vào root
root.render(
  <React.StrictMode>  {/* StrictMode: Phát hiện warnings và potential problems trong development */}
    <App />            {/* Component App chính - chứa routing và toàn bộ ứng dụng */}
  </React.StrictMode>
);

// ============================================
// WEB VITALS - Performance monitoring
// ============================================
/**
 * Report Web Vitals - Đo lường hiệu suất của ứng dụng
 * Có thể gửi metrics đến analytics endpoint
 */
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
