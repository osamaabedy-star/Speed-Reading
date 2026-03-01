// database.js - نسخة متصلة بـ Google Sheets

const API_URL = 'https://script.google.com/macros/s/AKfycbw-DXZc_1y00FZJEI6ylCsIMudJ81sttHRL_bzGnwsjtmWFOcCQcLEJtmWNkFZgNvJtcQ/exec'; // ضع رابط الـ Web App هنا

// ================== دوال مساعدة ==================
async function apiCall(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    const response = await fetch(url.toString(), {
      method: 'POST', // استخدام POST لتجاوز قيود طول URL
      mode: 'cors'
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// ================== دوال المستخدمين ==================
async function registerUser(username, password, fullName, phone, grade, semester) {
  const data = await apiCall('register', {
    username, password, fullName, phone, grade, semester
  });
  return data.user;
}

async function loginUser(username, password) {
  const data = await apiCall('login', { username, password });
  // حفظ المستخدم في sessionStorage
  sessionStorage.setItem('currentUser', JSON.stringify(data.user));
  return data.user;
}

function logoutUser() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

async function getAllUsers() {
  const data = await apiCall('getAllUsers');
  return data.users;
}

async function updateUserApproval(username, approved) {
  await apiCall('updateUserApproval', { username, approved: approved ? 'true' : 'false' });
}

async function deleteUser(username) {
  await apiCall('deleteUser', { username });
}

// ================== دوال النصوص ==================
async function getAllLessons() {
  const data = await apiCall('getAllLessons');
  return data.lessons;
}

async function saveLesson(lesson) {
  // تحويل الأسئلة إلى JSON string إذا كانت موجودة
  if (lesson.questions) {
    lesson.questionsJson = JSON.stringify(lesson.questions);
    delete lesson.questions;
  }
  await apiCall('saveLesson', lesson);
}

async function deleteLesson(id) {
  await apiCall('deleteLesson', { id });
}

// ================== دوال جلسات القراءة ==================
async function saveReadingSession(sessionData) {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!currentUser) throw new Error('لا يوجد مستخدم مسجل');

  const params = {
    username: currentUser.username,
    lessonId: sessionData.lessonId,
    lessonTitle: sessionData.lessonTitle,
    speed: sessionData.speed,
    errors: sessionData.errors,
    duration: sessionData.duration,
    wordsRead: sessionData.wordsRead,
    totalWords: sessionData.totalWords,
    completed: sessionData.completed ? 'true' : 'false',
    errorWordsJson: sessionData.errorWordsJson || ''
  };
  await apiCall('saveReadingSession', params);
}

async function saveQuizResult(quizData) {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!currentUser) throw new Error('لا يوجد مستخدم مسجل');

  const params = {
    username: currentUser.username,
    lessonId: quizData.lessonId,
    lessonTitle: quizData.lessonTitle,
    score: quizData.score,
    correctAnswers: quizData.correct,
    totalQuestions: quizData.total
  };
  await apiCall('saveQuizResult', params);
}

async function getReadingSessions(username) {
  const data = await apiCall('getUserSessions', { username });
  return data.sessions;
}

async function getQuizResults(username) {
  const data = await apiCall('getUserQuizzes', { username });
  return data.quizzes;
}

console.log('✅ database.js متصل بـ Google Sheets');
