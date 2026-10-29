// 暗号门：输对密码后在本地解密内容和照片。
// 开发时 content.js 已经提供了 CONTENT，直接进入。
(function () {
  const gate = document.getElementById('gate');

  function enter() {
    document.body.classList.remove('locked');
    window.startApp();
  }

  if (window.CONTENT) {
    gate.remove();
    enter();
    return;
  }

  const STORE = 'only_us_ticket';
  const form = document.getElementById('gateForm');
  const input = document.getElementById('gateInput');
  const msg = document.getElementById('gateMsg');
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', mp3: 'audio/mpeg', m4a: 'audio/mp4' };

  // 和 tools/build.py 的 normalize 保持一致：
  // “2025.12.02 03:45”“2025年12月2日 3:45”都当成 202512020345
  function normalize(s) {
    s = s.normalize('NFKC').trim();
    const groups = s.match(/\d+/g);
    if (groups && groups.join('') === s.replace(/[\s\-.:/年月日时分点號号]/g, '')) {
      return groups.map((g, i) => (i === 0 ? g : g.padStart(2, '0'))).join('');
    }
    return s;
  }

  let meta;
  async function fetchBin(name) {
    const r = await fetch(`v/${name}.bin`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }

  async function decrypt(key, bytes) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  }

  async function open(password) {
    if (!meta) meta = await (await fetch('v/meta.json')).json();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64(meta.salt), iterations: meta.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    // 密码不对时这里会抛出 OperationError
    const manifest = JSON.parse(new TextDecoder().decode(await decrypt(key, await fetchBin(meta.manifest))));

    const cache = {};
    window.loadAsset = (path) => {
      const id = manifest.files[path];
      if (!id) return Promise.reject(new Error(`missing ${path}`));
      if (!cache[path]) {
        const type = TYPES[path.split('.').pop().toLowerCase()] || '';
        cache[path] = fetchBin(id).then((b) => decrypt(key, b)).then((d) => URL.createObjectURL(new Blob([d], { type })));
      }
      return cache[path];
    };
    new Function(manifest.content)();
  }

  function pass(password) {
    try { localStorage.setItem(STORE, password); } catch (e) {}
    gate.classList.add('gone');
    setTimeout(() => gate.remove(), 1200);
    enter();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = normalize(input.value);
    if (!password) return;
    const button = form.querySelector('button');
    button.disabled = true;
    msg.textContent = '检票中……';
    try {
      await open(password);
      pass(password);
    } catch (err) {
      msg.textContent = err.name === 'OperationError' ? '车票好像不对，再想想？' : '网络好像不太好，再试一次？';
      button.disabled = false;
    }
  });

  // 之前在这台手机上检过票，就直接进站
  let saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  if (saved) {
    msg.textContent = '检票中……';
    open(saved).then(() => pass(saved)).catch(() => {
      msg.textContent = '';
      try { localStorage.removeItem(STORE); } catch (e) {}
    });
  }
})();
