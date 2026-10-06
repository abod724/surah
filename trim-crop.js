/* ═══════════════════════════════════════════════════
   ريشة — القص الاحترافي للفيديو
   ملف: trim-crop.js
   ═══════════════════════════════════════════════════ */
(function() {
  'use strict';

  if (typeof window === 'undefined') return;

  /* ═══ انتظر تحميل المونتاج ═══ */
  function waitForMontage() {
    if (typeof images === 'undefined' || typeof pushHistory === 'undefined') {
      setTimeout(waitForMontage, 500);
      return;
    }
    initTrimCrop();
  }

  function initTrimCrop() {
    if (window._trimCropInitialized) return;
    window._trimCropInitialized = true;
    injectStyles();
    console.log('✅ القص الاحترافي جاهز');
  }

  /* ═══ حقن الأنماط ═══ */
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = `
      #trimOverlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.95);
        z-index: 100000; display: none; flex-direction: column;
        font-family: 'Cairo', sans-serif; direction: rtl;
      }
      #trimOverlay.active { display: flex; }

      .trim-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 14px 18px; background: rgba(0,0,0,0.6);
        color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .trim-title { font-size: 17px; font-weight: 900; }
      .trim-close {
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(255,255,255,0.15); color: #fff;
        border: none; font-size: 20px; cursor: pointer;
      }

      .trim-preview {
        flex: 1; display: flex; align-items: center; justify-content: center;
        background: #000; position: relative; overflow: hidden;
        min-height: 200px; max-height: 45vh;
      }
      #trimVideoPreview {
        max-width: 100%; max-height: 100%;
        border-radius: 8px;
      }
      .trim-time-display {
        position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.85); color: #fff;
        padding: 6px 16px; border-radius: 20px;
        font-size: 13px; font-weight: 800;
        font-family: monospace; direction: ltr;
      }

      .trim-timeline-wrapper {
        padding: 16px;
        background: #0f172a;
        border-top: 1px solid rgba(255,255,255,0.1);
      }

      .trim-timeline-labels {
        display: flex; justify-content: space-between;
        color: #94a3b8; font-size: 11px; font-weight: 700;
        margin-bottom: 6px; font-family: monospace;
      }

      .trim-timeline {
        position: relative;
        height: 80px;
        background: #1e293b;
        border-radius: 10px;
        overflow: hidden;
        touch-action: none;
        user-select: none;
      }

      #trimThumbnails {
        display: flex;
        height: 100%;
        width: 100%;
      }
      #trimThumbnails canvas {
        flex: 1;
        height: 100%;
        object-fit: cover;
      }

      .trim-selection {
        position: absolute;
        top: 0; bottom: 0;
        left: 0; right: 0;
        border: 3px solid #10b981;
        border-radius: 10px;
        pointer-events: none;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }
      .trim-selection.dragging { border-color: #fbbf24; }

      .trim-handle {
        position: absolute;
        top: 0; bottom: 0;
        width: 24px;
        background: #10b981;
        cursor: grab;
        touch-action: none;
        display: flex; align-items: center; justify-content: center;
        pointer-events: auto;
        transition: background 0.15s;
      }
      .trim-handle:hover, .trim-handle.dragging {
        background: #fbbf24;
      }
      .trim-handle:active { cursor: grabbing; }
      .trim-handle::after {
        content: '';
        width: 4px; height: 30px;
        background: rgba(255,255,255,0.9);
        border-radius: 2px;
      }
      .trim-handle.left { border-radius: 8px 0 0 8px; }
      .trim-handle.right { border-radius: 0 8px 8px 0; }

      .trim-info {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        margin-top: 12px;
      }
      .trim-info-item {
        background: #1e293b;
        padding: 10px 8px;
        border-radius: 10px;
        text-align: center;
        color: #fff;
      }
      .trim-info-label {
        font-size: 10px; color: #94a3b8; font-weight: 700;
        margin-bottom: 4px;
      }
      .trim-info-value {
        font-size: 14px; font-weight: 900;
        font-family: monospace; direction: ltr;
        color: #10b981;
      }

      .trim-actions {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        padding: 16px;
        background: rgba(0,0,0,0.6);
      }
      .trim-action-btn {
        padding: 14px 10px;
        border: none;
        border-radius: 12px;
        font-family: 'Cairo', sans-serif;
        font-weight: 800;
        font-size: 13px;
        cursor: pointer;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.15s;
      }
      .trim-action-btn:active { transform: scale(0.97); }
      .trim-btn-play { background: #3b82f6; }
      .trim-btn-reset { background: #64748b; }
      .trim-btn-apply { background: #10b981; }
      .trim-btn-apply:disabled { opacity: 0.5; cursor: not-allowed; }

      .trim-hint {
        text-align: center;
        padding: 8px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 700;
      }

      /* زر القص في المعاينة */
      .trim-open-btn {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(16,185,129,0.95);
        color: #fff;
        border: none;
        padding: 10px 16px;
        border-radius: 10px;
        font-family: 'Cairo', sans-serif;
        font-weight: 800;
        font-size: 13px;
        cursor: pointer;
        z-index: 50;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s;
      }
      .trim-open-btn:active { transform: scale(0.95); }
    `;
    document.head.appendChild(style);
    buildTrimOverlay();
  }

  /* ═══ بناء النافذة ═══ */
  function buildTrimOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'trimOverlay';
    overlay.innerHTML = `
      <div class="trim-header">
        <button class="trim-close" onclick="window._trimCropClose()">✕</button>
        <div class="trim-title">✂️ قص الفيديو</div>
        <div style="width:40px;"></div>
      </div>
      <div class="trim-preview">
        <video id="trimVideoPreview" playsinline muted></video>
        <div class="trim-time-display" id="trimCurrentTime">00:00.0</div>
      </div>
      <div class="trim-timeline-wrapper">
        <div class="trim-timeline-labels">
          <span id="trimStartLabel">00:00.0</span>
          <span id="trimEndLabel">00:00.0</span>
        </div>
        <div class="trim-timeline" id="trimTimeline">
          <div id="trimThumbnails"></div>
          <div class="trim-selection" id="trimSelection"></div>
          <div class="trim-handle left" id="trimHandleLeft"></div>
          <div class="trim-handle right" id="trimHandleRight"></div>
        </div>
        <div class="trim-info">
          <div class="trim-info-item">
            <div class="trim-info-label">البداية</div>
            <div class="trim-info-value" id="trimInfoStart">0.0s</div>
          </div>
          <div class="trim-info-item">
            <div class="trim-info-label">المدة المختارة</div>
            <div class="trim-info-value" id="trimInfoDuration">0.0s</div>
          </div>
          <div class="trim-info-item">
            <div class="trim-info-label">النهاية</div>
            <div class="trim-info-value" id="trimInfoEnd">0.0s</div>
          </div>
        </div>
        <div class="trim-hint">💡 اسحب المقابض الخضراء من الجانبين</div>
      </div>
      <div class="trim-actions">
        <button class="trim-action-btn trim-btn-play" onclick="window._trimCropPlay()">▶️ معاينة</button>
        <button class="trim-action-btn trim-btn-reset" onclick="window._trimCropReset()">↺ إعادة</button>
        <button class="trim-action-btn trim-btn-apply" id="trimApplyBtn" onclick="window._trimCropApply()">✅ تطبيق</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  /* ═══ حالة القص ═══ */
  var trimState = {
    active: false,
    item: null,
    index: -1,
    videoEl: null,
    duration: 0,
    startTime: 0,
    endTime: 0,
    dragging: null,
    isPlaying: false
  };

  /* ═══ فتح القص ═══ */
  window._trimCropOpen = function(index) {
    var item = images[index];
    if (!item || item.type !== 'video') {
      alert('القص يعمل على الفيديو فقط');
      return;
    }

    trimState.active = true;
    trimState.item = item;
    trimState.index = index;
    trimState.videoEl = item.media || item.img;
    trimState.duration = trimState.videoEl.duration || 0;
    trimState.startTime = 0;
    trimState.endTime = trimState.duration;

    if (item.trim) {
      trimState.startTime = item.trim.start || 0;
      trimState.endTime = item.trim.end || trimState.duration;
    }

    document.getElementById('trimOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';

    var videoPreview = document.getElementById('trimVideoPreview');
    videoPreview.src = item.src;
    videoPreview.currentTime = trimState.startTime;

    buildThumbnails(item.src, trimState.duration);

    setTimeout(function() {
      updateSelection();
      renderTimeLabels();
      updateInfoDisplay();
    }, 50);
  };

  /* ═══ بناء الصور المصغرة ═══ */
  function buildThumbnails(src, duration) {
    var container = document.getElementById('trimThumbnails');
    container.innerHTML = '';

    var THUMB_COUNT = 12;
    var video = document.createElement('video');
    video.src = src;
    video.muted = true;
    video.preload = 'metadata';

    video.onloadedmetadata = function() {
      var thumbWidth = 100;
      var thumbHeight = 80;
      var canvas = document.createElement('canvas');
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      var ctx = canvas.getContext('2d');

      var loaded = 0;
      var thumbnails = [];

      function captureFrame(time, index) {
        video.currentTime = time;
        video.onseeked = function() {
          try {
            ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);
            thumbnails[index] = canvas.toDataURL('image/jpeg', 0.5);
          } catch(e) {
            thumbnails[index] = '';
          }
          loaded++;
          if (loaded === THUMB_COUNT) {
            thumbnails.forEach(function(url) {
              var img = document.createElement('img');
              img.src = url;
              img.style.cssText = 'flex:1;height:100%;object-fit:cover;';
              container.appendChild(img);
            });
          }
        };
      }

      for (var i = 0; i < THUMB_COUNT; i++) {
        var t = (duration / THUMB_COUNT) * i;
        captureFrame(Math.min(t, duration - 0.1), i);
      }
    };

    video.onerror = function() {
      // فشل: نضع صورة رمادية
      for (var i = 0; i < THUMB_COUNT; i++) {
        var img = document.createElement('div');
        img.style.cssText = 'flex:1;height:100%;background:#334155;border-right:1px solid #1e293b;';
        container.appendChild(img);
      }
    };

    video.load();
  }

  /* ═══ تحديث الاختيار البصري ═══ */
  function updateSelection() {
    var timeline = document.getElementById('trimTimeline');
    var selection = document.getElementById('trimSelection');
    var handleLeft = document.getElementById('trimHandleLeft');
    var handleRight = document.getElementById('trimHandleRight');

    if (!timeline || !trimState.duration) return;

    var width = timeline.clientWidth;
    var startPct = (trimState.startTime / trimState.duration) * 100;
    var endPct = (trimState.endTime / trimState.duration) * 100;

    selection.style.left = startPct + '%';
    selection.style.right = (100 - endPct) + '%';

    handleLeft.style.left = 'calc(' + startPct + '% - 12px)';
    handleRight.style.left = 'calc(' + endPct + '% - 12px)';

    renderTimeLabels();
    updateInfoDisplay();
  }

  /* ═══ عرض الوقت ═══ */
  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '00:00.0';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    var d = Math.floor((sec % 1) * 10);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + d;
  }

  function renderTimeLabels() {
    document.getElementById('trimStartLabel').textContent = formatTime(trimState.startTime);
    document.getElementById('trimEndLabel').textContent = formatTime(trimState.endTime);
  }

  function updateInfoDisplay() {
    document.getElementById('trimInfoStart').textContent = trimState.startTime.toFixed(1) + 's';
    document.getElementById('trimInfoEnd').textContent = trimState.endTime.toFixed(1) + 's';
    document.getElementById('trimInfoDuration').textContent = (trimState.endTime - trimState.startTime).toFixed(1) + 's';
  }

  /* ═══ السحب ═══ */
  var dragState = { active: false, side: null, startX: 0, startTime: 0, startEnd: 0 };

  function setupDrag() {
    var handleLeft = document.getElementById('trimHandleLeft');
    var handleRight = document.getElementById('trimHandleRight');
    var selection = document.getElementById('trimSelection');
    var timeline = document.getElementById('trimTimeline');

    function getClientX(e) {
      return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function startDrag(side, e) {
      e.preventDefault();
      e.stopPropagation();
      dragState.active = true;
      dragState.side = side;
      dragState.startX = getClientX(e);
      dragState.startTime = trimState.startTime;
      dragState.startEnd = trimState.endTime;
      if (side === 'left') handleLeft.classList.add('dragging');
      if (side === 'right') handleRight.classList.add('dragging');
      selection.classList.add('dragging');
    }

    function moveDrag(e) {
      if (!dragState.active) return;
      e.preventDefault();
      var deltaX = getClientX(e) - dragState.startX;
      var deltaTime = (deltaX / timeline.clientWidth) * trimState.duration;

      if (dragState.side === 'left') {
        var newStart = Math.max(0, Math.min(trimState.endTime - 0.3, dragState.startTime + deltaTime));
        trimState.startTime = newStart;
        trimState.videoEl.currentTime = newStart;
      } else if (dragState.side === 'right') {
        var newEnd = Math.max(trimState.startTime + 0.3, Math.min(trimState.duration, dragState.startEnd + deltaTime));
        trimState.endTime = newEnd;
        trimState.videoEl.currentTime = newEnd;
      }

      document.getElementById('trimCurrentTime').textContent = formatTime(trimState.videoEl.currentTime);
      updateSelection();
    }

    function endDrag() {
      if (!dragState.active) return;
      dragState.active = false;
      handleLeft.classList.remove('dragging');
      handleRight.classList.remove('dragging');
      selection.classList.remove('dragging');
    }

    handleLeft.addEventListener('mousedown', function(e) { startDrag('left', e); });
    handleLeft.addEventListener('touchstart', function(e) { startDrag('left', e); }, {passive: false});
    handleRight.addEventListener('mousedown', function(e) { startDrag('right', e); });
    handleRight.addEventListener('touchstart', function(e) { startDrag('right', e); }, {passive: false});

    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('touchmove', moveDrag, {passive: false});
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    // Playhead animation
    var video = document.getElementById('trimVideoPreview');
    video.addEventListener('timeupdate', function() {
      document.getElementById('trimCurrentTime').textContent = formatTime(video.currentTime);
    });
  }

  /* ═══ معاينة القص ═══ */
  window._trimCropPlay = function() {
    var video = document.getElementById('trimVideoPreview');
    if (trimState.isPlaying) {
      video.pause();
      trimState.isPlaying = false;
      return;
    }
    video.currentTime = trimState.startTime;
    video.play();
    trimState.isPlaying = true;

    video.ontimeupdate = function() {
      document.getElementById('trimCurrentTime').textContent = formatTime(video.currentTime);
      if (video.currentTime >= trimState.endTime) {
        video.pause();
        trimState.isPlaying = false;
      }
    };
  };

  /* ═══ إعادة ═══ */
  window._trimCropReset = function() {
    trimState.startTime = 0;
    trimState.endTime = trimState.duration;
    trimState.videoEl.currentTime = 0;
    updateSelection();
    document.getElementById('trimCurrentTime').textContent = '00:00.0';
  };

  /* ═══ تطبيق القص ═══ */
  window._trimCropApply = async function() {
    var btn = document.getElementById('trimApplyBtn');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = '⏳ جاري الحفظ...';

    try {
      var item = trimState.item;
      var videoEl = trimState.videoEl;

      item.trim = {
        start: trimState.startTime,
        end: trimState.endTime,
        duration: trimState.endTime - trimState.startTime
      };

      // استخدم trim عند تشغيل الفيديو
      item._trimStart = trimState.startTime;
      item._trimEnd = trimState.endTime;

      // السحب في المونتاج يحترم الوقت
      if (item.speed !== undefined) {
        item.duration = (trimState.endTime - trimState.startTime) / (item.speed || 1);
      } else {
        item.duration = trimState.endTime - trimState.startTime;
      }

      if (typeof pushHistory === 'function') pushHistory();
      if (typeof showToast === 'function') showToast('✅ تم حفظ القص (' + item.duration.toFixed(1) + ' ثانية)');

      if (typeof renderImagesGrid === 'function') renderImagesGrid();
      if (typeof updateInfo === 'function') updateInfo();

      window._trimCropClose();
    } catch(err) {
      console.error(err);
      alert('فشل الحفظ');
    } finally {
      btn.disabled = false;
      btn.textContent = '✅ تطبيق';
    }
  };

  /* ═══ إغلاق ═══ */
  window._trimCropClose = function() {
    var video = document.getElementById('trimVideoPreview');
    if (video) {
      video.pause();
      video.src = '';
    }
    document.getElementById('trimOverlay').classList.remove('active');
    document.body.style.overflow = '';
    trimState.active = false;
    trimState.isPlaying = false;
  };

  /* ═══ زر القص التلقائي ═══ */
  function addTrimButtons() {
    // نتفحص كل بطاقة فيديو
    if (typeof images === 'undefined') return;

    var grid = document.getElementById('imagesGrid');
    if (!grid) return;

    var cards = grid.querySelectorAll('.image-item');
    cards.forEach(function(card, i) {
      var item = images[i];
      if (!item || item.type !== 'video') return;

      // تحقق إذا فيه زر قص
      if (card.querySelector('.trim-quick-btn')) return;

      var btn = document.createElement('button');
      btn.className = 'trim-quick-btn';
      btn.innerHTML = '✂️';
      btn.style.cssText = `
        position: absolute;
        bottom: 4px;
        left: 4px;
        width: 28px;
        height: 28px;
        background: #10b981;
        color: #fff;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        padding: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      `;

      btn.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        window._trimCropOpen(i);
      };

      card.appendChild(btn);
    });
  }

  /* ═══ راقب التغييرات ═══ */
  var observer = new MutationObserver(function() {
    setTimeout(addTrimButtons, 100);
  });

  setTimeout(function() {
    var grid = document.getElementById('imagesGrid');
    if (grid) {
      observer.observe(grid, { childList: true, subtree: true });
    }
    addTrimButtons();
  }, 1000);

  // أضف الأزرار كل مرة نضيف صورة
  var origRenderImagesGrid = window.renderImagesGrid;
  if (typeof window.renderImagesGrid === 'function') {
    var _orig = window.renderImagesGrid;
    window.renderImagesGrid = function() {
      _orig.apply(this, arguments);
      setTimeout(addTrimButtons, 50);
    };
  }

  /* ═══ دعم الإغلاق بـ Escape ═══ */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && trimState.active) {
      window._trimCropClose();
    }
  });

  /* ═══ بدء التشغيل ═══ */
  setTimeout(function() {
    waitForMontage();
    setupDrag();
  }, 500);

})();
