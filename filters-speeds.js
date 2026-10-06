/* ═══════════════════════════════════════════════════
   ريشة — الفلاتر والسرعات
   ملف: filters-speeds.js
   ═══════════════════════════════════════════════════ */
(function() {
  'use strict';

  if (typeof window === 'undefined') return;

  function waitForMontage() {
    if (typeof images === 'undefined' || typeof pushHistory === 'undefined') {
      setTimeout(waitForMontage, 500);
      return;
    }
    initFiltersSpeeds();
  }

  function initFiltersSpeeds() {
    if (window._filtersSpeedsInitialized) return;
    window._filtersSpeedsInitialized = true;
    injectStyles();
    injectUI();
    console.log('✅ الفلاتر والسرعات جاهزة');
  }

  /* ═══ الفلاتر ═══ */
  var FILTERS = [
    {id:'none',     name:'بدون',      emoji:'⭕', css:'none'},
    {id:'grayscale',name:'أبيض وأسود',emoji:'⚫', css:'grayscale(1) contrast(1.1)'},
    {id:'warm',     name:'دافئ',      emoji:'🌅', css:'saturate(1.3) hue-rotate(-10deg) brightness(1.05)'},
    {id:'cold',     name:'بارد',      emoji:'❄️', css:'saturate(1.1) hue-rotate(20deg) brightness(1.02)'},
    {id:'vintage',  name:'قديم',      emoji:'📸', css:'sepia(0.6) saturate(1.2) contrast(1.1) brightness(0.95)'},
    {id:'cinematic',name:'سينمائي',   emoji:'🎬', css:'contrast(1.3) saturate(0.9) brightness(0.95)'},
    {id:'hdr',      name:'HDR',       emoji:'✨', css:'contrast(1.4) saturate(1.3) brightness(1.1)'},
    {id:'pastel',   name:'باستيل',    emoji:'🌸', css:'saturate(0.7) brightness(1.15) contrast(0.9)'},
    {id:'vibrant',  name:'نابض',      emoji:'🌈', css:'saturate(1.6) contrast(1.15)'},
    {id:'film',     name:'فيلم',      emoji:'🎞️', css:'sepia(0.3) saturate(1.4) contrast(1.2)'},
    {id:'dark',     name:'داكن',      emoji:'🌃', css:'brightness(0.7) contrast(1.3) saturate(0.9)'},
    {id:'bright',   name:'مشرق',      emoji:'☀️', css:'brightness(1.25) contrast(1.05)'}
  ];

  var SPEEDS = [
    {value:0.25, label:'0.25x', name:'بطيء جداً'},
    {value:0.5,  label:'0.5x',  name:'بطيء'},
    {value:0.75, label:'0.75x', name:'شبه بطيء'},
    {value:1,    label:'1x',    name:'عادي'},
    {value:1.5,  label:'1.5x',  name:'سريع'},
    {value:2,    label:'2x',    name:'سريع جداً'},
    {value:3,    label:'3x',    name:'فائق'},
    {value:4,    label:'4x',    name:'مجنون'}
  ];

  /* ═══ حقن الأنماط ═══ */
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = `
      .filter-panel {
        padding: 12px 0;
        border-top: 1.5px solid #e2e8f0;
        margin-top: 12px;
      }
      .filter-panel-title {
        font-size: 13px;
        font-weight: 900;
        color: #0f172a;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
        gap: 6px;
      }
      .filter-btn {
        padding: 8px 4px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        font-family: 'Cairo', sans-serif;
        font-weight: 700;
        font-size: 10px;
        color: #475569;
        transition: all 0.15s;
      }
      .filter-btn:active { transform: scale(0.95); }
      .filter-btn.active {
        border-color: #0f172a;
        background: #f1f5f9;
        color: #0f172a;
      }
      .filter-btn .filter-emoji {
        font-size: 20px;
        line-height: 1;
      }
      .filter-btn .filter-name {
        text-align: center;
        line-height: 1.2;
      }

      .speeds-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
      .speed-btn {
        padding: 10px 4px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
        font-family: 'Cairo', sans-serif;
        font-weight: 800;
        font-size: 13px;
        color: #475569;
        transition: all 0.15s;
        direction: ltr;
      }
      .speed-btn:active { transform: scale(0.95); }
      .speed-btn.active {
        border-color: #0f172a;
        background: #0f172a;
        color: #fff;
      }
      .speed-btn.slow { color: #3b82f6; }
      .speed-btn.slow.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }
      .speed-btn.fast { color: #ef4444; }
      .speed-btn.fast.active { background: #ef4444; border-color: #ef4444; color: #fff; }

      .filter-hint {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 8px;
        text-align: center;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }

  /* ═══ حقن الواجهة ═══ */
  function injectUI() {
    // ننتظر تاب "الحركات" يجهز
    setTimeout(function() {
      var animatePanel = document.getElementById('panel-animate');
      if (!animatePanel) {
        setTimeout(injectUI, 500);
        return;
      }

      var animateContent = document.getElementById('animateContent');
      if (!animateContent) {
        setTimeout(injectUI, 500);
        return;
      }

      // خلي الفلاتر تحت القسم الموجود
      var filtersHTML = `
        <div class="filter-panel">
          <div class="filter-panel-title">🎨 فلاتر الألوان</div>
          <div class="filters-grid" id="filtersGrid"></div>
          <div class="filter-hint">💡 اضغط فلتر لتطبيقه</div>
        </div>
        <div class="filter-panel">
          <div class="filter-panel-title">⏩ سرعة الفيديو</div>
          <div class="speeds-grid" id="speedsGrid"></div>
          <div class="filter-hint">💡 يعمل على الفيديو فقط</div>
        </div>
      `;

      animateContent.insertAdjacentHTML('beforeend', filtersHTML);

      renderFilters();
      renderSpeeds();
      setupFilterListeners();
      setupSpeedListeners();

    }, 1000);
  }

  /* ═══ رسم الفلاتر ═══ */
  function renderFilters() {
    var grid = document.getElementById('filtersGrid');
    if (!grid) return;
    grid.innerHTML = '';

    FILTERS.forEach(function(filter) {
      var btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = filter.id;
      btn.innerHTML = '<span class="filter-emoji">' + filter.emoji + '</span>' +
                      '<span class="filter-name">' + filter.name + '</span>';
      grid.appendChild(btn);
    });
  }

  /* ═══ رسم السرعات ═══ */
  function renderSpeeds() {
    var grid = document.getElementById('speedsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    SPEEDS.forEach(function(speed) {
      var btn = document.createElement('button');
      btn.className = 'speed-btn';
      if (speed.value < 1) btn.classList.add('slow');
      if (speed.value > 1) btn.classList.add('fast');
      btn.dataset.speed = speed.value;
      btn.textContent = speed.label;
      btn.title = speed.name;
      grid.appendChild(btn);
    });
  }

  /* ═══ أحداث الفلاتر ═══ */
  function setupFilterListeners() {
    var grid = document.getElementById('filtersGrid');
    if (!grid) return;

    grid.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      if (typeof selectedImageIndex === 'undefined' || selectedImageIndex < 0) {
        if (typeof showToast === 'function') showToast('اختر صورة أو فيديو أولاً');
        return;
      }
      var filterId = btn.dataset.filter;
      applyFilter(filterId);
    });

    // أحداث خارجية لتحديث الحالة
    document.addEventListener('selectionChanged', updateFilterUI);
    setInterval(updateFilterUI, 800);
  }

  /* ═══ أحداث السرعات ═══ */
  function setupSpeedListeners() {
    var grid = document.getElementById('speedsGrid');
    if (!grid) return;

    grid.addEventListener('click', function(e) {
      var btn = e.target.closest('.speed-btn');
      if (!btn) return;
      if (typeof selectedImageIndex === 'undefined' || selectedImageIndex < 0) {
        if (typeof showToast === 'function') showToast('اختر فيديو أولاً');
        return;
      }
      var item = images[selectedImageIndex];
      if (item.type !== 'video') {
        if (typeof showToast === 'function') showToast('السرعة تعمل على الفيديو فقط');
        return;
      }
      var speedValue = parseFloat(btn.dataset.speed);
      applySpeed(speedValue);
    });

    setInterval(updateSpeedUI, 800);
  }

  /* ═══ تطبيق الفلتر ═══ */
  function applyFilter(filterId) {
    var item = images[selectedImageIndex];
    if (!item) return;

    var filter = FILTERS.find(function(f) { return f.id === filterId; });
    if (!filter) return;

    // احفظ الفلتر في العنصر
    item.filter = filterId;

    // طبّق الفلتر على العنصر
    if (item.type === 'video') {
      // للفيديو: نستخدم CSS filter
      item.media.style.filter = filter.css === 'none' ? '' : filter.css;
    } else {
      // للصورة: نطبّق على img مباشرة
      item.img.style.filter = filter.css === 'none' ? '' : filter.css;
    }

    // حدّث الواجهة
    updateFilterUI();
    if (typeof pushHistory === 'function') pushHistory();
    if (typeof renderImagesGrid === 'function') renderImagesGrid();
    if (typeof activateCanvasForDrag === 'function') activateCanvasForDrag();
    if (typeof showToast === 'function') showToast('تم تطبيق: ' + filter.emoji + ' ' + filter.name);
  }

  /* ═══ تطبيق السرعة ═══ */
  function applySpeed(speedValue) {
    var item = images[selectedImageIndex];
    if (!item || item.type !== 'video') {
      if (typeof showToast === 'function') showToast('السرعة تعمل على الفيديو فقط');
      return;
    }

    // احفظ السرعة
    item.speed = speedValue;

    // طبّق على الفيديو
    try {
      item.media.playbackRate = speedValue;
    } catch(e) {
      console.warn('Speed apply error:', e);
    }

    // عدّل المدة
    var baseDur = item.trim ? (item.trim.end - item.trim.start) : (item.originalDuration || item.duration * (1 / (item._oldSpeed || 1)));
    item.duration = baseDur / speedValue;

    // حدّث الواجهة
    updateSpeedUI();
    if (typeof pushHistory === 'function') pushHistory();
    if (typeof renderImagesGrid === 'function') renderImagesGrid();
    if (typeof updateInfo === 'function') updateInfo();
    if (typeof showToast === 'function') showToast('السرعة: ' + speedValue + 'x');
  }

  /* ═══ تحديث واجهة الفلاتر ═══ */
  function updateFilterUI() {
    var currentFilterId = 'none';
    if (typeof selectedImageIndex !== 'undefined' && selectedImageIndex >= 0 && images[selectedImageIndex]) {
      currentFilterId = images[selectedImageIndex].filter || 'none';
    }

    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.filter === currentFilterId);
    });
  }

  /* ═══ تحديث واجهة السرعات ═══ */
  function updateSpeedUI() {
    var currentSpeed = 1;
    var isVideo = false;
    if (typeof selectedImageIndex !== 'undefined' && selectedImageIndex >= 0 && images[selectedImageIndex]) {
      var item = images[selectedImageIndex];
      if (item.type === 'video') {
        isVideo = true;
        currentSpeed = item.speed !== undefined ? item.speed : 1;
      }
    }

    document.querySelectorAll('.speed-btn').forEach(function(btn) {
      var val = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', isVideo && val === currentSpeed);
      btn.style.opacity = isVideo ? '1' : '0.5';
      btn.style.pointerEvents = isVideo ? 'auto' : 'none';
    });
  }

  /* ═══ تطبيق الفلتر على الرسم ═══ */
  // نحتاج نعدّل drawImageInCell عشان يطبق الفلتر
  var _origDrawImageInCell = null;

  function patchDrawFunction() {
    if (typeof drawImageInCell === 'undefined') {
      setTimeout(patchDrawFunction, 500);
      return;
    }
    if (_origDrawImageInCell) return; // تم بالفعل

    _origDrawImageInCell = drawImageInCell;

    window.drawImageInCell = function(ctx, item, x, y, w, h, opacity, animProgress) {
      // طبّق الفلتر قبل الرسم
      var filterCss = 'none';
      if (item.filter) {
        var f = FILTERS.find(function(fl) { return fl.id === item.filter; });
        if (f && f.css !== 'none') {
          filterCss = f.css;
        }
      }

      if (filterCss !== 'none') {
        ctx.save();
        ctx.filter = filterCss;
        _origDrawImageInCell.apply(this, arguments);
        ctx.filter = 'none';
        ctx.restore();
      } else {
        _origDrawImageInCell.apply(this, arguments);
      }
    };
  }

  patchDrawFunction();

  /* ═══ الانتظار للتحميل ═══ */
  setTimeout(function() {
    waitForMontage();
  }, 500);

})();
