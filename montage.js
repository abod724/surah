// ============================================================
// ريشة المونتاج — montage.js
// ============================================================

// ============ SUPABASE ============
const SUPABASE_URL='https://yleopsinexfenzfxvmlb.supabase.co';
const SUPABASE_KEY='sb_publishable_YQhUQbXOqkk5CDmhmOB5TQ_hpy-bisu';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let currentUser=null;
let authMode='login';

// ============ HELPERS ============
function trackEvent(n){
  if(typeof goatcounter!=='undefined'&&goatcounter.count){
    goatcounter.count({path:n,title:n,event:true});
  }
}

function showToast(m){
  var t=document.getElementById('toast');
  t.textContent=m;
  t.classList.add('active');
  setTimeout(function(){t.classList.remove('active');},3000);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,function(m){
    return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

function debounce(fn,delay){
  var t;
  return function(){
    clearTimeout(t);
    var args=arguments,ctx=this;
    t=setTimeout(function(){fn.apply(ctx,args);},delay);
  };
}

// ============ LOADING ============
var _loadingCancelled=false;
function showLoading(m){
  _loadingCancelled=false;
  document.getElementById('loadingText').textContent=m||'جاري التحميل...';
  document.getElementById('loadingOverlay').classList.add('active');
}
function hideLoading(){
  document.getElementById('loadingOverlay').classList.remove('active');
}
window._cancelLoading=function(){
  _loadingCancelled=true;
  hideLoading();
  showToast('تم إلغاء التحميل');
};
function isCancelled(){return _loadingCancelled;}

// ============ AUTH ELEMENTS ============
const authOverlay=document.getElementById('authOverlay');
const authForm=document.getElementById('authForm');
const authEmail=document.getElementById('authEmail');
const authPassword=document.getElementById('authPassword');
const authSubmitBtn=document.getElementById('authSubmitBtn');
const authError=document.getElementById('authError');
const authSuccess=document.getElementById('authSuccess');
const authSwitchEl=document.getElementById('authSwitch');
const authSubtitle=document.getElementById('authSubtitle');
const confirmPasswordField=document.getElementById('confirmPasswordField');
const authPassword2=document.getElementById('authPassword2');

function showAuthError(m){
  authError.textContent=m;
  authError.classList.add('show');
  authSuccess.classList.remove('show');
}
function showAuthSuccess(m){
  authSuccess.textContent=m;
  authSuccess.classList.add('show');
  authError.classList.remove('show');
}
function clearAuthMessages(){
  authError.classList.remove('show');
  authSuccess.classList.remove('show');
}

// ============ OAUTH ============
window.loginWithGitHub=async function(){
  const u=window.location.origin+window.location.pathname;
  const{data,error}=await sb.auth.signInWithOAuth({provider:'github',options:{redirectTo:u}});
  if(error)showToast('خطأ: '+error.message);
};
window.loginWithGoogle=async function(){
  const u=window.location.origin+window.location.pathname;
  const{data,error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:u,scopes:'email profile openid'}});
  if(error)showToast('خطأ: '+error.message);
};

// ============ AUTH MODE ============
function setAuthMode(mode){
  authMode=mode;
  clearAuthMessages();
  if(mode==='signup'){
    authSubtitle.textContent='أنشئ حسابك الجديد';
    authSubmitBtn.textContent='إنشاء حساب';
    authSwitchEl.innerHTML='عندك حساب؟ <button type="button" id="authToggleMode">سجّل دخول</button>';
    confirmPasswordField.style.display='block';
    authPassword2.required=true;
  } else {
    authSubtitle.textContent='سجّل دخولك للبدء';
    authSubmitBtn.textContent='دخول';
    authSwitchEl.innerHTML='ما عندك حساب؟ <button type="button" id="authToggleMode">أنشئ حساب</button>';
    confirmPasswordField.style.display='none';
    authPassword2.required=false;
    authPassword2.value='';
  }
  document.getElementById('authToggleMode').addEventListener('click',function(){
    setAuthMode(authMode==='login'?'signup':'login');
  });
}
setAuthMode('login');

// ============ AUTH SUBMIT ============
authForm.addEventListener('submit',async function(e){
  e.preventDefault();
  clearAuthMessages();
  const email=authEmail.value.trim();
  const password=authPassword.value;
  if(!email||!password){showAuthError('عبّئ كل الحقول');return;}
  if(password.length<6){showAuthError('كلمة المرور 6 أحرف على الأقل');return;}
  authSubmitBtn.disabled=true;
  const orig=authSubmitBtn.textContent;
  authSubmitBtn.textContent='جاري...';
  try{
    if(authMode==='signup'){
      const p2=authPassword2.value;
      if(password!==p2){
        showAuthError('كلمتا المرور غير متطابقتين');
        authSubmitBtn.disabled=false;
        authSubmitBtn.textContent=orig;
        return;
      }
      const{data,error}=await sb.auth.signUp({
        email,
        password,
        options:{emailRedirectTo:window.location.origin+window.location.pathname}
      });
      if(error)throw error;
      if(data.user&&!data.session){
        showAuthSuccess('✅ تم إنشاء الحساب! افتح بريدك واضغط رابط التأكيد.');
      } else if(data.session){
        onLoginSuccess(data.user);
      }
    } else {
      const{data,error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw error;
      onLoginSuccess(data.user);
    }
  } catch(err){
    const msg=(err&&err.message)?err.message:'حدث خطأ';
    if(msg.includes('Invalid login'))showAuthError('البريد أو كلمة المرور غير صحيحة');
    else if(msg.includes('already registered'))showAuthError('هذا البريد مسجّل مسبقاً');
    else if(msg.includes('Email not confirmed'))showAuthError('لازم تأكيد البريد أولاً');
    else showAuthError(msg);
  } finally {
    authSubmitBtn.disabled=false;
    authSubmitBtn.textContent=orig;
  }
});

// ============ LOGOUT ============
document.getElementById('logoutBtn').addEventListener('click',async function(){
  if(!confirm('تسجيل الخروج؟'))return;
  await sb.auth.signOut();
  currentUser=null;
  location.reload();
});

// ============ ON LOGIN SUCCESS ============
function onLoginSuccess(user){
  currentUser=user;
  authOverlay.classList.add('hidden');
  document.getElementById('appRoot').classList.add('ready');
  const chip=document.getElementById('userChip');
  if(chip&&user)chip.textContent=user.email||(user.user_metadata&&user.user_metadata.user_name)||'مستخدم';
  setTimeout(function(){pushHistory();},600);
}

// ============ INIT AUTH ============
(async function initAuth(){
  try{
    if(window.location.hash&&window.location.hash.includes('access_token')){
      await new Promise(function(r){setTimeout(r,600);});
    }
    const{data:{session}}=await sb.auth.getSession();
    if(session&&session.user){
      onLoginSuccess(session.user);
      if(window.location.hash){
        setTimeout(function(){history.replaceState(null,'',window.location.pathname);},500);
      }
    } else {
      authOverlay.classList.remove('hidden');
    }
  } catch(e){
    console.error('Auth init error:',e);
    authOverlay.classList.remove('hidden');
  }
})();

// ============ AUTH STATE CHANGE ============
sb.auth.onAuthStateChange(function(event,session){
  if(event==='SIGNED_OUT'){
    currentUser=null;
    authOverlay.classList.remove('hidden');
    document.getElementById('appRoot').classList.remove('ready');
  }
  if(event==='SIGNED_IN'&&session&&session.user){
    onLoginSuccess(session.user);
  }
  if(event==='PASSWORD_RECOVERY'){
    document.getElementById('resetOverlay').classList.add('active');
  }
});

// ============ FORGOT PASSWORD ============
document.getElementById('forgotBtn').addEventListener('click',async function(){
  const email=prompt('اكتب إيميلك:');
  if(!email)return;
  if(!email.includes('@')){showToast('إيميل غير صحيح');return;}
  try{
    const{error}=await sb.auth.resetPasswordForEmail(email,{
      redirectTo:window.location.origin+window.location.pathname
    });
    if(error)throw error;
    showToast('✅ تم إرسال الرابط');
  } catch(err){
    showToast('فشل: '+(err.message||''));
  }
});

// ============ RESET PASSWORD ============
document.getElementById('resetForm').addEventListener('submit',async function(e){
  e.preventDefault();
  const p1=document.getElementById('resetPassword').value;
  const p2=document.getElementById('resetPassword2').value;
  const errEl=document.getElementById('resetError');
  errEl.classList.remove('show');
  if(p1.length<6){errEl.textContent='كلمة المرور 6 أحرف على الأقل';errEl.classList.add('show');return;}
  if(p1!==p2){errEl.textContent='كلمتا المرور غير متطابقتين';errEl.classList.add('show');return;}
  const btn=document.getElementById('resetBtn');
  btn.disabled=true;
  try{
    const{error}=await sb.auth.updateUser({password:p1});
    if(error)throw error;
    showToast('✅ تم التحديث');
    document.getElementById('resetOverlay').classList.remove('active');
    setTimeout(function(){window.location.hash='';window.location.reload();},1200);
  } catch(err){
    errEl.textContent=err.message||'فشل';
    errEl.classList.add('show');
  } finally {
    btn.disabled=false;
  }
});

// ============ GLOBAL STATE ============
var images=[];
var audioUpload=null,musicFile=null;
var currentSize='1080x1080',currentTransition='fade',currentLayout='single';
var selectedImageIndex=-1;
var isExporting=false,isPreviewing=false,previewAnimationId=null;
var mediaRecorder=null,audioChunks=[],recordedAudioBlob=null;
var recordingStartTime=0,recordingTimerInterval=null,recordingStream=null;
var selectedAudio=null;
var cropCanvas=null,cropRect=null,cropOriginalImage=null,cropScale=1;
var currentProjectId=null;
var textElements=[],stickers=[],watermark=null;
var currentTextPosition='mc',currentStickerPosition='mc';
var backgroundMode='color',backgroundCustomColor='#0f172a';
var exportQuality='medium';
var BITRATE_MAP={'low':3000000,'medium':8000000,'high':15000000,'ultra':25000000};
var QUALITY_LABELS={'low':'منخفضة','medium':'متوسطة','high':'عالية','ultra':'فائقة'};

// ============ HISTORY ============
var historyArr=[];
var historyIndex=-1;
var MAX_HISTORY=30;
var isRestoring=false;

function captureState(){
  return JSON.stringify({
    images:images.map(function(i){
      return{
        src:i.src,type:i.type||'image',animation:i.animation,duration:i.duration,
        rotation:i.rotation,flipH:i.flipH,flipV:i.flipV,speed:i.speed,
        crop:i.crop,trim:i.trim,filter:i.filter
      };
    }),
    currentSize:currentSize,
    currentTransition:currentTransition,
    currentLayout:currentLayout,
    textElements:JSON.parse(JSON.stringify(textElements)),
    stickers:JSON.parse(JSON.stringify(stickers)),
    watermark:watermark?{
      enabled:watermark.enabled,type:watermark.type,text:watermark.text,
      color:watermark.color,size:watermark.size,position:watermark.position,
      opacity:watermark.opacity
    }:null,
    selectedAudio:selectedAudio,
    backgroundMode:backgroundMode,
    backgroundCustomColor:backgroundCustomColor,
    exportQuality:exportQuality
  });
}

function pushHistory(){
  if(isRestoring)return;
  var state=captureState();
  if(historyIndex>=0&&historyArr[historyIndex]===state)return;
  historyArr.splice(historyIndex+1);
  historyArr.push(state);
  if(historyArr.length>MAX_HISTORY)historyArr.shift();
  historyIndex=historyArr.length-1;
  updateHistoryBtns();
}

function updateHistoryBtns(){
  var u=document.getElementById('undoBtn'),r=document.getElementById('redoBtn');
  if(u)u.disabled=historyIndex<=0;
  if(r)r.disabled=historyIndex>=historyArr.length-1;
}

async function undo(){
  if(historyIndex<=0){showToast('لا يوجد تراجع');return;}
  historyIndex--;
  await restoreState(historyArr[historyIndex]);
  updateHistoryBtns();
  showToast('↩️ تم التراجع');
}

async function redo(){
  if(historyIndex>=historyArr.length-1){showToast('لا يوجد إعادة');return;}
  historyIndex++;
  await restoreState(historyArr[historyIndex]);
  updateHistoryBtns();
  showToast('↪️ تم الإعادة');
}

async function restoreState(json){
  isRestoring=true;
  try{
    var d=JSON.parse(json);
    var oldImages=images;
    images=[];
    for(var i=0;i<d.images.length;i++){
      var saved=d.images[i];
      var existing=oldImages.find(function(o){return o.src===saved.src;});
      if(existing){
        images.push({
          type:saved.type,img:existing.img,media:existing.media,
          originalImg:existing.originalImg,blob:existing.blob,src:saved.src,
          animation:saved.animation,duration:saved.duration,rotation:saved.rotation,
          flipH:saved.flipH,flipV:saved.flipV,speed:saved.speed,
          crop:saved.crop,trim:saved.trim,filter:saved.filter
        });
      } else {
        await new Promise(function(res){
          if(saved.type==='video'){
            var v=document.createElement('video');
            v.src=saved.src;
            v.muted=true;
            v.playsInline=true;
            v.preload='metadata';
            v.onloadedmetadata=function(){
              images.push({
                type:'video',img:v,media:v,originalImg:v,src:saved.src,
                animation:saved.animation,duration:saved.duration,rotation:saved.rotation,
                flipH:saved.flipH,flipV:saved.flipV,speed:saved.speed,
                crop:saved.crop,trim:saved.trim,filter:saved.filter
              });
              res();
            };
            v.onerror=res;
          } else {
            var im=new Image();
            im.onload=function(){
              images.push({
                type:'image',img:im,media:im,originalImg:im,src:saved.src,
                animation:saved.animation,duration:saved.duration,rotation:saved.rotation,
                flipH:saved.flipH,flipV:saved.flipV,speed:saved.speed,
                crop:saved.crop,trim:saved.trim,filter:saved.filter
              });
              res();
            };
            im.onerror=res;
            im.src=saved.src;
          }
        });
      }
    }
    currentSize=d.currentSize;
    currentTransition=d.currentTransition;
    currentLayout=d.currentLayout;
    textElements=d.textElements||[];
    stickers=d.stickers||[];
    if(d.backgroundMode)backgroundMode=d.backgroundMode;
    if(d.backgroundCustomColor)backgroundCustomColor=d.backgroundCustomColor;
    if(d.exportQuality)exportQuality=d.exportQuality;
    watermark=d.watermark?{
      enabled:d.watermark.enabled,type:d.watermark.type,text:d.watermark.text,
      color:d.watermark.color,size:d.watermark.size,position:d.watermark.position,
      opacity:d.watermark.opacity,img:window._wmImgCache||null
    }:null;

    document.querySelectorAll('#sizeOptions .opt-btn').forEach(function(b){
      b.classList.toggle('active',b.dataset.size===currentSize);
    });
    document.querySelectorAll('#transitionOptions .opt-btn').forEach(function(b){
      b.classList.toggle('active',b.dataset.transition===currentTransition);
    });
    document.querySelectorAll('#qualityOptions .opt-btn').forEach(function(b){
      b.classList.toggle('active',b.dataset.quality===exportQuality);
    });

    if(watermark&&watermark.enabled){
      document.getElementById('wmOn').classList.add('active');
      document.getElementById('wmOff').classList.remove('active');
      document.getElementById('wmContent').classList.remove('section-hidden');
    } else {
      document.getElementById('wmOn').classList.remove('active');
      document.getElementById('wmOff').classList.add('active');
      document.getElementById('wmContent').classList.add('section-hidden');
    }
    renderImagesGrid();
    renderLayouts();
    renderElementsList();
    updateButtons();
    updateInfo();
  } finally {
    isRestoring=false;
  }
}

// ============ KEYBOARD SHORTCUTS ============
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.shiftKey){
    e.preventDefault();
    undo();
  } else if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='y'||(e.shiftKey&&e.key.toLowerCase()==='z'))){
    e.preventDefault();
    redo();
  }
});

document.getElementById('undoBtn').addEventListener('click',undo);
document.getElementById('redoBtn').addEventListener('click',redo);

// ============ CONSTANTS ============
var POSITIONS={
  'tl':{x:0.15,y:0.15},'tc':{x:0.5,y:0.15},'tr':{x:0.85,y:0.15},
  'ml':{x:0.15,y:0.5},'mc':{x:0.5,y:0.5},'mr':{x:0.85,y:0.5},
  'bl':{x:0.15,y:0.85},'bc':{x:0.5,y:0.85},'br':{x:0.85,y:0.85}
};
var POSITION_LABELS={'tl':'↖','tc':'↑','tr':'↗','ml':'←','mc':'●','mr':'→','bl':'↙','bc':'↓','br':'↘'};

var LAYOUTS=[
  {id:'single',name:'صورة واحدة',count:1,cells:[{x:0,y:0,w:1,h:1}]},
  {id:'splitH',name:'صورتان جنب',count:2,cells:[{x:0,y:0,w:0.5,h:1},{x:0.5,y:0,w:0.5,h:1}]},
  {id:'splitV',name:'صورتان فوق',count:2,cells:[{x:0,y:0,w:1,h:0.5},{x:0,y:0.5,w:1,h:0.5}]},
  {id:'triple',name:'3 صور',count:3,cells:[{x:0,y:0,w:0.5,h:0.5},{x:0.5,y:0,w:0.5,h:0.5},{x:0,y:0.5,w:1,h:0.5}]},
  {id:'grid4',name:'4 صور',count:4,cells:[{x:0,y:0,w:0.5,h:0.5},{x:0.5,y:0,w:0.5,h:0.5},{x:0,y:0.5,w:0.5,h:0.5},{x:0.5,y:0.5,w:0.5,h:0.5}]},
  {id:'overlay',name:'تراكب',count:2,cells:[{x:0,y:0,w:1,h:1},{x:0.65,y:0.65,w:0.3,h:0.3,overlay:true}]}
];

// ============ TEMPLATES ============
var TEMPLATE_CATEGORIES=[
  {id:'all',name:'الكل',emoji:'✨'},
  {id:'religious',name:'ديني',emoji:'🕌'},
  {id:'occasions',name:'مناسبات',emoji:'🎉'},
  {id:'national',name:'وطني',emoji:'🇸🇦'},
  {id:'travel',name:'سفر',emoji:'✈️'},
  {id:'business',name:'أعمال',emoji:'💼'},
  {id:'social',name:'سوشيال',emoji:'📱'},
  {id:'mood',name:'مشاعر',emoji:'❤️'},
  {id:'family',name:'عائلة',emoji:'👨‍👩‍👧'},
  {id:'shapes',name:'أشكال',emoji:'🎨'}
];
var currentTemplateCategory='all';

function T(id,cat,name,emoji,size,trans,layout,anim,bg,txt,tc,st,sp){
  return{
    id:id,cat:cat,name:name,emoji:emoji,size:size,transition:trans,
    layout:layout,animation:anim,bg:bg,bgMode:'color',text:txt,
    textColor:tc,sticker:st,stickerPos:sp||'tc'
  };
}

var TEMPLATES=[
  T('ramadan','religious','رمضان','🌙','1080x1920','zoom','single','pulse','#0c1445','رمضان كريم','#fbbf24','🌙','tc'),
  T('eid_fitr','religious','عيد فطر','✨','1080x1920','zoom','single','pulse','#064e3b','عيد فطر مبارك','#fde047','✨','tc'),
  T('eid_adha','religious','عيد أضحى','🐑','1080x1920','zoom','single','pulse','#451a03','عيد أضحى مبارك','#fef3c7','🐑','bc'),
  T('hajj','religious','حج','🕋','1080x1920','fade','single','kenRight','#000000','لبيك اللهم لبيك','#fbbf24','🕋','tc'),
  T('umrah','religious','عمرة','🕌','1080x1920','fade','single','kenRight','#0c4a6e','عمرة مقبولة','#e0f2fe','🕌','tc'),
  T('quran','religious','قرآن','📖','1080x1920','fade','single','kenRight','#14532d','بسم الله الرحمن الرحيم','#fde047','📖','bc'),
  T('jumuah','religious','جمعة','🕌','1080x1920','fade','single','kenRight','#0f172a','جمعة مباركة','#fef3c7','🕌','tc'),
  T('dua','religious','دعاء','🤲','1080x1920','fade','single','fadeIn','#1e1b4b','اللهم استجب','#e0e7ff','🤲','tc'),
  T('graduation','occasions','تخرج','🎓','1080x1920','zoom','single','zoomIn','#1e3a8a','مبارك التخرج','#fbbf24','🎓','tc'),
  T('wedding','occasions','زواج','💍','1080x1350','fade','single','kenRight','#831843','ألف مبروك','#fce7f3','💍','tc'),
  T('baby','occasions','مولود','👶','1080x1350','zoom','single','pulse','#0891b2','مبروك المولود','#cffafe','👶','tc'),
  T('birthday','occasions','عيد ميلاد','🎂','1080x1080','zoom','single','pulse','#7c3aed','كل عام وأنت بخير','#fde047','🎂','tc'),
  T('congrats','occasions','تهنئة','🎊','1080x1080','zoom','single','bounce','#ca8a04','ألف مبروك','#fef9c3','🎊','tc'),
  T('condolence','occasions','عزاء','🖤','1080x1350','fade','single','fadeIn','#0f172a','إنا لله وإنا إليه راجعون','#94a3b8','🖤','bc'),
  T('new_year','occasions','سنة جديدة','🎆','1080x1920','zoom','single','pulse','#4c1d95','سنة جديدة سعيدة','#fde047','🎆','tc'),
  T('success','occasions','نجاح','🏆','1080x1080','zoom','single','pulse','#065f46','مبروك النجاح','#fde047','🏆','tc'),
  T('promotion','occasions','ترقية','📈','1080x1080','slideUp','single','zoomIn','#0f172a','مبروك الترقية','#bae6fd','📈','tc'),
  T('national','national','يوم وطني','🇸🇦','1080x1920','zoom','single','zoomIn','#14532d','يومنا الوطني','#ffffff','🇸🇦','tc'),
  T('founding','national','يوم التأسيس','🏛️','1080x1920','fade','single','kenRight','#7c2d12','يوم التأسيس','#fef3c7','🏛️','tc'),
  T('flag_day','national','يوم العلم','🚩','1080x1920','zoom','single','pulse','#14532d','يوم العلم','#ffffff','🚩','tc'),
  T('travel','travel','سفر','✈️','1080x1080','slideRight','single','kenRight','#0c4a6e','رحلة سعيدة','#e0f2fe','✈️','tc'),
  T('beach','travel','شاطئ','🏖️','1080x1080','slideUp','single','panDown','#0891b2','شاطئ جميل','#cffafe','🏖️','bc'),
  T('mountains','travel','جبال','🏔️','1080x1350','slideRight','single','kenRight','#1e293b','قمم شاهقة','#e2e8f0','🏔️','tc'),
  T('desert','travel','صحراء','🏜️','1080x1080','fade','single','kenRight','#7c2d12','رمال ذهبية','#fed7aa','🏜️','bc'),
  T('nature','travel','طبيعة','🌿','1080x1080','fade','single','kenLeft','#14532d','جمال الطبيعة','#dcfce7','🌿','tc'),
  T('sunset','travel','غروب','🌅','1080x1920','fade','single','zoomIn','#7c2d12','غروب جميل','#fed7aa','🌅','bc'),
  T('city','travel','مدينة','🏙️','1080x1080','slideUp','single','zoomIn','#1e293b','أضواء المدينة','#e2e8f0','🏙️','tc'),
  T('business','business','إعلان','📢','1080x1080','slideUp','single','zoomIn','#0f172a','عرض خاص','#fbbf24','📢','tc'),
  T('product','business','منتج','🛍️','1080x1080','zoom','single','zoomIn','#3b0764','منتج جديد','#fde047','🛍️','tc'),
  T('sale','business','تخفيض','🏷️','1080x1080','zoom','single','pulse','#7f1d1d','تخفيضات','#fde047','🏷️','tc'),
  T('store','business','متجر','🏪','1080x1080','slideRight','single','zoomIn','#0c4a6e','افتتاح المتجر','#e0f2fe','🏪','tc'),
  T('restaurant','business','مطعم','🍽️','1080x1350','fade','single','kenRight','#7c2d12','ألذ طعام','#fed7aa','🍽️','bc'),
  T('cafe','business','مقهى','☕','1080x1080','fade','single','zoomIn','#292524','قهوة الصباح','#fef3c7','☕','tc'),
  T('realestate','business','عقار','🏠','1080x1080','slideUp','single','zoomIn','#14532d','عقار مميز','#dcfce7','🏠','tc'),
  T('car','business','سيارة','🚗','1080x1080','slideLeft','single','kenRight','#0f172a','سيارة الأحلام','#e2e8f0','🚗','tc'),
  T('services','business','خدمات','🛠️','1080x1080','fade','single','zoomIn','#475569','خدماتنا','#f1f5f9','🛠️','tc'),
  T('story','social','ستوري','📱','1080x1920','slideUp','single','zoomIn','#3b0764','ستوري','#e9d5ff','📱','tc'),
  T('reels','social','ريلز','🎞️','1080x1920','zoom','single','kenRight','#831843','ريلز','#fce7f3','🎞️','tc'),
  T('tiktok','social','تيك توك','🎵','1080x1920','slideUp','single','zoomIn','#0f172a','تيك توك','#fce7f3','🎵','tc'),
  T('youtube','social','يوتيوب','▶️','1920x1080','fade','single','kenRight','#7f1d1d','قناة جديدة','#ffffff','▶️','tc'),
  T('instagram','social','انستقرام','📷','1080x1350','fade','single','zoomIn','#831843','انستقرام','#fed7aa','📷','tc'),
  T('snapchat','social','سناب','👻','1080x1920','slideUp','single','pulse','#ca8a04','سناب','#fef9c3','👻','tc'),
  T('twitter','social','تويتر','🐦','1080x1080','fade','single','zoomIn','#0c4a6e','تغريدة','#e0f2fe','🐦','tc'),
  T('podcast','social','بودكاست','🎙️','1080x1080','fade','single','kenRight','#3b0764','بودكاست','#e9d5ff','🎙️','tc'),
  T('love','mood','حب','❤️','1080x1350','fade','single','pulse','#831843','أحبك','#fce7f3','❤️','tc'),
  T('sad','mood','حزن','💔','1080x1350','fade','single','fadeIn','#1e293b','حزين','#94a3b8','💔','bc'),
  T('joy','mood','فرح','😊','1080x1080','zoom','single','pulse','#ca8a04','فرحان','#fef9c3','😊','tc'),
  T('hope','mood','أمل','🌅','1080x1920','fade','single','kenRight','#7c2d12','تفاءل','#fed7aa','🌅','bc'),
  T('motivation','mood','تحفيز','💪','1080x1920','zoom','single','zoomIn','#7c2d12','أنت قادر','#fde047','💪','tc'),
  T('memory','mood','ذكرى','📸','1080x1080','fade','single','kenRight','#292524','ذكرى جميلة','#fef3c7','📸','bc'),
  T('friendship','mood','صداقة','🤝','1080x1080','zoom','single','zoomIn','#14532d','صديق وفي','#dcfce7','🤝','tc'),
  T('peace','mood','هدوء','🕊️','1080x1350','fade','single','fadeIn','#0c4a6e','سلام داخلي','#e0f2fe','🕊️','tc'),
  T('miss_you','mood','اشتقت','💭','1080x1350','fade','single','kenLeft','#475569','اشتقت لك','#f1f5f9','💭','tc'),
  T('dream','mood','حلم','✨','1080x1920','zoom','single','pulse','#3b0764','حلمي','#fde047','✨','tc'),
  T('football','mood','كرة قدم','⚽','1080x1080','slideLeft','single','kenRight','#14532d','هدف','#fde047','⚽','tc'),
  T('sport','mood','رياضة','🏃','1080x1920','slideUp','single','zoomIn','#14532d','رياضة','#dcfce7','🏃','tc'),
  T('smile','mood','ابتسامة','😄','1080x1080','zoom','single','bounce','#ca8a04','ابتسم','#fef9c3','😄','tc'),
  T('morning','mood','صباح','☀️','1080x1920','fade','single','zoomIn','#0c4a6e','صباح الخير','#fbbf24','☀️','tc'),
  T('night','mood','مساء','🌙','1080x1920','fade','single','fadeIn','#0f172a','مساء الخير','#e0e7ff','🌙','tc'),
  T('family','family','عائلة','👨‍👩‍👧','1080x1080','fade','grid4','zoomIn','#0f172a','عائلتي','#e0f2fe','👨‍👩‍👧','tc'),
  T('kids','family','أطفال','🧒','1080x1080','zoom','single','bounce','#0891b2','أطفال','#cffafe','🧒','tc'),
  T('school','family','مدرسة','📚','1080x1080','slideUp','single','zoomIn','#1e293b','مدرستي','#e2e8f0','📚','tc'),
  T('kindergarten','family','روضة','🧸','1080x1080','zoom','single','bounce','#ca8a04','روضتي','#fef9c3','🧸','tc'),
  T('mother','family','أمي','💐','1080x1350','fade','single','kenRight','#831843','أمي الغالية','#fce7f3','💐','tc'),
  T('father','family','أبي','👔','1080x1350','fade','single','kenRight','#1e3a8a','أبي العزيز','#dbeafe','👔','tc'),
  T('grid','shapes','شبكة','🎨','1080x1080','slideUp','grid4','zoomIn','#475569','شبكة','#f1f5f9','🎨','tc'),
  T('split','shapes','مقسّم','📐','1920x1080','slideLeft','splitH','panRight','#1e293b','مقسم','#e2e8f0','📐','tc'),
  T('triple_tpl','shapes','ثلاثي','🎯','1080x1080','zoom','triple','zoomIn','#3b0764','ثلاثي','#e9d5ff','🎯','tc'),
  T('overlay_tpl','shapes','تراكب','🖼️','1080x1920','fade','overlay','zoomIn','#0c4a6e','تراكب','#e0f2fe','🖼️','tc'),
  T('collage','shapes','كولاج','✨','1080x1080','zoom','grid4','pulse','#831843','كولاج','#fce7f3','✨','tc'),
  T('vertical_split','shapes','فوق وتحت','📏','1080x1080','slideUp','splitV','zoomIn','#14532d','فوق وتحت','#dcfce7','📏','tc'),
  T('before_after','shapes','قبل وبعد','🔀','1080x1080','slideRight','splitH','none','#475569','قبل وبعد','#f1f5f9','🔀','tc')
];

var EMOJIS=['😀','😂','😍','🥰','😎','🤩','😭','😱','🤔','🙄','😴','🤗','👍','👏','🙏','👌','✌️','🤝','💪','❤️','💕','💖','💔','✨','⭐','🌟','🔥','⚡','💫','🎉','🎊','🎈','🎁','🎂','🎓','👑','💎','🌸','🌹','🌺','🌻','🍀','🌈','☀️','🌙','⭐','🍕','🍔','☕','🍦','⚽','🏀','🎮','🎵','🎶','📱','💻','📸','💯','✅','❗','❓','💬','📍','🚀'];

// ============ TABS ============
window.switchTab=function(name,btn){
  document.querySelectorAll('.tab-btn').forEach(function(t){t.classList.remove('active');});
  document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
  btn.classList.add('active');
  document.getElementById('panel-'+name).classList.add('active');
  if(name==='animate')updateAnimateTab();
};

// ============ QUALITY ============
document.querySelectorAll('#qualityOptions .opt-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('#qualityOptions .opt-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    exportQuality=this.dataset.quality;
    updateInfo();
    pushHistory();
    showToast('الجودة: '+QUALITY_LABELS[exportQuality]);
  });
});

// ============ IMAGE INPUT ============
document.getElementById('imageInput').addEventListener('change',async function(e){
  var files=Array.from(e.target.files);
  if(files.length===0)return;
  if(images.length+files.length>30){showToast('الحد الأقصى 30 عنصر');return;}
  showLoading('جاري تحميل الوسائط...');
  var loaded=0;
  for(var i=0;i<files.length;i++){
    if(isCancelled())break;
    var file=files[i];
    try{
      if(file.type.startsWith('image/')){await loadImageFile(file);loaded++;}
      else if(file.type.startsWith('video/')){await loadVideoFile(file);loaded++;}
    } catch(err){console.error(err);}
  }
  hideLoading();
  if(!isCancelled()){
    renderImagesGrid();
    renderLayouts();
    updateButtons();
    updateInfo();
    pushHistory();
    showToast('تمت إضافة '+loaded+' عنصر');
  }
  e.target.value='';
  if(selectedImageIndex<0&&images.length>0){selectedImageIndex=0;renderImagesGrid();}
});

// ============ LOAD IMAGE ============
function loadImageFile(file){
  return new Promise(function(resolve,reject){
    var reader=new FileReader();
    reader.onload=function(ev){
      var img=new Image();
      img.onload=function(){
        images.push({
          type:'image',img:img,media:img,originalImg:img,
          animation:'none',duration:3,rotation:0,flipH:false,flipV:false,
          src:ev.target.result,speed:1,crop:null,trim:null,filter:'none'
        });
        resolve();
      };
      img.onerror=reject;
      img.src=ev.target.result;
    };
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

// ============ LOAD VIDEO ============
function loadVideoFile(file){
  return new Promise(function(resolve,reject){
    var url=URL.createObjectURL(file);
    var video=document.createElement('video');
    video.src=url;
    video.muted=false;
    video.playsInline=true;
    video.preload='metadata';
    video.onloadedmetadata=function(){
      video.currentTime=0.1;
      var done=false;
      var finish=function(){
        if(done)return;
        done=true;
        var dur=Math.min(video.duration||5,60);
        images.push({
          type:'video',img:video,media:video,originalImg:video,
          blob:file,src:url,animation:'fadeIn',duration:dur,
          rotation:0,flipH:false,flipV:false,speed:1,
          crop:null,trim:null,filter:'none'
        });
        resolve();
      };
      video.onseeked=finish;
      setTimeout(finish,2000);
    };
    video.onerror=function(){reject(new Error('فشل تحميل الفيديو'));};
    setTimeout(function(){reject(new Error('انتهت المهلة'));},15000);
  });
}

// ============ RENDER IMAGES GRID ============
function renderImagesGrid(){
  var grid=document.getElementById('imagesGrid');
  var emptyHint=document.getElementById('imagesEmpty');
  grid.innerHTML='';
  if(images.length===0){
    emptyHint.style.display='block';
    selectedImageIndex=-1;
    updateAnimateTab();
    return;
  }
  emptyHint.style.display='none';
  images.forEach(function(item,index){
    var el=document.createElement('div');
    el.className='image-item'+(index===selectedImageIndex?' selected':'');
    el.draggable=true;
    el.dataset.index=index;
    var mediaEl;
    if(item.type==='video'){
      mediaEl=document.createElement('video');
      mediaEl.src=item.src;
      mediaEl.muted=true;
      mediaEl.playsInline=true;
      mediaEl.preload='metadata';
      setTimeout(function(){try{mediaEl.currentTime=item.trim?item.trim.start:0.1;}catch(e){}},200);
    } else {
      mediaEl=document.createElement('img');
      mediaEl.src=item.src;
    }
    var transform='rotate('+item.rotation+'deg)';
    if(item.flipH)transform+=' scaleX(-1)';
    if(item.flipV)transform+=' scaleY(-1)';
    mediaEl.style.transform=transform;
    if(item.filter&&item.filter!=='none'){
      mediaEl.style.filter=
        item.filter==='grayscale'?'grayscale(1)':
        item.filter==='warm'?'saturate(1.3) hue-rotate(-10deg)':
        item.filter==='cold'?'saturate(1.1) hue-rotate(20deg)':
        item.filter==='vintage'?'sepia(0.6) saturate(1.2)':
        item.filter==='cinematic'?'contrast(1.3) saturate(0.9)':
        item.filter==='hdr'?'contrast(1.4) saturate(1.3)':
        item.filter==='pastel'?'saturate(0.7) brightness(1.15)':
        item.filter==='vibrant'?'saturate(1.6)':
        item.filter==='film'?'sepia(0.3) saturate(1.4)':
        item.filter==='dark'?'brightness(0.7)':
        item.filter==='bright'?'brightness(1.25)':'';
    }
    if(item.type==='video'){
      var vBadge=document.createElement('div');
      vBadge.className='image-badge';
      vBadge.style.background='rgba(239,68,68,0.9)';
      vBadge.textContent='🎥'+(item.trim?' ✂️':'');
      el.appendChild(vBadge);
    }
    if(item.filter&&item.filter!=='none'){
      var fBadge=document.createElement('div');
      fBadge.className='image-badge';
      fBadge.style.background='rgba(139,92,246,0.9)';
      fBadge.style.top='auto';
      fBadge.style.bottom='4px';
      fBadge.style.right='4px';
      fBadge.textContent='🎨';
      el.appendChild(fBadge);
    }
    var removeBtn=document.createElement('button');
    removeBtn.className='image-remove';
    removeBtn.textContent='×';
    removeBtn.onclick=function(e){e.stopPropagation();removeImage(index);};
    var order=document.createElement('div');
    order.className='image-order';
    order.textContent=index+1;
    if(item.animation!=='none'){
      var badge=document.createElement('div');
      badge.className='image-badge';
      badge.textContent=getAnimationLabel(item.animation);
      el.appendChild(badge);
    }
    el.appendChild(mediaEl);
    el.appendChild(removeBtn);
    el.appendChild(order);
    el.addEventListener('click',function(){selectImage(index);});
    el.addEventListener('dragstart',handleDragStart);
    el.addEventListener('dragover',handleDragOver);
    el.addEventListener('drop',handleDrop);
    el.addEventListener('dragend',handleDragEnd);
    grid.appendChild(el);
  });
}

// ============ ANIMATION LABELS ============
function getAnimationLabel(a){
  var l={
    'none':'ثابتة','zoomIn':'زوم+','zoomOut':'زوم-','panRight':'→',
    'panLeft':'←','panUp':'↑','panDown':'↓','rotate':'↻','pulse':'◎',
    'fadeIn':'ظهور','kenRight':'Ken→','kenLeft':'Ken←','shake':'اهتزاز',
    'bounce':'قفز','flip':'انقلاب'
  };
  return l[a]||'';
}

// ============ LAYOUTS ============
function renderLayouts(){
  var grid=document.getElementById('layoutsGrid');
  if(!grid)return;
  grid.innerHTML='';
  LAYOUTS.forEach(function(layout){
    var card=document.createElement('div');
    card.className='layout-card'+(layout.id===currentLayout?' active':'');
    card.onclick=function(){selectLayout(layout.id);};
    var preview=document.createElement('div');
    preview.className='layout-preview layout-'+getPreviewClass(layout.id);
    layout.cells.forEach(function(){preview.appendChild(document.createElement('div'));});
    card.appendChild(preview);
    grid.appendChild(card);
  });
}

function getPreviewClass(id){
  var m={'single':'1','splitH':'2h','splitV':'2v','triple':'3','grid4':'4','overlay':'overlay'};
  return m[id]||'1';
}

function selectLayout(id){
  currentLayout=id;
  renderLayouts();
  updateInfo();
  pushHistory();
  var layout=LAYOUTS.find(function(l){return l.id===id;});
  if(layout)showToast('التخطيط: '+layout.name);
}

// ============ SELECT IMAGE ============
function selectImage(index){
  selectedImageIndex=index;
  document.querySelectorAll('.image-item').forEach(function(el,i){
    if(i===index)el.classList.add('selected');
    else el.classList.remove('selected');
  });
  updateAnimateTab();
}

// ============ ANIMATE TAB ============
function updateAnimateTab(){
  var emptyEl=document.getElementById('animateEmpty');
  var contentEl=document.getElementById('animateContent');
  if((selectedImageIndex<0||selectedImageIndex>=images.length)&&images.length>0){
    selectedImageIndex=0;
    document.querySelectorAll('.image-item').forEach(function(el,i){
      if(i===0)el.classList.add('selected');
    });
  }
  if(selectedImageIndex<0||selectedImageIndex>=images.length){
    emptyEl.classList.remove('section-hidden');
    contentEl.classList.add('section-hidden');
    return;
  }
  emptyEl.classList.add('section-hidden');
  contentEl.classList.remove('section-hidden');
  var item=images[selectedImageIndex];
  document.querySelectorAll('#animationOptions .opt-btn').forEach(function(btn){
    btn.classList.toggle('active',btn.dataset.animation===item.animation);
  });
  document.querySelectorAll('#imageDurationOptions .opt-btn').forEach(function(btn){
    btn.classList.toggle('active',parseInt(btn.dataset.duration)===item.duration);
  });
  var speed=item.speed!==undefined?item.speed:1;
  document.querySelectorAll('#speedOptions .opt-btn').forEach(function(btn){
    btn.classList.toggle('active',parseFloat(btn.dataset.speed)===speed);
  });
  document.getElementById('customDuration').value=item.duration;
}

// ============ DRAG & DROP ============
var dragIndex=null;
function handleDragStart(e){dragIndex=parseInt(this.dataset.index);e.dataTransfer.effectAllowed='move';}
function handleDragOver(e){e.preventDefault();}
function handleDrop(e){
  e.preventDefault();
  var dropIndex=parseInt(this.dataset.index);
  if(dragIndex===null||dragIndex===dropIndex)return;
  var m=images.splice(dragIndex,1)[0];
  images.splice(dropIndex,0,m);
  if(selectedImageIndex===dragIndex)selectedImageIndex=dropIndex;
  else if(selectedImageIndex===dropIndex)selectedImageIndex=dragIndex;
  renderImagesGrid();
  pushHistory();
}
function handleDragEnd(){dragIndex=null;}

// ============ REMOVE / EDIT IMAGE ============
function removeImage(index){
  images.splice(index,1);
  if(selectedImageIndex===index)selectedImageIndex=-1;
  else if(selectedImageIndex>index)selectedImageIndex--;
  renderImagesGrid();
  updateButtons();
  updateInfo();
  updateAnimateTab();
  pushHistory();
}

function rotateImage(deg){
  if(selectedImageIndex<0)return;
  images[selectedImageIndex].rotation=(images[selectedImageIndex].rotation+deg)%360;
  renderImagesGrid();
  pushHistory();
}

function flipImage(dir){
  if(selectedImageIndex<0)return;
  if(dir==='h')images[selectedImageIndex].flipH=!images[selectedImageIndex].flipH;
  if(dir==='v')images[selectedImageIndex].flipV=!images[selectedImageIndex].flipV;
  renderImagesGrid();
  pushHistory();
}

function resetImageEdits(){
  if(selectedImageIndex<0)return;
  images[selectedImageIndex].rotation=0;
  images[selectedImageIndex].flipH=false;
  images[selectedImageIndex].flipV=false;
  images[selectedImageIndex].crop=null;
  images[selectedImageIndex].filter='none';
  if(images[selectedImageIndex].type!=='video'){
    images[selectedImageIndex].img=images[selectedImageIndex].originalImg;
    images[selectedImageIndex].media=images[selectedImageIndex].originalImg;
  }
  renderImagesGrid();
  pushHistory();
  showToast('تم إعادة العنصر');
}

window.rotateImage=rotateImage;
window.flipImage=flipImage;
window.resetImageEdits=resetImageEdits;

// ============ CUSTOM DURATION ============
window.applyCustomDuration=function(){
  if(selectedImageIndex<0)return;
  var val=parseInt(document.getElementById('customDuration').value);
  if(val<1||val>60){showToast('المدة: 1-60 ثانية');return;}
  images[selectedImageIndex].duration=val;
  document.querySelectorAll('#imageDurationOptions .opt-btn').forEach(function(btn){btn.classList.remove('active');});
  updateInfo();
  pushHistory();
  showToast('تم تحديث المدة');
};

// ============ ANIMATION/SPEED/DURATION BUTTONS ============
document.querySelectorAll('#animationOptions .opt-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    if(selectedImageIndex<0)return;
    images[selectedImageIndex].animation=this.dataset.animation;
    document.querySelectorAll('#animationOptions .opt-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    renderImagesGrid();
    pushHistory();
  });
});

document.querySelectorAll('#speedOptions .opt-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    if(selectedImageIndex<0)return;
    images[selectedImageIndex].speed=parseFloat(this.dataset.speed);
    document.querySelectorAll('#speedOptions .opt-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    pushHistory();
  });
});

document.querySelectorAll('#imageDurationOptions .opt-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    if(selectedImageIndex<0)return;
    var dur=parseInt(this.dataset.duration);
    images[selectedImageIndex].duration=dur;
    document.getElementById('customDuration').value=dur;
    document.querySelectorAll('#imageDurationOptions .opt-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    updateInfo();
    pushHistory();
  });
});

// ============ SIZE/TRANSITION/BG ============
document.querySelectorAll('#sizeOptions .opt-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('#sizeOptions .opt-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    currentSize=this.dataset.size;
    updateInfo();
    pushHistory();
  });
});

document.querySelectorAll('#transitionOptions .opt-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('#transitionOptions .opt-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    currentTransition=this.dataset.transition;
    updateInfo();
    pushHistory();
  });
});

document.querySelectorAll('#bgModeOptions .opt-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('#bgModeOptions .opt-btn').forEach(function(b){b.classList.remove('active');});
    this.classList.add('active');
    backgroundMode=this.dataset.bgmode;
  });
});

document.getElementById('bgCustomColor').addEventListener('input',function(){
  backgroundCustomColor=this.value;
});

// ============ BUTTONS STATE ============
function updateButtons(){
  var h=images.length>0;
  document.getElementById('previewBtn').disabled=!h;
  document.getElementById('exportBtn').disabled=!h;
}

// ============ INFO UPDATE ============
function updateInfo(){
  var td=0;
  images.forEach(function(i){td+=i.duration;});
  var sz=currentSize.split('x');
  var layout=LAYOUTS.find(function(l){return l.id===currentLayout;});
  var bitrate=BITRATE_MAP[exportQuality]||8000000;
  document.getElementById('infoImages').textContent=images.length;
  document.getElementById('infoDuration').textContent=td+' ثانية';
  document.getElementById('infoSize').textContent='~'+((td*bitrate/8)/1000000).toFixed(1)+' MB';
  document.getElementById('infoDimensions').textContent=sz[0]+' × '+sz[1];
  var qEl=document.getElementById('infoQuality');
  if(qEl)qEl.textContent=QUALITY_LABELS[exportQuality]+' ('+Math.round(bitrate/1000000)+' Mbps)';
  document.getElementById('infoLayout').textContent=layout?layout.name:'صورة واحدة';
  var ln=document.getElementById('layoutName');
  if(ln)ln.textContent=layout?layout.name:'صورة واحدة';
  var tL={
    'fade':'تلاشي','slideRight':'انزلاق يمين','slideLeft':'انزلاق يسار',
    'slideUp':'انزلاق فوق','zoom':'تكبير','rotate':'دوران',
    'book':'فتح كتاب','fold':'طي','none':'بدون'
  };
  document.getElementById('infoTransition').textContent=tL[currentTransition]||currentTransition;
  document.getElementById('infoTexts').textContent=textElements.length;
  document.getElementById('infoStickers').textContent=stickers.length;
  document.getElementById('infoWatermark').textContent=(watermark&&watermark.enabled)?'مفعّل':'معطّل';
  var al='بدون';
  if(selectedAudio==='record')al='تسجيل صوتي';
  else if(selectedAudio==='upload')al='ملف مرفوع';
  if(musicFile)al=al==='بدون'?'موسيقى':al+' + موسيقى';
  document.getElementById('infoAudio').textContent=al;
}

// ============ DRAW IMAGE IN CELL ============
function drawImageInCell(ctx,item,x,y,w,h,opacity,animProgress){
  if(opacity===undefined)opacity=1;
  if(animProgress===undefined)animProgress=0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.clip();
  var img=item.media||item.img;
  if(!img)return;
  var p=Math.min(1,Math.max(0,animProgress));
  ctx.globalAlpha=opacity;
  var iw=img.videoWidth||img.width||1;
  var ih=img.videoHeight||img.height||1;
  var ir=iw/ih,cr=w/h,dw,dh;
  if(ir>cr){dh=h;dw=iw*(h/ih);}
  else{dw=w;dh=ih*(w/iw);}
  var cx=x+w/2,cy=y+h/2;
  ctx.translate(cx,cy);
  if(item.rotation)ctx.rotate(item.rotation*Math.PI/180);
  if(item.flipH)ctx.scale(-1,1);
  if(item.flipV)ctx.scale(1,-1);
  var speed=item.speed!==undefined?item.speed:1;
  var sp=Math.min(1,p*speed);
  var scale=1,oX=0,oY=0,alpha=1;
  switch(item.animation){
    case 'zoomIn':scale=1+sp*0.3;break;
    case 'zoomOut':scale=1.3-sp*0.3;break;
    case 'panRight':scale=1.2;oX=(sp-0.5)*w*0.15;break;
    case 'panLeft':scale=1.2;oX=-(sp-0.5)*w*0.15;break;
    case 'panUp':scale=1.2;oY=-(sp-0.5)*h*0.15;break;
    case 'panDown':scale=1.2;oY=(sp-0.5)*h*0.15;break;
    case 'rotate':scale=1.1;ctx.rotate(sp*Math.PI*0.1);break;
    case 'pulse':scale=1+Math.sin(sp*Math.PI*2)*0.08;break;
    case 'fadeIn':alpha=Math.min(1,sp*1.5);break;
    case 'kenRight':scale=1+sp*0.25;oX=(sp-0.5)*w*0.1;break;
    case 'kenLeft':scale=1+sp*0.25;oX=-(sp-0.5)*w*0.1;break;
    case 'shake':oX=Math.sin(sp*Math.PI*20)*w*0.02*(1-sp);break;
    case 'bounce':oY=-Math.abs(Math.sin(sp*Math.PI*3))*h*0.05;break;
    case 'flip':ctx.scale(Math.cos(sp*Math.PI),1);break;
  }
  ctx.globalAlpha=opacity*alpha;
  ctx.scale(scale,scale);
  ctx.translate(oX,oY);
  try{ctx.drawImage(img,-dw/2,-dh/2,dw,dh);}catch(e){}
  ctx.restore();
}

// ============ DRAW LAYOUT ============
function drawLayout(ctx,startIndex,canvasW,canvasH,opacity,animProgress){
  if(opacity===undefined)opacity=1;
  if(animProgress===undefined)animProgress=0;
  var layout=LAYOUTS.find(function(l){return l.id===currentLayout;});
  if(!layout)return;
  if(backgroundMode==='color'){
    ctx.fillStyle=backgroundCustomColor;
    ctx.fillRect(0,0,canvasW,canvasH);
  } else {
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,canvasW,canvasH);
  }
  layout.cells.forEach(function(cell,i){
    var imgIdx=(startIndex+i)%images.length;
    var item=images[imgIdx];
    if(!item)return;
    var x=cell.x*canvasW,y=cell.y*canvasH,w=cell.w*canvasW,h=cell.h*canvasH;
    if(cell.overlay){
      ctx.save();
      ctx.shadowColor='rgba(0,0,0,0.5)';
      ctx.shadowBlur=15;
      ctx.fillStyle='#fff';
      ctx.fillRect(x-5,y-5,w+10,h+10);
      ctx.restore();
    }
    drawImageInCell(ctx,item,x,y,w,h,opacity,animProgress);
  });
}

// ============ DRAW TRANSITION ============
function drawTransition(ctx,prevStart,nextStart,canvasW,canvasH,progress){
  var t=Math.min(1,Math.max(0,progress));
  var ease=1-Math.pow(1-t,3);
  drawLayout(ctx,prevStart,canvasW,canvasH,1,1);
  ctx.save();
  switch(currentTransition){
    case 'fade':
      ctx.globalAlpha=ease;
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
    case 'slideRight':
      ctx.translate(canvasW*(1-ease),0);
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
    case 'slideLeft':
      ctx.translate(-canvasW*(1-ease),0);
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
    case 'slideUp':
      ctx.translate(0,canvasH*(1-ease));
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
    case 'zoom':
      var zs=0.3+ease*0.7;
      ctx.translate(canvasW/2,canvasH/2);
      ctx.scale(zs,zs);
      ctx.globalAlpha=ease;
      ctx.translate(-canvasW/2,-canvasH/2);
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
    case 'rotate':
      ctx.translate(canvasW/2,canvasH/2);
      ctx.rotate(ease*Math.PI*2);
      var rs=0.2+ease*0.8;
      ctx.scale(rs,rs);
      ctx.globalAlpha=ease;
      ctx.translate(-canvasW/2,-canvasH/2);
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
    case 'book':
      var ba=ease*Math.PI;
      ctx.translate(canvasW,canvasH/2);
      ctx.rotate(-Math.PI+ba);
      ctx.globalAlpha=ease;
      ctx.translate(-canvasW,-canvasH/2);
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
    case 'fold':
      var fa=ease*Math.PI/2;
      ctx.translate(canvasW/2,canvasH/2);
      ctx.scale(Math.cos(fa),1);
      ctx.globalAlpha=ease;
      ctx.translate(-canvasW/2,-canvasH/2);
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
    default:
      drawLayout(ctx,nextStart,canvasW,canvasH,1,0);
      break;
  }
  ctx.restore();
}

// ============ DRAW TEXT ============
function drawTextElement(ctx,el,cw,ch){
  var fs=el.size*Math.min(cw,ch)/100;
  ctx.save();
  ctx.font='bold '+fs+'px '+el.font;
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.translate(el.x*cw,el.y*ch);
  if(el.shadow){
    ctx.shadowColor='rgba(0,0,0,0.85)';
    ctx.shadowBlur=fs*0.15;
    ctx.shadowOffsetX=2;
    ctx.shadowOffsetY=2;
  }
  ctx.fillStyle=el.color;
  var lines=el.text.split('\n');
  var lh=fs*1.2;
  var sy=-(lines.length-1)*lh/2;
  lines.forEach(function(line,i){ctx.fillText(line,0,sy+i*lh);});
  ctx.restore();
}

// ============ DRAW STICKER ============
function drawStickerElement(ctx,el,cw,ch){
  var fs=el.size*Math.min(cw,ch)/100;
  ctx.save();
  ctx.font=fs+'px serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.translate(el.x*cw,el.y*ch);
  ctx.fillText(el.emoji,0,0);
  ctx.restore();
}

// ============ DRAW WATERMARK ============
function drawWatermark(ctx,cw,ch){
  if(!watermark||!watermark.enabled)return;
  var pad=Math.min(cw,ch)*0.03;
  var pos=watermark.position||'br',x,y;
  if(pos==='tl'){x=pad;y=pad;}
  else if(pos==='tr'){x=cw-pad;y=pad;}
  else if(pos==='bl'){x=pad;y=ch-pad;}
  else{x=cw-pad;y=ch-pad;}
  ctx.save();
  ctx.globalAlpha=watermark.opacity!==undefined?watermark.opacity:0.7;
  if(watermark.type==='text'&&watermark.text){
    var fs=(watermark.size||5)*Math.min(cw,ch)/100;
    ctx.font='bold '+fs+'px '+(watermark.font||"'Cairo',sans-serif");
    ctx.fillStyle=watermark.color||'#fff';
    ctx.textBaseline=(pos==='tl'||pos==='tr')?'top':'bottom';
    ctx.textAlign=(pos==='tl'||pos==='bl')?'left':'right';
    ctx.shadowColor='rgba(0,0,0,0.5)';
    ctx.shadowBlur=6;
    ctx.fillText(watermark.text,x,y);
  } else if(watermark.type==='image'&&watermark.img){
    var sz=(watermark.size||15)*Math.min(cw,ch)/100;
    var ratio=watermark.img.width/watermark.img.height;
    var w=sz,h=sz/ratio;
    if(ratio<1){h=sz;w=sz*ratio;}
    var dx=(pos==='tl'||pos==='bl')?x:x-w;
    var dy=(pos==='tl'||pos==='tr')?y:y-h;
    try{ctx.drawImage(watermark.img,dx,dy,w,h);}catch(e){}
  }
  ctx.restore();
}

// ============ DRAW OVERLAYS ============
function drawOverlays(ctx,cw,ch){
  textElements.forEach(function(el){drawTextElement(ctx,el,cw,ch);});
  stickers.forEach(function(el){drawStickerElement(ctx,el,cw,ch);});
  drawWatermark(ctx,cw,ch);
}

// ============ SCENE HELPERS ============
function getSceneCount(){
  var l=LAYOUTS.find(function(x){return x.id===currentLayout;});
  if(!l)return images.length;
  return Math.ceil(images.length/l.cells.length);
}

function getSceneDuration(si){
  var l=LAYOUTS.find(function(x){return x.id===currentLayout;});
  if(!l)return 3;
  var ip=l.cells.length;
  var md=3;
  for(var i=0;i<ip;i++){
    var idx=si*ip+i;
    if(images[idx])md=Math.max(md,images[idx].duration||3);
  }
  return md;
}

// ============ ACTIVATE CANVAS FOR DRAG ============
function activateCanvasForDrag(){
  if(images.length===0)return;
  var canvas=document.getElementById('previewCanvas');
  if(canvas.style.display==='none'){
    var sz=currentSize.split('x');
    var w=parseInt(sz[0]),h=parseInt(sz[1]);
    var ps=Math.min(400/w,400/h,1);
    canvas.width=w*ps;
    canvas.height=h*ps;
    canvas.style.display='block';
    document.getElementById('previewEmpty').style.display='none';
    var ctx=canvas.getContext('2d');
    drawLayout(ctx,0,canvas.width,canvas.height,1,0.5);
    drawOverlays(ctx,canvas.width,canvas.height);
  }
  setTimeout(function(){
    if(window._renderDraggableZones)window._renderDraggableZones();
  },100);
}

// ============ PREVIEW VIDEO ============
window.previewVideo=function(){
  if(images.length===0)return;
  var pc=document.getElementById('previewCard');
  if(pc&&!isPreviewing){
    setTimeout(function(){pc.scrollIntoView({behavior:'smooth',block:'start'});},100);
  }
  if(isPreviewing){
    isPreviewing=false;
    if(previewAnimationId)cancelAnimationFrame(previewAnimationId);
    images.forEach(function(it){
      if(it.type==='video'&&it.media){try{it.media.pause();}catch(e){}}
    });
    document.getElementById('previewBtn').textContent='▶ معاينة';
    return;
  }
  isPreviewing=true;
  trackEvent('montage-معاينة');
  document.getElementById('previewBtn').textContent='⏹ إيقاف';
  var canvas=document.getElementById('previewCanvas');
  var ph=document.getElementById('previewEmpty');
  var sz=currentSize.split('x');
  var w=parseInt(sz[0]),h=parseInt(sz[1]);
  var ps=Math.min(400/w,400/h,1);
  canvas.width=w*ps;
  canvas.height=h*ps;
  canvas.style.display='block';
  ph.style.display='none';
  var ctx=canvas.getContext('2d');
  var ts=getSceneCount(),cs=0,st=Date.now();
  var lastScene=-1;
  function playSceneVideos(sceneIdx){
    if(lastScene===sceneIdx)return;
    lastScene=sceneIdx;
    var l=LAYOUTS.find(function(x){return x.id===currentLayout;});
    var ip=l?l.cells.length:1;
    var si=sceneIdx*ip;
    images.forEach(function(it){
      if(it.type==='video'&&it.media){
        try{it.media.pause();it.media.currentTime=0;}catch(e){}
      }
    });
    for(var k=0;k<ip;k++){
      var idx=(si+k)%images.length;
      var it=images[idx];
      if(it&&it.type==='video'&&it.media){
        try{
          var startT=it.trim?it.trim.start:0;
          it.media.currentTime=startT;
          if(it.speed)it.media.playbackRate=it.speed;
          var pr=it.media.play();
          if(pr&&pr.catch)pr.catch(function(){});
        } catch(e){}
      }
    }
  }
  playSceneVideos(0);
  function animate(){
    if(!isPreviewing)return;
    var d=getSceneDuration(cs);
    var el=(Date.now()-st)/1000;
    var p=el/d;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var l=LAYOUTS.find(function(x){return x.id===currentLayout;});
    var ip=l?l.cells.length:1;
    var si=cs*ip;
    if(p>0.75&&currentTransition!=='none'&&cs<ts-1){
      var tp=(p-0.75)/0.25;
      var ns=(cs+1)*ip;
      drawTransition(ctx,si,ns,canvas.width,canvas.height,tp);
    } else {
      drawLayout(ctx,si,canvas.width,canvas.height,1,p);
    }
    drawOverlays(ctx,canvas.width,canvas.height);
    if(p>=1){
      cs++;
      st=Date.now();
      if(cs>=ts){
        cs=0;
        st=Date.now();
        playSceneVideos(0);
      } else {
        playSceneVideos(cs);
      }
    }
    previewAnimationId=requestAnimationFrame(animate);
  }
  animate();
};

// ============ RESET ALL ============
window.resetAll=function(){
  if(!confirm('حذف كل شيء؟'))return;
  images=[];
  audioUpload=null;
  musicFile=null;
  recordedAudioBlob=null;
  selectedAudio=null;
  textElements=[];
  stickers=[];
  watermark=null;
  isPreviewing=false;
  selectedImageIndex=-1;
  currentLayout='single';
  currentProjectId=null;
  if(previewAnimationId)cancelAnimationFrame(previewAnimationId);
  renderImagesGrid();
  renderLayouts();
  updateButtons();
  updateInfo();
  updateAnimateTab();
  renderElementsList();
  document.getElementById('musicInfo').classList.add('section-hidden');
  document.getElementById('audioUploadInfo').classList.add('section-hidden');
  document.getElementById('recordPlayer').classList.remove('active');
  document.getElementById('recordActions').classList.add('section-hidden');
  document.getElementById('previewCanvas').style.display='none';
  document.getElementById('previewEmpty').style.display='block';
  document.getElementById('progressContainer').classList.remove('active');
  document.getElementById('shareRow').classList.add('section-hidden');
  document.getElementById('wmPreviewInfo').classList.add('section-hidden');
  document.getElementById('wmContent').classList.add('section-hidden');
  document.getElementById('wmOff').classList.add('active');
  document.getElementById('wmOn').classList.remove('active');
  pushHistory();
  showToast('تم إعادة التعيين');
};

// ============ CROP ============
window.openCrop=function(){
  if(selectedImageIndex<0){showToast('اختر عنصراً أولاً');return;}
  var item=images[selectedImageIndex];
  if(item.type==='video'){showToast('استخدم زر ✂️ على بطاقة الفيديو');return;}
  cropOriginalImage=item.img;
  document.getElementById('cropOverlay').classList.add('active');
  var canvas=document.getElementById('cropCanvas');
  cropCanvas=canvas;
  var mW=window.innerWidth-40,mH=window.innerHeight*0.6;
  var scale=Math.min(mW/cropOriginalImage.width,mH/cropOriginalImage.height,1);
  cropScale=scale;
  canvas.width=cropOriginalImage.width*scale;
  canvas.height=cropOriginalImage.height*scale;
  var ctx=canvas.getContext('2d');
  ctx.drawImage(cropOriginalImage,0,0,canvas.width,canvas.height);
  initCropRect(canvas);
};

function initCropRect(canvas){
  if(images[selectedImageIndex].crop){
    var c=images[selectedImageIndex].crop;
    cropRect={x:c.x*cropScale,y:c.y*cropScale,w:c.w*cropScale,h:c.h*cropScale};
  } else {
    var s=Math.min(canvas.width,canvas.height)*0.6;
    cropRect={x:(canvas.width-s)/2,y:(canvas.height-s)/2,w:s,h:s};
  }
  renderCrop();
  setupCropDrag(canvas);
}

function renderCrop(){
  var canvas=cropCanvas,ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(cropOriginalImage,0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.fillRect(0,0,canvas.width,cropRect.y);
  ctx.fillRect(0,cropRect.y+cropRect.h,canvas.width,canvas.height);
  ctx.fillRect(0,cropRect.y,cropRect.x,cropRect.h);
  ctx.fillRect(cropRect.x+cropRect.w,cropRect.y,canvas.width-cropRect.x-cropRect.w,cropRect.h);
  ctx.strokeStyle='#fff';
  ctx.lineWidth=3;
  ctx.strokeRect(cropRect.x,cropRect.y,cropRect.w,cropRect.h);
}

function setupCropDrag(canvas){
  var isDragging=false,isResizing=false,rc=null,sx,sy,sr={};
  function gp(e){
    var r=canvas.getBoundingClientRect();
    var cx=e.touches?e.touches[0].clientX:e.clientX;
    var cy=e.touches?e.touches[0].clientY:e.clientY;
    return{x:(cx-r.left)*(canvas.width/r.width),y:(cy-r.top)*(canvas.height/r.height)};
  }
  function fc(p){
    var cs=['tl','tr','bl','br'];
    var ps=[
      {x:cropRect.x,y:cropRect.y},
      {x:cropRect.x+cropRect.w,y:cropRect.y},
      {x:cropRect.x,y:cropRect.y+cropRect.h},
      {x:cropRect.x+cropRect.w,y:cropRect.y+cropRect.h}
    ];
    for(var i=0;i<ps.length;i++){
      var d=Math.sqrt(Math.pow(p.x-ps[i].x,2)+Math.pow(p.y-ps[i].y,2));
      if(d<25)return cs[i];
    }
    return null;
  }
  function start(e){
    e.preventDefault();
    var p=gp(e);
    var c=fc(p);
    if(c){isResizing=true;rc=c;}
    else if(p.x>=cropRect.x&&p.x<=cropRect.x+cropRect.w&&p.y>=cropRect.y&&p.y<=cropRect.y+cropRect.h){isDragging=true;}
    else return;
    sx=p.x;
    sy=p.y;
    sr={x:cropRect.x,y:cropRect.y,w:cropRect.w,h:cropRect.h};
  }
  function move(e){
    if(!isDragging&&!isResizing)return;
    e.preventDefault();
    var p=gp(e);
    var dx=p.x-sx,dy=p.y-sy;
    if(isDragging){
      cropRect.x=Math.max(0,Math.min(canvas.width-cropRect.w,sr.x+dx));
      cropRect.y=Math.max(0,Math.min(canvas.height-cropRect.h,sr.y+dy));
    } else if(isResizing){
      if(rc==='br'){
        cropRect.w=Math.max(30,Math.min(canvas.width-cropRect.x,sr.w+dx));
        cropRect.h=Math.max(30,Math.min(canvas.height-cropRect.y,sr.h+dy));
      }
    }
    renderCrop();
  }
  function end(){isDragging=false;isResizing=false;rc=null;}
  if(canvas._cc)canvas._cc();
  canvas.addEventListener('mousedown',start);
  canvas.addEventListener('mousemove',move);
  canvas.addEventListener('mouseup',end);
  canvas.addEventListener('touchstart',start,{passive:false});
  canvas.addEventListener('touchmove',move,{passive:false});
  canvas.addEventListener('touchend',end);
  canvas._cc=function(){
    canvas.removeEventListener('mousedown',start);
    canvas.removeEventListener('mousemove',move);
    canvas.removeEventListener('mouseup',end);
    canvas.removeEventListener('touchstart',start);
    canvas.removeEventListener('touchmove',move);
    canvas.removeEventListener('touchend',end);
  };
}

window.applyCrop=function(){
  if(!cropRect||selectedImageIndex<0)return;
  var item=images[selectedImageIndex],orig=item.originalImg;
  var rx=cropRect.x/cropScale,ry=cropRect.y/cropScale,rw=cropRect.w/cropScale,rh=cropRect.h/cropScale;
  var tc=document.createElement('canvas');
  tc.width=rw;
  tc.height=rh;
  var tctx=tc.getContext('2d');
  tctx.drawImage(orig,rx,ry,rw,rh,0,0,rw,rh);
  var ni=new Image();
  ni.onload=function(){
    item.img=ni;
    item.media=ni;
    item.crop={x:rx,y:ry,w:rw,h:rh};
    renderImagesGrid();
    updateInfo();
    closeCrop();
    pushHistory();
    showToast('تم قص الصورة');
  };
  ni.src=tc.toDataURL('image/jpeg',0.95);
};

window.closeCrop=function(){
  document.getElementById('cropOverlay').classList.remove('active');
  cropRect=null;
  cropOriginalImage=null;
};

// ============ POSITION GRID ============
function renderPositionGrid(gridId,currentVar,onSelect){
  var grid=document.getElementById(gridId);
  if(!grid)return;
  grid.innerHTML='';
  Object.keys(POSITIONS).forEach(function(key){
    var cell=document.createElement('button');
    cell.className='position-cell'+(key===currentVar?' active':'');
    cell.textContent=POSITION_LABELS[key];
    cell.onclick=function(){onSelect(key);};
    grid.appendChild(cell);
  });
}

renderPositionGrid('textPositionGrid','mc',function(k){
  currentTextPosition=k;
  renderPositionGrid('textPositionGrid',k,arguments.callee);
});
renderPositionGrid('stickerPositionGrid','mc',function(k){
  currentStickerPosition=k;
  renderPositionGrid('stickerPositionGrid',k,arguments.callee);
});

// ============ EMOJI GRID ============
(function(){
  var g=document.getElementById('emojiGrid');
  EMOJIS.forEach(function(e){
    var b=document.createElement('button');
    b.className='emoji-btn';
    b.textContent=e;
    b.onclick=function(){addSticker(e);};
    g.appendChild(b);
  });
})();

document.getElementById('textSize').addEventListener('input',function(){
  document.getElementById('textSizeLabel').textContent=this.value;
});

// ============ ADD TEXT ============
window.addTextElement=function(){
  var txt=document.getElementById('textContent').value.trim();
  if(!txt){showToast('اكتب نصاً أولاً');return;}
  var pos=POSITIONS[currentTextPosition];
  textElements.push({
    id:'t'+Date.now(),
    text:txt,
    x:pos.x,y:pos.y,
    size:parseInt(document.getElementById('textSize').value),
    color:document.getElementById('textColor').value,
    font:document.getElementById('textFont').value,
    shadow:document.getElementById('textShadow').checked,
    rotation:0
  });
  document.getElementById('textContent').value='';
  renderElementsList();
  updateInfo();
  pushHistory();
  activateCanvasForDrag();
  showToast('تم إضافة النص ✋ اسحبه بالمعاينة');
};

// ============ ADD STICKER ============
function addSticker(emoji){
  var pos=POSITIONS[currentStickerPosition];
  stickers.push({id:'s'+Date.now(),emoji:emoji,x:pos.x,y:pos.y,size:15,rotation:0});
  renderElementsList();
  updateInfo();
  pushHistory();
  activateCanvasForDrag();
  showToast('تم إضافة الملصق ✋ اسحبه بالمعاينة');
}

// ============ ELEMENTS LIST ============
function renderElementsList(){
  var list=document.getElementById('elementList');
  var empty=document.getElementById('elementsEmpty');
  list.innerHTML='';
  var all=[];
  textElements.forEach(function(t){all.push({type:'text',data:t});});
  stickers.forEach(function(s){all.push({type:'sticker',data:s});});
  if(all.length===0){empty.style.display='block';return;}
  empty.style.display='none';
  all.forEach(function(item){
    var el=document.createElement('div');
    el.className='element-item';
    var head=document.createElement('div');
    head.className='element-item-head';
    var pv=document.createElement('div');
    pv.className='element-item-preview';
    if(item.type==='text')pv.textContent='📝 '+item.data.text;
    else pv.textContent=item.data.emoji+' ملصق';
    var acts=document.createElement('div');
    var delBtn=document.createElement('button');
    delBtn.className='el-del';
    delBtn.textContent='حذف';
    delBtn.onclick=function(){
      if(item.type==='text')textElements=textElements.filter(function(x){return x.id!==item.data.id;});
      else stickers=stickers.filter(function(x){return x.id!==item.data.id;});
      renderElementsList();
      updateInfo();
      pushHistory();
      activateCanvasForDrag();
    };
    acts.appendChild(delBtn);
    head.appendChild(pv);
    head.appendChild(acts);
    el.appendChild(head);
    list.appendChild(el);
  });
}
renderElementsList();

// ============ WATERMARK ============
window.toggleWatermark=function(on){
  if(on){
    if(!watermark)watermark={enabled:true,type:'text',text:'@mybrand',color:'#ffffff',size:5,position:'br',opacity:0.7};
    watermark.enabled=true;
    document.getElementById('wmOn').classList.add('active');
    document.getElementById('wmOff').classList.remove('active');
    document.getElementById('wmContent').classList.remove('section-hidden');
  } else {
    if(watermark)watermark.enabled=false;
    document.getElementById('wmOff').classList.add('active');
    document.getElementById('wmOn').classList.remove('active');
    document.getElementById('wmContent').classList.add('section-hidden');
  }
  updateInfo();
  pushHistory();
};

window.setWmType=function(t){
  if(!watermark)watermark={enabled:true,type:t,position:'br',opacity:0.7};
  watermark.type=t;
  document.getElementById('wmTextBtn').classList.toggle('active',t==='text');
  document.getElementById('wmImageBtn').classList.toggle('active',t==='image');
  document.getElementById('wmTextSection').classList.toggle('section-hidden',t!=='text');
  document.getElementById('wmImageSection').classList.toggle('section-hidden',t!=='image');
};

window.setWmPos=function(pos,btn){
  if(!watermark)watermark={enabled:true,type:'text',position:pos,opacity:0.7};
  watermark.position=pos;
  document.querySelectorAll('[data-wm-pos]').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
};

document.getElementById('wmImageInput').addEventListener('change',function(e){
  var file=e.target.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    var img=new Image();
    img.onload=function(){
      if(!watermark)watermark={enabled:true,type:'image',position:'br',opacity:0.7,size:15};
      watermark.img=img;
      watermark.type='image';
      window._wmImgCache=img;
      document.getElementById('wmPreviewInfo').classList.remove('section-hidden');
      setWmType('image');
      updateInfo();
      pushHistory();
      showToast('تم رفع الشعار');
    };
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value='';
});

window.removeWmImage=function(){
  if(watermark)delete watermark.img;
  window._wmImgCache=null;
  document.getElementById('wmPreviewInfo').classList.add('section-hidden');
  updateInfo();
};

['wmText','wmColor','wmSize','wmOpacity'].forEach(function(id){
  var el=document.getElementById(id);
  if(el)el.addEventListener('input',function(){
    if(!watermark)watermark={enabled:true,type:'text',position:'br',opacity:0.7};
    if(id==='wmText')watermark.text=this.value;
    if(id==='wmColor')watermark.color=this.value;
    if(id==='wmSize')watermark.size=parseInt(this.value);
    if(id==='wmOpacity')watermark.opacity=parseInt(this.value)/100;
  });
});

// ============ TEMPLATES RENDER ============
(function(){
  var catsBar=document.getElementById('templateCategories');
  catsBar.innerHTML='';
  TEMPLATE_CATEGORIES.forEach(function(cat){
    var btn=document.createElement('button');
    btn.className='tab-btn'+(cat.id==='all'?' active':'');
    btn.innerHTML=cat.emoji+' '+cat.name;
    btn.onclick=function(){
      currentTemplateCategory=cat.id;
      catsBar.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      renderTemplates();
    };
    catsBar.appendChild(btn);
  });
  renderTemplates();
})();

function renderTemplates(){
  var g=document.getElementById('templatesGrid');
  g.innerHTML='';
  var filtered=currentTemplateCategory==='all'?TEMPLATES:TEMPLATES.filter(function(t){return t.cat===currentTemplateCategory;});
  filtered.forEach(function(t){
    var card=document.createElement('div');
    card.className='template-card';
    card.innerHTML='<div class="template-emoji">'+t.emoji+'</div><div class="template-name">'+t.name+'</div>';
    card.onclick=function(){applyTemplate(t);};
    g.appendChild(card);
  });
}

// ============ APPLY TEMPLATE ============
function applyTemplate(t){
  currentSize=t.size;
  currentTransition=t.transition;
  currentLayout=t.layout;
  images.forEach(function(img){img.animation=t.animation;});
  if(t.bg){
    backgroundMode='color';
    backgroundCustomColor=t.bg;
    document.querySelectorAll('#bgModeOptions .opt-btn').forEach(function(b){
      b.classList.toggle('active',b.dataset.bgmode==='color');
    });
    var bgColorInput=document.getElementById('bgCustomColor');
    if(bgColorInput)bgColorInput.value=t.bg;
  }
  document.querySelectorAll('#sizeOptions .opt-btn').forEach(function(b){
    b.classList.toggle('active',b.dataset.size===currentSize);
  });
  document.querySelectorAll('#transitionOptions .opt-btn').forEach(function(b){
    b.classList.toggle('active',b.dataset.transition===currentTransition);
  });
  stickers=[];
  textElements=[];
  if(t.sticker){
    var sp=POSITIONS[t.stickerPos||'tc']||POSITIONS['tc'];
    stickers.push({id:'s'+Date.now(),emoji:t.sticker,x:sp.x,y:sp.y,size:18,rotation:0});
  }
  if(t.text){
    var tp=POSITIONS['mc'];
    textElements.push({
      id:'t'+Date.now(),text:t.text,x:tp.x,y:tp.y,
      size:10,color:t.textColor||'#ffffff',font:"'Cairo',sans-serif",
      shadow:true,rotation:0
    });
    var txtArea=document.getElementById('textContent');
    if(txtArea)txtArea.value=t.text;
    var colorInput=document.getElementById('textColor');
    if(colorInput&&t.textColor)colorInput.value=t.textColor;
  }
  renderImagesGrid();
  renderLayouts();
  renderElementsList();
  updateInfo();
  pushHistory();
  activateCanvasForDrag();
  showToast('تم تطبيق قالب: '+t.name);
}

// ============ AUDIO TABS ============
window.switchAudioTab=function(tab,btn){
  document.querySelectorAll('.audio-tab').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  document.querySelectorAll('#audioTab-record,#audioTab-upload,#audioTab-music').forEach(function(el){
    el.classList.add('section-hidden');
  });
  document.getElementById('audioTab-'+tab).classList.remove('section-hidden');
};

// ============ RECORDING ============
window.toggleRecording=function(){
  if(mediaRecorder&&mediaRecorder.state==='recording')stopRecording();
  else startRecording();
};

function startRecording(){
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    recordingStream=stream;
    var mt='audio/webm;codecs=opus';
    if(!MediaRecorder.isTypeSupported(mt))mt='audio/webm';
    if(!MediaRecorder.isTypeSupported(mt))mt='';
    var opts=mt?{mimeType:mt}:{};
    mediaRecorder=new MediaRecorder(stream,opts);
    audioChunks=[];
    mediaRecorder.ondataavailable=function(e){if(e.data.size>0)audioChunks.push(e.data);};
    mediaRecorder.onstop=function(){
      recordedAudioBlob=new Blob(audioChunks,{type:'audio/webm'});
      var url=URL.createObjectURL(recordedAudioBlob);
      document.getElementById('recordAudio').src=url;
      document.getElementById('recordPlayer').classList.add('active');
      document.getElementById('recordActions').classList.remove('section-hidden');
      document.getElementById('recorderStatus').textContent='التسجيل جاهز';
      if(recordingStream)recordingStream.getTracks().forEach(function(t){t.stop();});
    };
    mediaRecorder.start();
    recordingStartTime=Date.now();
    document.getElementById('recorderDot').classList.add('recording');
    document.getElementById('recorderStatus').textContent='جاري التسجيل';
    document.getElementById('recordBtn').textContent='إيقاف التسجيل';
    document.getElementById('recordBtn').classList.remove('record');
    document.getElementById('recordBtn').classList.add('stop');
    recordingTimerInterval=setInterval(updateTimer,100);
  }).catch(function(err){
    console.error(err);
    showToast('لم يتم السماح للميكروفون');
  });
}

function stopRecording(){
  if(mediaRecorder&&mediaRecorder.state==='recording')mediaRecorder.stop();
  if(recordingTimerInterval){clearInterval(recordingTimerInterval);recordingTimerInterval=null;}
  document.getElementById('recorderDot').classList.remove('recording');
  document.getElementById('recordBtn').textContent='بدء التسجيل';
  document.getElementById('recordBtn').classList.remove('stop');
  document.getElementById('recordBtn').classList.add('record');
}

function updateTimer(){
  var el=Math.floor((Date.now()-recordingStartTime)/1000);
  var m=Math.floor(el/60).toString().padStart(2,'0');
  var s=(el%60).toString().padStart(2,'0');
  document.getElementById('recorderTimer').textContent=m+':'+s;
}

window.useRecording=function(){
  if(!recordedAudioBlob)return;
  selectedAudio='record';
  updateInfo();
  showToast('سيتم استخدام التسجيل');
};

window.deleteRecording=function(){
  recordedAudioBlob=null;
  selectedAudio=null;
  document.getElementById('recordPlayer').classList.remove('active');
  document.getElementById('recordActions').classList.add('section-hidden');
  document.getElementById('recorderStatus').textContent='جاهز للتسجيل';
  document.getElementById('recorderTimer').textContent='00:00';
  document.getElementById('recordAudio').src='';
  updateInfo();
  showToast('تم حذف التسجيل');
};

// ============ AUDIO UPLOAD ============
document.getElementById('audioInput').addEventListener('change',function(e){
  var f=e.target.files[0];
  if(!f)return;
  if(!f.type.startsWith('audio/')){showToast('الرجاء اختيار ملف صوتي');return;}
  audioUpload=f;
  selectedAudio='upload';
  document.getElementById('audioUploadName').textContent=f.name;
  document.getElementById('audioUploadInfo').classList.remove('section-hidden');
  updateInfo();
  showToast('تم رفع الملف');
  e.target.value='';
});

window.removeAudioUpload=function(){
  audioUpload=null;
  if(selectedAudio==='upload')selectedAudio=null;
  document.getElementById('audioUploadInfo').classList.add('section-hidden');
  document.getElementById('audioInput').value='';
  updateInfo();
};

// ============ MUSIC ============
document.getElementById('musicInput').addEventListener('change',function(e){
  var f=e.target.files[0];
  if(!f)return;
  if(!f.type.startsWith('audio/')){showToast('الرجاء اختيار ملف صوتي');return;}
  musicFile=f;
  document.getElementById('musicName').textContent=f.name;
  document.getElementById('musicInfo').classList.remove('section-hidden');
  updateInfo();
  showToast('تم رفع الموسيقى');
  e.target.value='';
});

window.removeMusic=function(){
  musicFile=null;
  document.getElementById('musicInfo').classList.add('section-hidden');
  document.getElementById('musicInput').value='';
  updateInfo();
};

// ============ EXPORT VIDEO ============
window.exportVideo=function(){
  if(images.length===0||isExporting)return;
  isExporting=true;
  var pc=document.getElementById('progressContainer');
  var pf=document.getElementById('progressFill');
  var pt=document.getElementById('progressText');
  var eb=document.getElementById('exportBtn');
  var pb=document.getElementById('previewBtn');
  pc.classList.add('active');
  eb.disabled=true;
  pb.disabled=true;
  isPreviewing=false;
  trackEvent('montage-تصدير');
  var sz=currentSize.split('x'),w=parseInt(sz[0]),h=parseInt(sz[1]);
  var selectedBitrate=BITRATE_MAP[exportQuality]||8000000;
  var ec=document.createElement('canvas');
  ec.width=w;
  ec.height=h;
  var ctx=ec.getContext('2d');
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  var stream=ec.captureStream(30);
  var ac=null,as=[],aft=null;
  if(selectedAudio==='record'&&recordedAudioBlob)aft=recordedAudioBlob;
  else if(selectedAudio==='upload'&&audioUpload)aft=audioUpload;
  var hasVideoAudio=images.some(function(it){return it.type==='video';});
  var sa=Promise.resolve();
  if(aft||musicFile||hasVideoAudio){
    sa=(function(){
      ac=new (window.AudioContext||window.webkitAudioContext)();
      var ad=ac.createMediaStreamDestination();
      var ps=[];
      if(aft){
        ps.push(aft.arrayBuffer().then(function(b){return ac.decodeAudioData(b);}).then(function(ab){
          var s=ac.createBufferSource();
          s.buffer=ab;
          s.loop=false;
          s.connect(ad);
          as.push(s);
        }));
      }
      if(musicFile){
        ps.push(musicFile.arrayBuffer().then(function(b){return ac.decodeAudioData(b);}).then(function(md){
          var ms=ac.createBufferSource();
          ms.buffer=md;
          ms.loop=true;
          var g=ac.createGain();
          g.gain.value=aft?0.15:0.6;
          ms.connect(g);
          g.connect(ad);
          as.push(ms);
        }));
      }
      return Promise.all(ps).then(function(){
        images.forEach(function(it){
          if(it.type==='video'&&it.media){
            try{
              it.media.muted=false;
              it.media.volume=1;
              if(!it._audioSource){it._audioSource=ac.createMediaElementSource(it.media);}
              try{it._audioSource.disconnect();}catch(e){}
              it._audioSource.connect(ad);
            } catch(e){}
          }
        });
        ad.stream.getAudioTracks().forEach(function(t){stream.addTrack(t);});
      });
    })();
  }
  sa.then(function(){
    var mt='video/mp4;codecs=avc1.42E01E,mp4a.40.2';
    if(!MediaRecorder.isTypeSupported(mt))mt='video/mp4;codecs=avc1';
    if(!MediaRecorder.isTypeSupported(mt))mt='video/mp4';
    if(!MediaRecorder.isTypeSupported(mt))mt='video/webm;codecs=h264';
    if(!MediaRecorder.isTypeSupported(mt))mt='video/webm;codecs=vp9';
    if(!MediaRecorder.isTypeSupported(mt))mt='video/webm;codecs=vp8';
    if(!MediaRecorder.isTypeSupported(mt))mt='video/webm';
    var isMP4=mt.indexOf('mp4')>-1;
    var fileExt=isMP4?'mp4':'webm';
    var rec=new MediaRecorder(stream,{mimeType:mt,videoBitsPerSecond:selectedBitrate});
    var chunks=[];
    rec.ondataavailable=function(e){if(e.data.size>0)chunks.push(e.data);};
    rec.onstop=function(){
      var outType=isMP4?'video/mp4':'video/webm';
      var blob=new Blob(chunks,{type:outType});
      var url=URL.createObjectURL(blob);
      var link=document.createElement('a');
      link.href=url;
      link.download='resha-montage-'+Date.now()+'.'+fileExt;
      link.style.display='none';
      document.body.appendChild(link);
      link.click();
      setTimeout(function(){
        if(link.parentNode)document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },30000);
      images.forEach(function(it){
        if(it.type==='video'&&it.media){
          try{it.media.pause();it.media.muted=true;it.media.playbackRate=1;}catch(e){}
        }
      });
      as.forEach(function(s){try{s.stop();}catch(e){}});
      if(ac)ac.close();
      pc.classList.remove('active');
      eb.disabled=false;
      pb.disabled=false;
      isExporting=false;
      document.getElementById('shareRow').classList.remove('section-hidden');
      showToast('✅ تم التصدير — الفيديو في مجلد التنزيلات');
    };
    rec.start();
    as.forEach(function(s){try{s.start(0);}catch(e){}});
    var l=LAYOUTS.find(function(x){return x.id===currentLayout;});
    var ip=l?l.cells.length:1;
    var ts=Math.ceil(images.length/ip);
    var cs=0;
    var fst=performance.now();
    var lastExpScene=-1;
    function playSceneVideosForExport(sceneIdx){
      if(lastExpScene===sceneIdx)return;
      lastExpScene=sceneIdx;
      var si=sceneIdx*ip;
      images.forEach(function(it){
        if(it.type==='video'&&it.media){
          try{it.media.pause();it.media.currentTime=0;}catch(e){}
        }
      });
      for(var k=0;k<ip;k++){
        var idx=(si+k)%images.length;
        var it=images[idx];
        if(it&&it.type==='video'&&it.media){
          try{
            var startT=it.trim?it.trim.start:0;
            it.media.currentTime=startT;
            if(it.speed)it.media.playbackRate=it.speed;
            var pr=it.media.play();
            if(pr&&pr.catch)pr.catch(function(){});
          } catch(e){}
        }
      }
    }
    playSceneVideosForExport(0);
    function rf(){
      var now=performance.now();
      var d=getSceneDuration(cs);
      var el=(now-fst)/1000,p=el/d;
      ctx.clearRect(0,0,w,h);
      var si=cs*ip;
      if(p>0.75&&currentTransition!=='none'&&cs<ts-1){
        var tp=(p-0.75)/0.25;
        var ns=(cs+1)*ip;
        drawTransition(ctx,si,ns,w,h,tp);
      } else {
        drawLayout(ctx,si,w,h,1,p);
      }
      drawOverlays(ctx,w,h);
      if(p>=1){
        cs++;
        fst=now;
        if(cs>=ts){
          images.forEach(function(it){
            if(it.type==='video'&&it.media){try{it.media.pause();}catch(e){}}
          });
          rec.stop();
          return;
        } else {
          playSceneVideosForExport(cs);
        }
      }
      var tpr=(cs+p)/ts;
      pf.style.width=(tpr*100)+'%';
      pt.textContent='جاري التصدير '+Math.round(tpr*100)+'% ('+fileExt+' • '+QUALITY_LABELS[exportQuality]+')';
      requestAnimationFrame(rf);
    }
    rf();
  }).catch(function(err){
    console.error('خطأ:',err);
    showToast('حدث خطأ');
    pc.classList.remove('active');
    eb.disabled=false;
    pb.disabled=false;
    isExporting=false;
  });
};

// ============ SHARE ============
function getShareText(){return 'شاهد الفيديو الذي أنشأته من موقع ريشة 🎬';}
function getShareUrl(){return window.location.origin+window.location.pathname;}

window.shareWhatsApp=function(){
  window.open('https://wa.me/?text='+encodeURIComponent(getShareText()+' '+getShareUrl()),'_blank');
};
window.shareTwitter=function(){
  window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(getShareText())+'&url='+encodeURIComponent(getShareUrl()),'_blank');
};
window.shareTelegram=function(){
  window.open('https://t.me/share/url?url='+encodeURIComponent(getShareUrl())+'&text='+encodeURIComponent(getShareText()),'_blank');
};
window.copyShareLink=function(){
  var url=getShareUrl();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){showToast('✅ تم نسخ الرابط');}).catch(function(){showToast('تعذّر النسخ');});
  } else {
    var ta=document.createElement('textarea');
    ta.value=url;
    document.body.appendChild(ta);
    ta.select();
    try{document.execCommand('copy');showToast('✅ تم نسخ الرابط');}
    catch(e){showToast('تعذّر النسخ');}
    document.body.removeChild(ta);
  }
};

// ============ UPLOAD TO STORAGE ============
async function uploadFileToStorage(fileOrBlob,prefix){
  if(!fileOrBlob)return null;
  var ext='webm';
  if(fileOrBlob.name){
    var parts=fileOrBlob.name.split('.');
    if(parts.length>1)ext=parts[parts.length-1];
  } else if(fileOrBlob.type){
    if(fileOrBlob.type.indexOf('mp4')>-1)ext='mp4';
    else if(fileOrBlob.type.indexOf('webm')>-1)ext='webm';
    else {
      var m=fileOrBlob.type.match(/\/([a-z0-9]+)/i);
      if(m&&m[1])ext=m[1];
    }
  }
  var fn=currentUser.id+'/'+prefix+'-'+Date.now()+'.'+ext;
  var r=await sb.storage.from('audio').upload(fn,fileOrBlob,{
    contentType:fileOrBlob.type||'application/octet-stream',
    upsert:false
  });
  if(r.error)throw r.error;
  return sb.storage.from('audio').getPublicUrl(fn).data.publicUrl;
}

// ============ PROJECT DATA ============
function getProjectData(){
  return{
    images:images.map(function(i){
      return{
        src:i.src,type:i.type||'image',animation:i.animation,duration:i.duration,
        rotation:i.rotation,flipH:i.flipH,flipV:i.flipV,speed:i.speed,
        crop:i.crop,trim:i.trim,filter:i.filter
      };
    }),
    currentSize:currentSize,
    currentTransition:currentTransition,
    currentLayout:currentLayout,
    selectedAudio:selectedAudio,
    hasRecordedAudio:!!recordedAudioBlob,
    hasAudioUpload:!!audioUpload,
    hasMusic:!!musicFile,
    textElements:textElements.map(function(t){
      return{id:t.id,text:t.text,x:t.x,y:t.y,size:t.size,color:t.color,font:t.font,shadow:t.shadow,rotation:t.rotation};
    }),
    stickers:stickers.map(function(s){
      return{id:s.id,emoji:s.emoji,x:s.x,y:s.y,size:s.size,rotation:s.rotation};
    }),
    watermark:watermark?{
      enabled:watermark.enabled,type:watermark.type,text:watermark.text,
      color:watermark.color,size:watermark.size,position:watermark.position,
      opacity:watermark.opacity,hasImage:!!watermark.img
    }:null,
    backgroundMode:backgroundMode,
    backgroundCustomColor:backgroundCustomColor,
    exportQuality:exportQuality
  };
}

// ============ SAVE PROJECT ============
async function saveProject(){
  if(!currentUser){showToast('سجّل دخول أولاً');return;}
  if(images.length===0){showToast('أضف وسائط أولاً');return;}
  var name=prompt('اسم المشروع:','مشروع '+new Date().toLocaleDateString('ar'));
  if(!name)return;
  var category=prompt('التصنيف (عام / ريلز / ستوري / منشور / إعلان / مناسبات):','عام');
  if(!category)category='عام';
  var btn=document.getElementById('saveProjectBtn');
  btn.disabled=true;
  btn.textContent='⏳';
  showLoading('جاري رفع الملفات...');
  try{
    var audioUrls={};
    if(selectedAudio==='record'&&recordedAudioBlob)audioUrls.record=await uploadFileToStorage(recordedAudioBlob,'record');
    if(selectedAudio==='upload'&&audioUpload)audioUrls.upload=await uploadFileToStorage(audioUpload,'voice');
    if(musicFile)audioUrls.music=await uploadFileToStorage(musicFile,'music');
    var videoUrls={};
    for(var i=0;i<images.length;i++){
      if(isCancelled())throw new Error('تم الإلغاء');
      var it=images[i];
      if(it.type==='video'&&it.blob){
        try{
          showLoading('رفع فيديو '+(i+1)+'...');
          videoUrls[i]=await uploadFileToStorage(it.blob,'video-'+i);
        } catch(e){console.error(e);}
      }
    }
    var wmImgUrl=null;
    if(watermark&&watermark.type==='image'&&watermark.img){
      showLoading('جاري رفع الشعار...');
      try{
        var blob=await new Promise(function(res){
          watermark.img.toBlob(function(b){res(b);},'image/png');
        });
        if(blob)wmImgUrl=await uploadFileToStorage(blob,'wm');
      } catch(e){console.error(e);}
    }
    document.getElementById('loadingText').textContent='جاري حفظ المشروع...';
    var data=getProjectData();
    data.audioUrls=audioUrls;
    data.videoUrls=videoUrls;
    if(wmImgUrl)data.watermark.imageUrl=wmImgUrl;
    var thumbnail=(images[0]&&images[0].type!=='video')?images[0].src:null;
    var r=await sb.from('projects').insert({
      user_id:currentUser.id,
      name:name,
      data:data,
      thumbnail:thumbnail,
      category:category
    }).select().single();
    if(r.error)throw r.error;
    currentProjectId=r.data.id;
    showToast('تم حفظ المشروع ✅');
  } catch(err){
    if(err.message==='تم الإلغاء')showToast('تم إلغاء الحفظ');
    else showToast('فشل الحفظ: '+(err.message||'خطأ'));
  } finally {
    hideLoading();
    btn.disabled=false;
    btn.textContent='💾';
  }
}

// ============ PROJECTS LIST ============
async function openProjects(){
  if(!currentUser)return;
  document.getElementById('projectsOverlay').classList.add('active');
  var list=document.getElementById('projectsList');
  list.innerHTML='<div class="empty-hint">جاري التحميل...</div>';
  try{
    var r=await sb.from('projects').select('id,name,thumbnail,created_at,is_public').order('created_at',{ascending:false});
    if(r.error)throw r.error;
    var data=r.data;
    if(!data||data.length===0){
      list.innerHTML='<div class="empty-hint">لا توجد مشاريع محفوظة</div>';
      return;
    }
    list.innerHTML='';
    data.forEach(function(p){
      var el=document.createElement('div');
      el.className='project-item';
      var thumb=document.createElement('img');
      thumb.className='project-thumb';
      thumb.src=p.thumbnail||'';
      var info=document.createElement('div');
      info.className='project-info';
      info.innerHTML='<div class="project-name">'+escapeHtml(p.name)+'</div><div class="project-date">'+new Date(p.created_at).toLocaleString('ar')+'</div>';
      var acts=document.createElement('div');
      acts.className='project-actions';
      var lb=document.createElement('button');
      lb.className='project-load';
      lb.textContent='فتح';
      lb.onclick=function(){loadProjectById(p.id);};
      var pubBtn=document.createElement('button');
      pubBtn.className='project-pub'+(p.is_public?' on':'');
      pubBtn.textContent=p.is_public?'🌐 عام':'نشر';
      pubBtn.onclick=function(){togglePublic(p.id,!p.is_public);};
      var db=document.createElement('button');
      db.className='project-del';
      db.textContent='حذف';
      db.onclick=function(){deleteProjectById(p.id);};
      acts.appendChild(lb);
      acts.appendChild(pubBtn);
      acts.appendChild(db);
      el.appendChild(thumb);
      el.appendChild(info);
      el.appendChild(acts);
      list.appendChild(el);
    });
  } catch(err){
    console.error(err);
    list.innerHTML='<div class="empty-hint">فشل التحميل</div>';
  }
}

async function togglePublic(id,makePublic){
  try{
    var r=await sb.from('projects').update({is_public:makePublic}).eq('id',id);
    if(r.error)throw r.error;
    showToast(makePublic?'تم نشر المشروع 🌐':'تم إخفاؤه');
    openProjects();
  } catch(err){showToast('فشل');}
}

async function loadProjectById(id){
  closeProjects();
  showLoading('جاري تحميل المشروع...');
  try{
    var r=await sb.from('projects').select('*').eq('id',id).single();
    if(r.error)throw r.error;
    currentProjectId=r.data.id;
    await loadProjectData(r.data.data);
  } catch(err){
    console.error(err);
    showToast('فشل فتح المشروع');
  } finally {
    hideLoading();
  }
}

async function deleteProjectById(id){
  if(!confirm('حذف المشروع؟'))return;
  try{
    var r=await sb.from('projects').delete().eq('id',id);
    if(r.error)throw r.error;
    showToast('تم الحذف');
    openProjects();
  } catch(err){showToast('فشل');}
}

// ============ LOAD PROJECT DATA ============
async function loadProjectData(data){
  if(!data)return;
  images=[];
  audioUpload=null;
  musicFile=null;
  recordedAudioBlob=null;
  selectedAudio=null;
  textElements=[];
  stickers=[];
  watermark=null;
  document.getElementById('musicInfo').classList.add('section-hidden');
  document.getElementById('audioUploadInfo').classList.add('section-hidden');
  document.getElementById('recordPlayer').classList.remove('active');
  document.getElementById('recordActions').classList.add('section-hidden');
  document.getElementById('wmPreviewInfo').classList.add('section-hidden');
  if(data.backgroundMode)backgroundMode=data.backgroundMode;
  if(data.backgroundCustomColor)backgroundCustomColor=data.backgroundCustomColor;
  if(data.exportQuality){
    exportQuality=data.exportQuality;
    document.querySelectorAll('#qualityOptions .opt-btn').forEach(function(b){
      b.classList.toggle('active',b.dataset.quality===exportQuality);
    });
  }
  if(data.images&&data.images.length>0){
    var loaded=0,total=data.images.length;
    data.images.forEach(function(saved,i){
      if(saved.type==='video'&&data.videoUrls&&data.videoUrls[i]){
        fetch(data.videoUrls[i]).then(function(r){return r.blob();}).then(function(blob){
          var url=URL.createObjectURL(blob);
          var video=document.createElement('video');
          video.src=url;
          video.muted=true;
          video.playsInline=true;
          video.preload='metadata';
          video.onloadedmetadata=function(){
            video.currentTime=saved.trim?saved.trim.start:0.1;
            images[i]={
              type:'video',img:video,media:video,originalImg:video,blob:blob,src:url,
              animation:saved.animation||'fadeIn',duration:saved.duration||5,
              rotation:saved.rotation||0,flipH:!!saved.flipH,flipV:!!saved.flipV,
              speed:saved.speed!==undefined?saved.speed:1,
              crop:saved.crop||null,trim:saved.trim||null,filter:saved.filter||'none'
            };
            loaded++;
            if(loaded===total)finalize(data);
          };
        });
      } else {
        var img=new Image();
        img.onload=function(){
          images[i]={
            type:'image',img:img,media:img,originalImg:img,src:saved.src,
            animation:saved.animation||'none',duration:saved.duration||3,
            rotation:saved.rotation||0,flipH:!!saved.flipH,flipV:!!saved.flipV,
            speed:saved.speed!==undefined?saved.speed:1,
            crop:saved.crop||null,trim:saved.trim||null,filter:saved.filter||'none'
          };
          loaded++;
          if(loaded===total)finalize(data);
        };
        img.src=saved.src;
      }
    });
  } else {
    renderImagesGrid();
    updateInfo();
  }
  function finalize(data){
    currentSize=data.currentSize||'1080x1080';
    currentTransition=data.currentTransition||'fade';
    currentLayout=data.currentLayout||'single';
    document.querySelectorAll('#sizeOptions .opt-btn').forEach(function(b){
      b.classList.toggle('active',b.dataset.size===currentSize);
    });
    document.querySelectorAll('#transitionOptions .opt-btn').forEach(function(b){
      b.classList.toggle('active',b.dataset.transition===currentTransition);
    });
    if(data.textElements)textElements=data.textElements;
    if(data.stickers)stickers=data.stickers;
    if(data.watermark){
      watermark={
        enabled:data.watermark.enabled,type:data.watermark.type,
        text:data.watermark.text,color:data.watermark.color,
        size:data.watermark.size,position:data.watermark.position,
        opacity:data.watermark.opacity
      };
      if(data.watermark.imageUrl){
        var wmImg=new Image();
        wmImg.onload=function(){watermark.img=wmImg;window._wmImgCache=wmImg;};
        wmImg.src=data.watermark.imageUrl;
      }
      if(watermark.enabled){
        document.getElementById('wmOn').classList.add('active');
        document.getElementById('wmOff').classList.remove('active');
        document.getElementById('wmContent').classList.remove('section-hidden');
      }
    }
    renderImagesGrid();
    renderLayouts();
    updateButtons();
    updateInfo();
    renderElementsList();
    pushHistory();
    showToast('تم تحميل المشروع ✅');
  }
}

window.closeProjects=function(){
  document.getElementById('projectsOverlay').classList.remove('active');
};

// ============ GALLERY ============
var currentGalleryFilter='all';
var currentGalleryProject=null;
var currentViewProjectId=null;
var GALLERY_CATEGORIES=[
  {id:'all',name:'الكل'},{id:'عام',name:'عام'},{id:'ريلز',name:'ريلز'},
  {id:'ستوري',name:'ستوري'},{id:'منشور',name:'منشور'},
  {id:'إعلان',name:'إعلان'},{id:'مناسبات',name:'مناسبات'}
];

async function openGallery(){
  if(!currentUser){showToast('سجّل دخول');return;}
  document.getElementById('galleryOverlay').classList.add('active');
  buildGalleryCategories();
  await loadGallery();
  document.getElementById('gallerySearch').oninput=debounce(loadGallery,400);
  document.getElementById('gallerySort').onchange=loadGallery;
}

function buildGalleryCategories(){
  var bar=document.getElementById('galleryCategories');
  bar.innerHTML='';
  GALLERY_CATEGORIES.forEach(function(cat){
    var btn=document.createElement('button');
    btn.className='tab-btn'+(cat.id===currentGalleryFilter?' active':'');
    btn.textContent=cat.name;
    btn.onclick=function(){
      currentGalleryFilter=cat.id;
      bar.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      loadGallery();
    };
    bar.appendChild(btn);
  });
}

async function loadGallery(){
  var list=document.getElementById('galleryList');
  list.innerHTML='<div class="empty-hint">جاري التحميل...</div>';
  try{
    var search=document.getElementById('gallerySearch').value.trim();
    var sortBy=document.getElementById('gallerySort').value;
    var query=sb.from('projects').select('id,name,thumbnail,created_at,user_id,views,likes_count,category').eq('is_public',true);
    if(currentGalleryFilter!=='all')query=query.eq('category',currentGalleryFilter);
    if(search)query=query.ilike('name','%'+search+'%');
    if(sortBy==='likes')query=query.order('likes_count',{ascending:false});
    else if(sortBy==='views')query=query.order('views',{ascending:false});
    else query=query.order('created_at',{ascending:false});
    query=query.limit(60);
    var r=await query;
    if(r.error)throw r.error;
    var data=r.data;
    if(!data||data.length===0){
      list.innerHTML='<div class="empty-hint">لا توجد نتائج</div>';
      return;
    }
    var html='<div class="gallery-grid">';
    data.forEach(function(p){
      var author=p.user_id?p.user_id.substring(0,8):'مستخدم';
      html+='<div class="gallery-card" onclick="viewProject(\''+p.id+'\')">';
      html+='<img class="gallery-thumb" src="'+(p.thumbnail||'')+'" alt="">';
      html+='<div class="gallery-info">';
      html+='<div class="gallery-title">'+escapeHtml(p.name)+'</div>';
      html+='<div class="gallery-author">👤 '+author+'</div>';
      html+='<div style="display:flex;gap:8px;margin-top:6px;font-size:10px;color:#64748b;font-weight:700;">';
      html+='<span>❤️ '+(p.likes_count||0)+'</span>';
      html+='<span>👁️ '+(p.views||0)+'</span>';
      if(p.category)html+='<span style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">'+escapeHtml(p.category)+'</span>';
      html+='</div></div></div>';
    });
    html+='</div>';
    list.innerHTML=html;
  } catch(err){
    console.error(err);
    list.innerHTML='<div class="empty-hint">فشل التحميل</div>';
  }
}

async function viewProject(id){
  if(!currentUser){showToast('سجّل دخول');return;}
  currentViewProjectId=id;
  document.getElementById('viewProjectOverlay').classList.add('active');
  document.getElementById('viewProjectPreview').innerHTML='<div style="color:#64748b;font-weight:700;">جاري التحميل...</div>';
  document.getElementById('viewProjectInfo').innerHTML='';
  try{
    await sb.rpc('increment_views',{pid:id});
    var r=await sb.from('projects').select('*').eq('id',id).single();
    if(r.error)throw r.error;
    var p=r.data;
    currentGalleryProject=p;
    document.getElementById('viewProjectTitle').textContent=p.name;
    var author=p.user_id?p.user_id.substring(0,8):'مستخدم';
    var likeR=await sb.from('likes').select('id').eq('project_id',id).eq('user_id',currentUser.id).maybeSingle();
    var isLiked=likeR.data!=null;
    var preview=document.getElementById('viewProjectPreview');
    if(p.thumbnail){
      preview.innerHTML='<img src="'+p.thumbnail+'" style="max-width:100%;max-height:300px;border-radius:8px;">';
    } else {
      preview.innerHTML='<div style="color:#64748b;">لا توجد معاينة</div>';
    }
    document.getElementById('viewProjectInfo').innerHTML=
      '<div class="info-row"><span>المبدع</span><span class="info-row-value">👤 '+author+'</span></div>'+
      '<div class="info-row"><span>الإعجابات</span><span class="info-row-value">❤️ '+(p.likes_count||0)+'</span></div>'+
      '<div class="info-row"><span>المشاهدات</span><span class="info-row-value">👁️ '+(p.views||0)+'</span></div>'+
      '<div class="info-row"><span>التصنيف</span><span class="info-row-value">'+(p.category||'عام')+'</span></div>';
    var likeBtn=document.querySelector('#viewProjectOverlay .btn-export');
    if(likeBtn){
      if(isLiked){likeBtn.textContent='💔 إزالة الإعجاب';likeBtn.style.background='#64748b';}
      else{likeBtn.textContent='❤️ إعجاب';likeBtn.style.background='#10b981';}
      likeBtn.dataset.liked=isLiked?'1':'0';
    }
  } catch(err){
    console.error(err);
    showToast('فشل التحميل');
  }
}

async function likeCurrentProject(){
  if(!currentUser||!currentViewProjectId)return;
  var btn=document.querySelector('#viewProjectOverlay .btn-export');
  var isLiked=btn.dataset.liked==='1';
  try{
    if(isLiked){
      var r=await sb.from('likes').delete().eq('project_id',currentViewProjectId).eq('user_id',currentUser.id);
      if(r.error)throw r.error;
      showToast('تم إزالة الإعجاب');
    } else {
      var r=await sb.from('likes').insert({project_id:currentViewProjectId,user_id:currentUser.id});
      if(r.error)throw r.error;
      showToast('❤️ تم الإعجاب');
    }
    viewProject(currentViewProjectId);
    loadGallery();
  } catch(err){
    console.error(err);
    showToast('فشل');
  }
}

async function copyCurrentProject(){
  if(!currentGalleryProject)return;
  if(!confirm('نسخ هذا المشروع للتعديل عليه؟'))return;
  closeViewProject();
  showLoading('جاري النسخ...');
  try{
    await loadProjectData(currentGalleryProject.data);
    showToast('✅ تم نسخ المشروع');
  } catch(err){
    console.error(err);
    showToast('فشل النسخ');
  } finally {
    hideLoading();
  }
}

function closeViewProject(){
  document.getElementById('viewProjectOverlay').classList.remove('active');
  currentViewProjectId=null;
  currentGalleryProject=null;
}

window.viewProject=viewProject;
window.likeCurrentProject=likeCurrentProject;
window.copyCurrentProject=copyCurrentProject;
window.closeViewProject=closeViewProject;
window.closeGallery=function(){
  document.getElementById('galleryOverlay').classList.remove('active');
};

// ============ BUTTON LISTENERS ============
document.getElementById('saveProjectBtn').addEventListener('click',saveProject);
document.getElementById('myProjectsBtn').addEventListener('click',openProjects);
document.getElementById('galleryBtn').addEventListener('click',openGallery);

// ============ CAMERA ============
var cameraStream=null,cameraRecorder=null,cameraChunks=[];
var cameraTimerInterval=null,cameraStartTime=0;
var cameraFacing='environment',cameraMaxDuration=30,cameraFlashOn=false,cameraMuted=false;

window.openCamera=async function(){
  try{
    await startCameraStream();
    document.getElementById('cameraOverlay').classList.add('active');
    document.body.style.overflow='hidden';
  } catch(err){
    console.error(err);
    showToast('لم يتم السماح بالكاميرا');
  }
};

async function startCameraStream(){
  if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
  const constraints={
    video:{facingMode:cameraFacing,width:{ideal:1280,max:1280},height:{ideal:720,max:720},frameRate:{ideal:30,max:30}},
    audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,sampleRate:44100,channelCount:1}
  };
  cameraStream=await navigator.mediaDevices.getUserMedia(constraints);
  const preview=document.getElementById('cameraPreview');
  preview.srcObject=cameraStream;
  await preview.play();
  applyCameraMuteState();
}

function applyCameraMuteState(){
  if(!cameraStream)return;
  cameraStream.getAudioTracks().forEach(function(t){t.enabled=!cameraMuted;});
  var btn=document.getElementById('cameraMuteBtn');
  if(btn){
    if(cameraMuted){btn.textContent='🔇 الصوت مكتوم';btn.classList.add('muted');}
    else{btn.textContent='🔊 الصوت مفعّل';btn.classList.remove('muted');}
  }
}

window.toggleCameraMute=function(){
  cameraMuted=!cameraMuted;
  applyCameraMuteState();
  showToast(cameraMuted?'تم كتم الصوت':'تم تفعيل الصوت');
};

window.closeCamera=function(){
  if(cameraRecorder&&cameraRecorder.state==='recording')stopCameraRecording();
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
  document.getElementById('cameraPreview').srcObject=null;
  document.getElementById('cameraOverlay').classList.remove('active');
  document.body.style.overflow='';
  if(cameraTimerInterval){clearInterval(cameraTimerInterval);cameraTimerInterval=null;}
  document.getElementById('cameraTimer').textContent='00:00';
  document.getElementById('cameraRecordBtn').classList.remove('recording');
};

window.switchCamera=async function(){
  cameraFacing=cameraFacing==='environment'?'user':'environment';
  try{await startCameraStream();}
  catch(err){
    cameraFacing=cameraFacing==='environment'?'user':'environment';
    showToast('لم يتم تبديل الكاميرا');
  }
};

window.toggleCameraFlash=function(){
  if(!cameraStream)return;
  const track=cameraStream.getVideoTracks()[0];
  const cap=track.getCapabilities?track.getCapabilities():{};
  if(!cap.torch){showToast('الفلاش غير متاح');return;}
  cameraFlashOn=!cameraFlashOn;
  track.applyConstraints({advanced:[{torch:cameraFlashOn}]}).catch(()=>{});
  document.getElementById('cameraFlashBtn').style.background=cameraFlashOn?'#fbbf24':'rgba(255,255,255,.15)';
};

window.toggleCameraRecording=function(){
  if(cameraRecorder&&cameraRecorder.state==='recording')stopCameraRecording();
  else startCameraRecording();
};

function startCameraRecording(){
  if(!cameraStream)return;
  cameraChunks=[];
  applyCameraMuteState();
  var mimeOptions=[
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1','video/mp4',
    'video/webm;codecs=h264','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'
  ];
  var mimeType='';
  for(var i=0;i<mimeOptions.length;i++){
    if(MediaRecorder.isTypeSupported(mimeOptions[i])){mimeType=mimeOptions[i];break;}
  }
  var options=mimeType?{mimeType:mimeType}:{};
  try{cameraRecorder=new MediaRecorder(cameraStream,options);}
  catch(err){showToast('التسجيل غير مدعوم');return;}
  cameraRecorder.ondataavailable=function(e){if(e.data.size>0)cameraChunks.push(e.data);};
  cameraRecorder.onstop=async function(){
    var actualType=cameraRecorder.mimeType||mimeType||'video/webm';
    var blob=new Blob(cameraChunks,{type:actualType});
    await addVideoToProject(blob,actualType);
  };
  cameraRecorder.start();
  cameraStartTime=Date.now();
  document.getElementById('cameraRecordBtn').classList.add('recording');
  cameraTimerInterval=setInterval(updateCameraTimer,100);
}

function stopCameraRecording(){
  if(cameraRecorder&&cameraRecorder.state==='recording')cameraRecorder.stop();
  if(cameraTimerInterval){clearInterval(cameraTimerInterval);cameraTimerInterval=null;}
  document.getElementById('cameraRecordBtn').classList.remove('recording');
}

function updateCameraTimer(){
  const elapsed=Math.floor((Date.now()-cameraStartTime)/1000);
  const m=Math.floor(elapsed/60).toString().padStart(2,'0');
  const s=(elapsed%60).toString().padStart(2,'0');
  document.getElementById('cameraTimer').textContent=m+':'+s;
  if(elapsed>=cameraMaxDuration){
    stopCameraRecording();
    showToast('وصلت للحد الأقصى ('+cameraMaxDuration+' ث)');
  }
}

async function addVideoToProject(blob,mimeType){
  showLoading('جاري تحضير الفيديو...');
  try{
    mimeType=mimeType||blob.type||'video/webm';
    var ext='webm';
    if(mimeType.indexOf('mp4')>-1)ext='mp4';
    else if(mimeType.indexOf('webm')>-1)ext='webm';
    var file=new File([blob],'camera-'+Date.now()+'.'+ext,{type:mimeType});
    var url=URL.createObjectURL(file);
    var video=document.createElement('video');
    video.src=url;
    video.muted=false;
    video.playsInline=true;
    video.preload='metadata';
    await new Promise(function(res,rej){
      video.onloadedmetadata=function(){res();};
      video.onerror=function(){rej(new Error('فشل تحميل الفيديو'));};
      setTimeout(function(){rej(new Error('انتهت المهلة'));},10000);
    });
    video.currentTime=0.1;
    await new Promise(function(res){
      video.onseeked=function(){res();};
      setTimeout(res,1500);
    });
    var duration=Math.min(video.duration||5,60);
    var item={
      type:'video',media:video,img:video,src:url,blob:file,
      fileName:'camera-'+Date.now()+'.'+ext,mimeType:mimeType,
      animation:'fadeIn',duration:duration,rotation:0,flipH:false,flipV:false,
      speed:1,crop:null,trim:null,filter:'none'
    };
    item.originalImg=video;
    images.push(item);
    if(selectedImageIndex<0)selectedImageIndex=images.length-1;
    renderImagesGrid();
    renderLayouts();
    updateButtons();
    updateInfo();
    pushHistory();
    hideLoading();
    var formatLabel=(ext==='mp4')?'MP4 ✅':'WebM';
    showToast('تمت إضافة الفيديو ('+duration.toFixed(1)+' ث) - '+formatLabel);
    closeCamera();
  } catch(err){
    console.error(err);
    hideLoading();
    showToast('فشل إضافة الفيديو: '+(err.message||''));
  }
}

window.handleCameraFileUpload=async function(event){
  var file=event.target.files[0];
  if(!file)return;
  if(!file.type.startsWith('video/')){showToast('الرجاء اختيار ملف فيديو');return;}
  await addVideoToProject(file,file.type);
  event.target.value='';
};

// ============ DRAGGABLE ZONES ============
var dragState={active:false,type:null,index:-1,offsetX:0,offsetY:0};
var selectedElement={type:null,index:-1};

function getCanvasRect(){
  var canvas=document.getElementById('previewCanvas');
  return canvas.getBoundingClientRect();
}

function _renderDraggableZones_impl(){
  var wrapper=document.getElementById('draggableZones');
  if(!wrapper)return;
  wrapper.innerHTML='';
  var canvas=document.getElementById('previewCanvas');
  if(!canvas||canvas.style.display==='none')return;
  var rect=canvas.getBoundingClientRect();
  var parentRect=document.getElementById('previewWrapper').getBoundingClientRect();
  var offsetX=rect.left-parentRect.left;
  var offsetY=rect.top-parentRect.top;

  textElements.forEach(function(el,i){
    var zone=document.createElement('div');
    zone.className='draggable-zone active';
    if(selectedElement.type==='text'&&selectedElement.index===i)zone.classList.add('selected');
    var w=Math.min(260,Math.max(140,el.text.length*14)),h=80;
    zone.style.width=w+'px';
    zone.style.height=h+'px';
    zone.style.left=(offsetX+el.x*rect.width-w/2)+'px';
    zone.style.top=(offsetY+el.y*rect.height-h/2)+'px';
    zone.dataset.type='text';
    zone.dataset.index=i;
    var del=document.createElement('button');
    del.textContent='×';
    del.style.cssText='position:absolute;top:-8px;right:-8px;width:24px;height:24px;background:#ef4444;color:#fff;border:2px solid #fff;border-radius:50%;cursor:pointer;font-weight:900;font-size:13px;line-height:1;padding:0;z-index:11;';
    del.onclick=function(e){
      e.stopPropagation();
      textElements.splice(i,1);
      selectedElement={type:null,index:-1};
      renderElementsList();
      renderDraggableZones();
      pushHistory();
      activateCanvasForDrag();
      showToast('تم حذف النص');
    };
    zone.appendChild(del);
    attachDragEvents(zone);
    wrapper.appendChild(zone);
  });

  stickers.forEach(function(el,i){
    var zone=document.createElement('div');
    zone.className='draggable-zone active';
    if(selectedElement.type==='sticker'&&selectedElement.index===i)zone.classList.add('selected');
    var size=80;
    zone.style.width=size+'px';
    zone.style.height=size+'px';
    zone.style.left=(offsetX+el.x*rect.width-size/2)+'px';
    zone.style.top=(offsetY+el.y*rect.height-size/2)+'px';
    zone.dataset.type='sticker';
    zone.dataset.index=i;
    var del=document.createElement('button');
    del.textContent='×';
    del.style.cssText='position:absolute;top:-8px;right:-8px;width:24px;height:24px;background:#ef4444;color:#fff;border:2px solid #fff;border-radius:50%;cursor:pointer;font-weight:900;font-size:13px;line-height:1;padding:0;z-index:11;';
    del.onclick=function(e){
      e.stopPropagation();
      stickers.splice(i,1);
      selectedElement={type:null,index:-1};
      renderElementsList();
      renderDraggableZones();
      pushHistory();
      activateCanvasForDrag();
      showToast('تم حذف الملصق');
    };
    zone.appendChild(del);
    attachDragEvents(zone);
    wrapper.appendChild(zone);
  });
}

function renderDraggableZones(){
  setTimeout(_renderDraggableZones_impl,30);
}
window._renderDraggableZones=renderDraggableZones;

function startDrag(e){
  var zone=e.currentTarget;
  var type=zone.dataset.type;
  var index=parseInt(zone.dataset.index);
  var touch=e.touches?e.touches[0]:e;
  var rect=getCanvasRect();
  var item=type==='text'?textElements[index]:stickers[index];
  if(!item)return;
  dragState.active=true;
  dragState.type=type;
  dragState.index=index;
  dragState.offsetX=(touch.clientX-rect.left)/rect.width-item.x;
  dragState.offsetY=(touch.clientY-rect.top)/rect.height-item.y;
  selectedElement.type=type;
  selectedElement.index=index;
  zone.classList.add('dragging');
  document.getElementById('previewWrapper').classList.add('dragging');
  e.preventDefault();
  e.stopPropagation();
}

function moveDrag(e){
  if(!dragState.active)return;
  var touch=e.touches?e.touches[0]:e;
  var rect=getCanvasRect();
  var newX=(touch.clientX-rect.left)/rect.width-dragState.offsetX;
  var newY=(touch.clientY-rect.top)/rect.height-dragState.offsetY;
  newX=Math.max(0.05,Math.min(0.95,newX));
  newY=Math.max(0.05,Math.min(0.95,newY));
  var item=dragState.type==='text'?textElements[dragState.index]:stickers[dragState.index];
  if(item){
    item.x=newX;
    item.y=newY;
    _updateZonePosition(dragState.type,dragState.index,newX,newY);
  }
  e.preventDefault();
}

function _updateZonePosition(type,index,x,y){
  var zones=document.querySelectorAll('.draggable-zone');
  var target=null;
  zones.forEach(function(z){
    if(z.dataset.type===type&&parseInt(z.dataset.index)===index)target=z;
  });
  if(!target)return;
  var canvas=document.getElementById('previewCanvas');
  var rect=canvas.getBoundingClientRect();
  var parentRect=document.getElementById('previewWrapper').getBoundingClientRect();
  var offsetX=rect.left-parentRect.left;
  var offsetY=rect.top-parentRect.top;
  var w=target.offsetWidth;
  var h=target.offsetHeight;
  target.style.left=(offsetX+x*rect.width-w/2)+'px';
  target.style.top=(offsetY+y*rect.height-h/2)+'px';
  redrawStaticPreview();
}

function endDrag(e){
  if(!dragState.active)return;
  dragState.active=false;
  var wrapper=document.getElementById('previewWrapper');
  if(wrapper)wrapper.classList.remove('dragging');
  document.querySelectorAll('.draggable-zone.dragging').forEach(function(z){z.classList.remove('dragging');});
  pushHistory();
}

function attachDragEvents(zone){
  zone.addEventListener('mousedown',startDrag);
  zone.addEventListener('touchstart',startDrag,{passive:false});
}

document.addEventListener('mousemove',moveDrag);
document.addEventListener('touchmove',moveDrag,{passive:false});
document.addEventListener('mouseup',endDrag);
document.addEventListener('touchend',endDrag);

function redrawStaticPreview(){
  var canvas=document.getElementById('previewCanvas');
  if(!canvas||canvas.style.display==='none')return;
  var ctx=canvas.getContext('2d');
  var sz=currentSize.split('x');
  var w=parseInt(sz[0]),h=parseInt(sz[1]);
  var ps=Math.min(400/w,400/h,1);
  canvas.width=w*ps;
  canvas.height=h*ps;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(images.length>0){drawLayout(ctx,0,canvas.width,canvas.height,1,0.5);}
  drawOverlays(ctx,canvas.width,canvas.height);
}

// ============ RESIZE ============
window.addEventListener('resize',function(){setTimeout(renderDraggableZones,200);});
window.addEventListener('orientationchange',function(){setTimeout(renderDraggableZones,400);});

// ============ INIT ============
window.addEventListener('load',function(){
  renderLayouts();
  updateInfo();
  if(!window.MediaRecorder){
    showToast('متصفحك لا يدعم تصدير الفيديو');
    document.getElementById('exportBtn').disabled=true;
  }
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    var rb=document.getElementById('recordBtn');
    if(rb)rb.disabled=true;
  }
  trackEvent('montage-زيارة');
  setTimeout(function(){pushHistory();},500);
  console.log('✅ ريشة المونتاج v7.0 — كل المميزات');
});
