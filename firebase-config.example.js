// File cấu hình Firebase - BẠN CẦN THAY ĐỔI CÁC GIÁ TRỊ NÀY
// Lấy từ Firebase Console: Project Settings > Your apps > Firebase SDK snippet > Config

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Xuất để sử dụng trong app.js
window.firebaseConfig = firebaseConfig;
