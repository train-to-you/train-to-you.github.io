// 由 vault.js 在开发模式下直接调用，或在输对密码、解密出 CONTENT 后调用
window.startApp = function () {
  const C = window.CONTENT;
  const $ = (sel) => document.querySelector(sel);

  // 加密版由 vault.js 提供 loadAsset（解密后返回 blob 地址）；开发版直接读文件
  const loadImg = window.loadAsset || ((path) => Promise.resolve(C.imgBase + path.split('/').map(encodeURIComponent).join('/')));
  const loadFile = window.loadAsset || ((path) => Promise.resolve(path));

  // 图片接近屏幕时才加载
  const lazy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      lazy.unobserve(e.target);
      loadImg(e.target.dataset.path).then((u) => { e.target.src = u; }).catch(() => {});
    });
  }, { rootMargin: '600px' });

  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function img(path, alt) {
    const node = new Image();
    node.alt = alt || '';
    node.decoding = 'async';
    node.dataset.path = path;
    lazy.observe(node);
    return node;
  }

  // ---------- 开场 ----------
  loadImg(C.hero.photo).then((u) => { $('#heroBg').style.backgroundImage = `url("${u}")`; });
  C.hero.lines.forEach((line, i) => {
    const span = el('span', null, line);
    span.style.animationDelay = `${0.4 + i * 0.7}s`;
    $('#heroTitle').appendChild(span);
  });
  $('#heroSub').textContent = C.hero.sub;

  // ---------- 时刻表 ----------
  const track = $('#track');
  C.stops.forEach((stop) => {
    const li = el('li', `stop stop--${stop.kind} reveal`);
    li.appendChild(el('span', 'stop-marker'));
    const head = el('div', 'stop-head');
    head.appendChild(el('span', 'stop-label', stop.label));
    head.appendChild(el('span', 'stop-date', stop.date));
    if (stop.time) head.appendChild(el('span', 'stop-time', stop.time));
    li.appendChild(head);
    li.appendChild(el('h3', 'stop-title', stop.title));
    if (stop.text) li.appendChild(el('p', 'stop-text', stop.text));

    if (stop.photos && stop.photos.length) {
      const items = stop.photos.map(([path, cap]) => ({ path, cap: cap || stop.title }));
      const strip = el('div', 'strip');
      stop.photos.forEach(([path, cap], i) => {
        const fig = el('figure', 'shot');
        const btn = el('button');
        btn.type = 'button';
        btn.appendChild(img(path, cap || stop.title));
        btn.addEventListener('click', () => openLightbox(items, i));
        fig.appendChild(btn);
        if (cap) fig.appendChild(el('figcaption', null, cap));
        strip.appendChild(fig);
      });
      li.appendChild(strip);
    }
    track.appendChild(li);
  });

  const next = el('li', 'stop stop--next reveal');
  next.innerHTML = `<span class="stop-marker"></span>
    <div class="stop-head"><span class="stop-label">下一站</span><span class="stop-date">2026.10.30</span></div>
    <h3 class="stop-title"><a href="#arrival">十九岁 ↓</a></h3>`;
  track.appendChild(next);

  // ---------- 你画的我们 ----------
  const drawingItems = C.drawings.map(([path, date, cap]) => ({ path, cap: [date, cap].filter(Boolean).join(' · ') }));
  C.drawings.forEach(([path, date, cap], i) => {
    const card = el('button', 'sketch reveal');
    card.type = 'button';
    card.style.setProperty('--tilt', `${[-1.2, 0.8, -0.5, 1.1, -0.9, 0.6][i % 6]}deg`);
    const box = el('span', 'sketch-img');
    box.style.display = 'block';
    box.appendChild(img(path, cap));
    card.appendChild(box);
    card.appendChild(el('span', 'sketch-cap', `<small>${date}</small>${cap || '&nbsp;'}`));
    card.addEventListener('click', () => openLightbox(drawingItems, i));
    $('#drawings').appendChild(card);
  });

  // ---------- 车窗外的日常 ----------
  C.daily.forEach((m) => {
    const card = el('button', 'moment reveal');
    card.type = 'button';
    card.appendChild(img(m.photos[0], m.text));
    card.appendChild(el('span', 'moment-info', `<small>${m.date}</small>${m.text}`));
    if (m.photos.length > 1) card.appendChild(el('span', 'moment-count', `${m.photos.length} 张`));
    const items = m.photos.map((path) => ({ path, cap: `${m.date} · ${m.text}` }));
    card.addEventListener('click', () => openLightbox(items, 0));
    $('#daily').appendChild(card);
  });

  // ---------- 时间 ----------
  const together = new Date(C.together).getTime();
  const birthday = new Date(C.birthday).getTime();
  const pad = (n) => String(n).padStart(2, '0');

  function split(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  }

  function counterHTML() {
    const t = split(Date.now() - together);
    return `<span><b>${t.d}</b><em>天</em></span><span><b>${pad(t.h)}</b><em>小时</em></span>` +
      `<span><b>${pad(t.m)}</b><em>分钟</em></span><span><b>${pad(t.s)}</b><em>秒</em></span>`;
  }

  function tick() {
    const days = split(Date.now() - together).d;
    $('#together').textContent = `从 2025.12.02 03:45 发车，已行驶 ${days} 天`;

    const left = birthday - Date.now();
    if (left > 0) {
      const t = split(left);
      $('#arrivalStatus').textContent = `距离到站还有 ${t.d} 天 ${pad(t.h)}:${pad(t.m)}:${pad(t.s)}`;
    } else {
      $('#arrivalStatus').textContent = '2026.10.30 · 列车已到站';
    }
    const counter = document.querySelector('.letter .counter');
    if (counter) counter.innerHTML = counterHTML();
  }
  tick();
  setInterval(tick, 1000);

  // ---------- 生日信 ----------
  const letter = $('#letter');
  letter.appendChild(el('p', 'to', C.letter.to));
  C.letter.lines.forEach((line) => {
    letter.appendChild(line === '{counter}' ? el('p', 'counter', counterHTML()) : el('p', null, line));
  });
  letter.appendChild(el('p', 'sign', `—— ${C.letter.sign}`));
  letter.appendChild(el('p', 'date', C.letter.date));

  $('#envelope').addEventListener('click', function () {
    this.classList.add('opening');
    setTimeout(() => {
      this.remove();
      letter.hidden = false;
      letter.querySelectorAll('p').forEach((p, i) => setTimeout(() => p.classList.add('in'), 200 + i * 650));
    }, 600);
  });

  $('#envelopeTo').textContent = `给十九岁的${C.name}`;
  $('#ending').textContent = C.ending;

  // ---------- 滚动浮现 ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((n) => io.observe(n));

  // ---------- 看大图 ----------
  const lb = $('#lightbox');
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('figcaption');
  const lbCount = lb.querySelector('.lb-count');
  let lbItems = [];
  let lbIndex = 0;

  function show(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    const item = lbItems[lbIndex];
    lbImg.removeAttribute('src');
    loadImg(item.path).then((u) => { if (lbItems[lbIndex] === item) lbImg.src = u; });
    lbCap.textContent = item.cap || '';
    lbCount.textContent = lbItems.length > 1 ? `${lbIndex + 1} / ${lbItems.length}` : '';
    lb.querySelector('.lb-prev').hidden = lb.querySelector('.lb-next').hidden = lbItems.length < 2;
  }

  function openLightbox(items, i) {
    lbItems = items;
    show(i);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.hidden = true;
    lbImg.removeAttribute('src');
    document.body.style.overflow = '';
  }

  lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
  lb.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); show(lbIndex - 1); });
  lb.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); show(lbIndex + 1); });
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') show(lbIndex - 1);
    if (e.key === 'ArrowRight') show(lbIndex + 1);
  });

  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50 && lbItems.length > 1) show(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // ---------- 音乐 ----------
  const audio = $('#audio');
  const music = $('#music');
  audio.addEventListener('loadedmetadata', () => { music.hidden = false; });
  if (C.music) loadFile(C.music).then((u) => { audio.src = u; }).catch(() => {});
  music.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      music.classList.add('playing');
      music.querySelector('.music-text').textContent = 'Time Machine';
    } else {
      audio.pause();
      music.classList.remove('playing');
      music.querySelector('.music-text').textContent = '播放我们的歌';
    }
  });
};
