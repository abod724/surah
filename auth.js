// ═══════════════════════════════════════
// ريشة — نظام تسجيل الدخول (Supabase)
// ═══════════════════════════════════════

var SUPABASE_URL = 'https://yleopsinexfenzfxvmlb.supabase.co';
var SUPABASE_KEY = 'sb_publishable_YQhUQbXOqkk5CDmhmOB5TQ_hpy-bisu';
var supabase = null;
var currentUser = null;
var authUI = null;

// تهيئة Supabase
function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // تحقق من الجلسة
    supabase.auth.getSession().then(function(s) {
      if (s.data.session) currentUser = s.data.session.user;
      updateAuthButton();
    });
    
    // استمع للتغييرات
    supabase.auth.onAuthStateChange(function(event, session) {
      currentUser = session ? session.user : null;
      updateAuthButton();
      if (session && event === 'SIGNED_IN') {
        closeAuth();
        if (typeof showToast === 'function') showToast('✅ مرحباً بك');
      }
    });
  }
}

// فتح نافذة تسجيل الدخول
function openAuth() {
  var modal = document.getElementById('authModal');
  if (!modal) return;
  modal.style.display = 'flex';
  
  if (!authUI && typeof window.SupabaseAuthUIVanilla !== 'undefined') {
    authUI = window.SupabaseAuthUIVanilla.AuthUI(supabase, {
      container: document.getElementById('authContainer'),
      theme: 'light',
      providers: ['email'],
      view: 'sign_in',
      showLinks: true,
      localization: {
        variables: {
          sign_in: {
            email_label: 'البريد الإلكتروني',
            password_label: 'كلمة المرور',
            email_input_placeholder: 'example@email.com',
            password_input_placeholder: 'كلمة المرور',
            button_label: 'دخول',
            loading_button_label: 'جاري الدخول...',
            link_text: 'ليس لديك حساب؟ سجّل الآن',
          },
          sign_up: {
            email_label: 'البريد الإلكتروني',
            password_label: 'كلمة المرور',
            email_input_placeholder: 'example@email.com',
            password_input_placeholder: 'كلمة المرور (6 أحرف على الأقل)',
            button_label: 'إنشاء حساب',
            loading_button_label: 'جاري الإنشاء...',
            link_text: 'لديك حساب؟ سجّل دخول',
          },
          forgotten_password: {
            email_label: 'البريد الإلكتروني',
            email_input_placeholder: 'example@email.com',
            button_label: 'إرسال رابط الاستعادة',
            loading_button_label: 'جاري الإرسال...',
            link_text: 'نسيت كلمة المرور؟',
          },
        },
      },
    });
  }
}

// إغلاق النافذة
function closeAuth() {
  var modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';
}

// تحديث زر الحساب
function updateAuthButton() {
  var btn = document.getElementById('authBtn');
  if (!btn) return;
  
  if (currentUser) {
    var name = (currentUser.user_metadata && currentUser.user_metadata.name) 
      || (currentUser.email ? currentUser.email.split('@')[0] : 'حسابي');
    btn.textContent = '👤 ' + name.substring(0, 10);
  } else {
    btn.textContent = '👤 دخول';
  }
}

// زر الحساب - يعرض خيارات
function handleAuthBtn() {
  if (currentUser) {
    var msg = 'مسجل دخول كـ:\n' + (currentUser.email || '') + '\n\nهل تريد تسجيل الخروج؟';
    if (confirm(msg)) {
      supabase.auth.signOut();
    }
  } else {
    openAuth();
  }
}

// حفظ المشروع
async function saveCurrentProject(title, type, data) {
  if (!currentUser) { openAuth(); return false; }
  
  var result = await supabase.from('projects').insert({
    user_id: currentUser.id,
    title: title,
    type: type,
    data: data
  });
  
  if (result.error) {
    if (typeof showToast === 'function') showToast('خطأ: ' + result.error.message);
    return false;
  }
  
  if (typeof showToast === 'function') showToast('✅ تم حفظ المشروع');
  return true;
}

// تحميل المشاريع
async function getMyProjects(type) {
  if (!currentUser) { openAuth(); return []; }
  
  var result = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('type', type)
    .order('created_at', { ascending: false });
  
  if (result.error) return [];
  return result.data || [];
}

// اختيار مشروع
async function loadMyProject(type, callback) {
  var projects = await getMyProjects(type);
  
  if (projects.length === 0) {
    if (typeof showToast === 'function') showToast('لا توجد مشاريع محفوظة');
    return;
  }
  
  var titles = projects.map(function(p, i) { return (i + 1) + '. ' + p.title; }).join('\n');
  var choice = prompt('اختر رقم المشروع:\n\n' + titles);
  if (!choice) return;
  
  var idx = parseInt(choice) - 1;
  if (idx < 0 || idx >= projects.length) return;
  
  if (callback) callback(projects[idx].data, projects[idx].title);
}

// تشغيل عند التحميل
window.addEventListener('load', function() {
  initSupabase();
});
