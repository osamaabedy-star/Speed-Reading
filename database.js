// database.js - باستخدام Supabase للمستخدمين والتقارير فقط

const SUPABASE_URL = 'https://cnjiwrivdvysilxheydq.supabase.co'; // ضع رابط مشروعك
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaml3cml2ZHZ5c2lseGhleWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MjY2NTcsImV4cCI6MjA4ODEwMjY1N30.42fSorW4h76mtcQzVr_s-WATQfb6uQ4A5UR2HTW57KA'; // ضع المفتاح العام

// دالة مساعدة لاستدعاء Supabase REST API
async function supabaseRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    return response.json();
}

// ========== دوال المستخدمين ==========

// تسجيل مستخدم جديد
async function registerUser(username, password, fullName, phone, grade, semester) {
    // 1. إنشاء المستخدم في auth.users عبر Sign Up
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: `${username}@placeholder.com`, // Supabase يتطلب بريداً، نستخدم اسم المستخدم مع نطاق وهمي
            password: password,
            data: { username } // يمكن تخزين username في metadata
        })
    });
    
    const authData = await authResponse.json();
    if (authResponse.status !== 200) throw new Error(authData.msg || 'فشل التسجيل');

    // 2. إضافة البيانات الإضافية في جدول profiles
    const accountNumber = 'ACC' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    await supabaseRequest('profiles', {
        method: 'POST',
        body: JSON.stringify({
            id: authData.user.id, // الربط مع auth.users
            username,
            full_name: fullName,
            phone,
            account_number: accountNumber,
            grade,
            semester,
            approved: false,
            role: 'user'
        })
    });

    return { username, fullName, phone, accountNumber, grade, semester, approved: false };
}

// تسجيل الدخول
async function loginUser(username, password) {
    // تحويل username إلى البريد الوهمي
    const email = `${username}@placeholder.com`;
    
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email,
            password
        })
    });

    const authData = await authResponse.json();
    if (authResponse.status !== 200) throw new Error(authData.msg || 'فشل تسجيل الدخول');

    // جلب بيانات المستخدم من profiles
    const profiles = await supabaseRequest(`profiles?username=eq.${username}&select=*`);
    if (!profiles || profiles.length === 0) throw new Error('لم يتم العثور على بيانات المستخدم');

    const user = profiles[0];
    if (!user.approved) throw new Error('حسابك لم يتم تفعيله بعد');

    const userData = {
        username: user.username,
        fullName: user.full_name,
        phone: user.phone,
        accountNumber: user.account_number,
        grade: user.grade,
        semester: user.semester,
        approved: user.approved,
        role: user.role
    };

    sessionStorage.setItem('currentUser', JSON.stringify(userData));
    return userData;
}

// تغيير كلمة المرور
async function changePassword(newPassword) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) throw new Error('يجب تسجيل الدخول أولاً');

    const email = `${currentUser.username}@placeholder.com`;
    
    // Supabase يستخدم API لتحديث كلمة المرور للمستخدم المسجل
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${sessionStorage.getItem('supabase_token')}`, // نحتاج لتخزين التوكن
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'فشل تغيير كلمة المرور');
    }
}

// تسجيل الخروج
function logoutUser() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('supabase_token');
    window.location.href = 'login.html';
}

// ========== دوال الإدارة (للمسؤول) ==========

async function getAllUsers() {
    return await supabaseRequest('profiles?select=username,full_name,phone,account_number,grade,semester,approved,role,created_at');
}

async function updateUserApproval(username, approved) {
    await supabaseRequest(`profiles?username=eq.${username}`, {
        method: 'PATCH',
        body: JSON.stringify({ approved })
    });
}

async function deleteUser(username) {
    // حذف من auth.users (يتطلب service role key، لذا قد نحتاج لاستخدام admin API)
    // للتبسيط، نكتفي بحذف من profiles أو نعطله
    await supabaseRequest(`profiles?username=eq.${username}`, {
        method: 'DELETE'
    });
}

// ========== دوال التقارير (للمستخدم) ==========

async function getReadingSessions(username) {
    return await supabaseRequest(`reading_sessions?username=eq.${username}&order=date.desc`);
}

async function getQuizResults(username) {
    return await supabaseRequest(`quiz_results?username=eq.${username}&order=date.desc`);
}

// حفظ جلسة القراءة (يتم استدعاؤها من questions.html)
async function saveReadingSession(sessionData) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) throw new Error('لا يوجد مستخدم مسجل');

    await supabaseRequest('reading_sessions', {
        method: 'POST',
        body: JSON.stringify({
            username: currentUser.username,
            lesson_id: sessionData.lessonId,
            lesson_title: sessionData.lessonTitle,
            date: new Date().toISOString(),
            speed: sessionData.speed,
            errors: sessionData.errors,
            duration: sessionData.duration,
            words_read: sessionData.wordsRead,
            total_words: sessionData.totalWords,
            completed: sessionData.completed,
            error_words_json: sessionData.errorWordsJson
        })
    });
}

// حفظ نتيجة الاختبار
async function saveQuizResult(quizData) {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) throw new Error('لا يوجد مستخدم مسجل');

    await supabaseRequest('quiz_results', {
        method: 'POST',
        body: JSON.stringify({
            username: currentUser.username,
            lesson_id: quizData.lessonId,
            lesson_title: quizData.lessonTitle,
            date: new Date().toISOString(),
            score: quizData.score,
            correct_answers: quizData.correctAnswers,
            total_questions: quizData.totalQuestions
        })
    });
}

// ========== دوال مساعدة ==========

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
