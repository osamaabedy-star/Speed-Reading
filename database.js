// database.js
let db;

// فتح قاعدة البيانات (أو إنشائها)
const request = indexedDB.open('StudentProgressDB', 1);

request.onupgradeneeded = function(event) {
  db = event.target.result;
  
  // جدول المستخدمين
  if (!db.objectStoreNames.contains('users')) {
    const userStore = db.createObjectStore('users', { keyPath: 'username' });
    userStore.createIndex('grade', 'grade', { unique: false });
    userStore.createIndex('semester', 'semester', { unique: false });
  }
  
  // جدول جلسات القراءة
  if (!db.objectStoreNames.contains('reading_sessions')) {
    const sessionStore = db.createObjectStore('reading_sessions', { 
      keyPath: 'id', 
      autoIncrement: true 
    });
    sessionStore.createIndex('username', 'username', { unique: false });
    sessionStore.createIndex('date', 'date', { unique: false });
    sessionStore.createIndex('lessonId', 'lessonId', { unique: false });
  }
  
  // جدول نتائج الاختبارات
  if (!db.objectStoreNames.contains('quiz_results')) {
    const quizStore = db.createObjectStore('quiz_results', { 
      keyPath: 'id', 
      autoIncrement: true 
    });
    quizStore.createIndex('username', 'username', { unique: false });
    quizStore.createIndex('date', 'date', { unique: false });
    quizStore.createIndex('lessonId', 'lessonId', { unique: false });
  }
};

request.onsuccess = function(event) {
  db = event.target.result;
  console.log('✅ قاعدة البيانات جاهزة');
};

request.onerror = function(event) {
  console.error('❌ خطأ في قاعدة البيانات:', event.target.error);
};

// دالة تجزئة بسيطة (يمكنك تحسينها لاحقاً)
function hashPassword(password) {
  return btoa(password); // تحويل إلى base64 (للتجربة فقط)
}

// تسجيل مستخدم جديد
function registerUser(username, password, grade, semester) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    
    const checkRequest = store.get(username);
    checkRequest.onsuccess = () => {
      if (checkRequest.result) {
        reject('اسم المستخدم موجود بالفعل');
        return;
      }
      
      const newUser = {
        username,
        password: hashPassword(password),
        grade,
        semester,
        createdAt: new Date().toISOString()
      };
      
      const addRequest = store.add(newUser);
      addRequest.onsuccess = () => resolve(newUser);
      addRequest.onerror = () => reject('فشل في التسجيل');
    };
  });
}

// تسجيل الدخول
function loginUser(username, password) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const request = store.get(username);
    
    request.onsuccess = () => {
      const user = request.result;
      if (user && user.password === hashPassword(password)) {
        // حفظ المستخدم في sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify({
          username: user.username,
          grade: user.grade,
          semester: user.semester
        }));
        resolve(user);
      } else {
        reject('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    };
    
    request.onerror = () => reject('خطأ في تسجيل الدخول');
  });
}

// تسجيل الخروج
function logoutUser() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

// حفظ جلسة قراءة
function saveReadingSession(sessionData) {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!currentUser) return Promise.reject('لا يوجد مستخدم مسجل');
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reading_sessions'], 'readwrite');
    const store = transaction.objectStore('reading_sessions');
    
    const session = {
      username: currentUser.username,
      lessonId: sessionData.lessonId,
      lessonTitle: sessionData.lessonTitle,
      date: new Date().toISOString(),
      speed: sessionData.speed,
      errors: sessionData.errors,
      duration: sessionData.duration,
      wordsRead: sessionData.wordsRead
    };
    
    const request = store.add(session);
    request.onsuccess = () => resolve(session);
    request.onerror = () => reject('فشل في حفظ الجلسة');
  });
}

// حفظ نتيجة الاختبار
function saveQuizResult(quizData) {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!currentUser) return Promise.reject('لا يوجد مستخدم مسجل');
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['quiz_results'], 'readwrite');
    const store = transaction.objectStore('quiz_results');
    
    const result = {
      username: currentUser.username,
      lessonId: quizData.lessonId,
      lessonTitle: quizData.lessonTitle,
      date: new Date().toISOString(),
      score: quizData.score,
      correctAnswers: quizData.correct,
      totalQuestions: quizData.total
    };
    
    const request = store.add(result);
    request.onsuccess = () => resolve(result);
    request.onerror = () => reject('فشل في حفظ النتيجة');
  });
}
