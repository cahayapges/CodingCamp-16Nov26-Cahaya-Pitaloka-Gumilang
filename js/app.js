'use strict';

/* ═══════════════════════════════════════════════════════════════
   THEME TOGGLE  (light / dark)
═══════════════════════════════════════════════════════════════ */
(function initTheme() {
  const STORAGE_KEY = 'dashboard_theme';
  const html        = document.documentElement;
  const btn         = document.getElementById('theme-toggle');
  const icon        = document.getElementById('theme-icon');

  function apply(theme) {
    html.setAttribute('data-theme', theme);
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Restore saved preference, default to light
  apply(localStorage.getItem(STORAGE_KEY) || 'light');

  btn.addEventListener('click', () => {
    apply(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
})();


/* ═══════════════════════════════════════════════════════════════
   GREETING, CUSTOM NAME & CLOCK
═══════════════════════════════════════════════════════════════ */
(function initGreeting() {
  const NAME_KEY = 'dashboard_name';

  const greetingEl = document.getElementById('greeting-text');
  const dateEl     = document.getElementById('date-text');
  const timeEl     = document.getElementById('time-text');
  const editBtn    = document.getElementById('name-edit-btn');
  const formWrap   = document.getElementById('name-form-wrap');
  const nameInput  = document.getElementById('name-input');
  const nameSave   = document.getElementById('name-save');
  const nameCancel = document.getElementById('name-cancel');

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

  function getName() { return localStorage.getItem(NAME_KEY) || ''; }
  function saveName(n) { localStorage.setItem(NAME_KEY, n); }

  function getGreeting(h) {
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }
  function getEmoji(h) {
    if (h < 12) return '☀️';
    if (h < 17) return '🌤️';
    if (h < 21) return '🌆';
    return '🌙';
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function renderGreeting() {
    const h    = new Date().getHours();
    const name = getName();
    greetingEl.innerHTML = name
      ? `${getGreeting(h)}, <span class="name-highlight">${escapeHtml(name)}</span>! ${getEmoji(h)}`
      : `${getGreeting(h)} ${getEmoji(h)}`;
  }

  function tick() {
    const now  = new Date();
    const h    = now.getHours();
    const m    = now.getMinutes();
    const s    = now.getSeconds();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;

    renderGreeting();
    dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
    timeEl.textContent = `${pad(h12)}:${pad(m)}:${pad(s)} ${ampm}`;
  }

  /* ── Name editor ── */
  function openNameForm() {
    nameInput.value = getName();
    formWrap.classList.remove('hidden');
    editBtn.style.display = 'none';
    nameInput.focus();
  }
  function closeNameForm() {
    formWrap.classList.add('hidden');
    editBtn.style.display = '';
  }
  function saveNameHandler() {
    saveName(nameInput.value.trim());
    closeNameForm();
    renderGreeting();
  }

  editBtn.addEventListener('click', openNameForm);
  nameSave.addEventListener('click', saveNameHandler);
  nameCancel.addEventListener('click', closeNameForm);
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveNameHandler();
    if (e.key === 'Escape') closeNameForm();
  });

  tick();
  setInterval(tick, 1000);
})();


/* ═══════════════════════════════════════════════════════════════
   FOCUS TIMER
═══════════════════════════════════════════════════════════════ */
(function initTimer() {
  const TOTAL = 25 * 60;

  const display  = document.getElementById('timer-display');
  const btnStart = document.getElementById('timer-start');
  const btnStop  = document.getElementById('timer-stop');
  const btnReset = document.getElementById('timer-reset');

  let remaining = TOTAL;
  let interval  = null;
  let running   = false;

  function format(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function render() {
    display.textContent = format(remaining);
    display.classList.toggle('running',  running);
    display.classList.toggle('finished', !running && remaining === 0);
    btnStart.disabled = running;
    btnStop.disabled  = !running;
  }

  function start() {
    if (running || remaining === 0) return;
    running  = true;
    interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        remaining = 0;
        clearInterval(interval);
        running = false;
        notify();
      }
      render();
    }, 1000);
    render();
  }

  function stop() {
    clearInterval(interval);
    running = false;
    render();
  }

  function reset() {
    stop();
    remaining = TOTAL;
    render();
  }

  function notify() {
    display.classList.add('finished');
    if (Notification.permission === 'granted') {
      new Notification('Focus session complete! 🎉', { body: 'Time for a break.' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification('Focus session complete! 🎉', { body: 'Time for a break.' });
      });
    }
  }

  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', stop);
  btnReset.addEventListener('click', reset);
  render();
})();


/* ═══════════════════════════════════════════════════════════════
   TO-DO LIST  (with duplicate prevention)
═══════════════════════════════════════════════════════════════ */
(function initTodo() {
  const STORAGE_KEY = 'dashboard_todos';

  const form       = document.getElementById('todo-form');
  const input      = document.getElementById('todo-input');
  const list       = document.getElementById('todo-list');
  const errorEl    = document.getElementById('todo-error');
  const modal      = document.getElementById('edit-modal');
  const editInput  = document.getElementById('edit-input');
  const editError  = document.getElementById('edit-error');
  const editSave   = document.getElementById('edit-save');
  const editCancel = document.getElementById('edit-cancel');

  let todos      = load();
  let editingId  = null;
  let errorTimer = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); }

  /* Case-insensitive duplicate check; excludeId lets edit skip itself */
  function isDuplicate(text, excludeId = null) {
    const norm = text.trim().toLowerCase();
    return todos.some(t => t.text.toLowerCase() === norm && t.id !== excludeId);
  }

  /* Show error banner + shake the input, auto-hide after 2.8 s */
  function showError(bannerEl, shakeEl) {
    bannerEl.classList.remove('hidden');
    shakeEl.classList.remove('shake');
    void shakeEl.offsetWidth; // force reflow so animation restarts
    shakeEl.classList.add('shake');
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => bannerEl.classList.add('hidden'), 2800);
  }

  function render() {
    list.innerHTML = '';
    if (todos.length === 0) {
      list.innerHTML = '<li style="color:var(--text-muted);font-size:.9rem;padding:.4rem .2rem">No tasks yet — add one above! 🎉</li>';
      return;
    }
    todos.forEach(todo => {
      const li = document.createElement('li');
      li.className  = 'todo-item' + (todo.done ? ' done' : '');
      li.dataset.id = todo.id;

      const checkbox = document.createElement('input');
      checkbox.type    = 'checkbox';
      checkbox.checked = todo.done;
      checkbox.setAttribute('aria-label', 'Mark done');
      checkbox.addEventListener('change', () => toggleDone(todo.id));

      const span = document.createElement('span');
      span.className   = 'task-text';
      span.textContent = todo.text;

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const editBtn = document.createElement('button');
      editBtn.className   = 'btn btn-icon';
      editBtn.textContent = '✏️';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', () => openEdit(todo.id));

      const delBtn = document.createElement('button');
      delBtn.className   = 'btn btn-danger';
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', 'Delete task');
      delBtn.addEventListener('click', () => deleteTask(todo.id));

      actions.append(editBtn, delBtn);
      li.append(checkbox, span, actions);
      list.appendChild(li);
    });
  }

  function addTask(text) {
    todos.push({ id: Date.now(), text: text.trim(), done: false });
    save(); render();
  }
  function toggleDone(id) {
    const t = todos.find(t => t.id === id);
    if (t) { t.done = !t.done; save(); render(); }
  }
  function deleteTask(id) {
    todos = todos.filter(t => t.id !== id);
    save(); render();
  }

  function openEdit(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    editingId       = id;
    editInput.value = todo.text;
    editError.classList.add('hidden');
    modal.classList.remove('hidden');
    editInput.focus();
  }
  function closeEdit() {
    editingId = null;
    modal.classList.add('hidden');
  }
  function saveEdit() {
    const text = editInput.value.trim();
    if (!text) return;
    if (isDuplicate(text, editingId)) { showError(editError, editInput); return; }
    const todo = todos.find(t => t.id === editingId);
    if (todo) { todo.text = text; save(); render(); }
    closeEdit();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    if (isDuplicate(text)) { showError(errorEl, input); return; }
    addTask(text);
    input.value = '';
    errorEl.classList.add('hidden');
  });

  editSave.addEventListener('click', saveEdit);
  editCancel.addEventListener('click', closeEdit);
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  saveEdit();
    if (e.key === 'Escape') closeEdit();
  });
  modal.addEventListener('click', e => { if (e.target === modal) closeEdit(); });

  render();
})();


/* ═══════════════════════════════════════════════════════════════
   QUICK LINKS
═══════════════════════════════════════════════════════════════ */
(function initLinks() {
  const STORAGE_KEY = 'dashboard_links';

  const form      = document.getElementById('link-form');
  const nameInput = document.getElementById('link-name');
  const urlInput  = document.getElementById('link-url');
  const container = document.getElementById('links-list');

  let links = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(links)); }

  function faviconUrl(url) {
    try { return `${new URL(url).origin}/favicon.ico`; }
    catch { return ''; }
  }

  function render() {
    container.innerHTML = '';
    if (links.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem">No links yet — add one above! 🌐</p>';
      return;
    }
    links.forEach(link => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;align-items:center;gap:.25rem';

      const a = document.createElement('a');
      a.className = 'link-chip';
      a.href      = link.url;
      a.target    = '_blank';
      a.rel       = 'noopener noreferrer';

      const img = document.createElement('img');
      img.className = 'link-favicon';
      img.src       = faviconUrl(link.url);
      img.alt       = '';
      img.onerror   = () => { img.style.display = 'none'; };

      const name = document.createElement('span');
      name.textContent = link.name;

      a.append(img, name);

      const delBtn = document.createElement('button');
      delBtn.className   = 'link-delete';
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', `Remove ${link.name}`);
      delBtn.addEventListener('click', () => deleteLink(link.id));

      wrapper.append(a, delBtn);
      container.appendChild(wrapper);
    });
  }

  function addLink(name, url) {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    links.push({ id: Date.now(), name: name.trim(), url });
    save(); render();
  }
  function deleteLink(id) {
    links = links.filter(l => l.id !== id);
    save(); render();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const url  = urlInput.value.trim();
    if (name && url) {
      addLink(name, url);
      nameInput.value = '';
      urlInput.value  = '';
    }
  });

  render();
})();
