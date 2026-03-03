// database.js - الاتصال مع Google Sheets عبر API

const API_URL = 'https://script.google.com/macros/s/AKfycbwrupQNDoHN7OAn-EpuXnlwQ8newqNC_PRzJK-Q5nhS3D_fhS8LC3O0Xa9PeAzHzMUWkg/exec'; // ⚠️ غيّر هذا إلى الرابط بعد النشر
const API_KEY = '123456'; // ⚠️ يجب مطابقته مع المفتاح في Code.gs

async function apiCall(action, params = {}) {
  const payload = { action, apiKey: API_KEY, ...params };
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
  const data = await apiCall('register', { username, password, fullName, phone, grade, semester });
  return data.user;
}

async function loginUser(username, password) {
  const data = await apiCall('login', { username, password });
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
  await apiCall('updateUserApproval', { username, approved });
}

async function deleteUser(username) {
  await apiCall('deleteUser', { username });
}

// ================== دوال الدروس ==================
async function getAllLessons() {
  const data = await apiCall('getAllLessons');
  return data.lessons;
}

async function getLessonById(id) {
  const data = await apiCall('getLessonById', { id });
  return data.lesson;
}

async function saveLesson(lesson) {
  await apiCall('saveLesson', lesson);
}

async function deleteLesson(id) {
  await apiCall('deleteLesson', { id });
}

// ================== جلسات القراءة ==================
async function saveReadingSession(sessionData) {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!currentUser) throw new Error('لا يوجد مستخدم مسجل');
  await apiCall('saveReadingSession', {
    username: currentUser.username,
    ...sessionData
  });
}

async function getReadingSessions(username) {
  const data = await apiCall('getUserSessions', { username });
  return data.sessions;
}

// ================== نتائج الاختبارات ==================
async function saveQuizResult(quizData) {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!currentUser) throw new Error('لا يوجد مستخدم مسجل');
  await apiCall('saveQuizResult', {
    username: currentUser.username,
    ...quizData
  });
}

async function getQuizResults(username) {
  const data = await apiCall('getUserQuizzes', { username });
  return data.quizzes;
}

// ================== دوال مساعدة عامة ==================
function toIndianNumbers(num) {
  if (num === undefined || num === null) return '٠';
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, (d) => arabicNumbers[d]);
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/[&<>"]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return m;
  });
}
