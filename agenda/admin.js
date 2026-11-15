/* Panel de administración: iniciar sesión, crear, editar y borrar eventos. */
(() => {
  const A = AGENDA;
  const { esc } = A;
  const $ = (id) => document.getElementById(id);
  const db = supabase.createClient(A.SUPABASE_URL, A.SUPABASE_KEY);

  let events = [];
  let editing = null;      // evento en edición, o null si es nuevo
  let imageUrl = null;     // imagen actual del formulario
  let pendingDelete = null;

  // ── Utilidades ─────────────────────────────────────────
  const show = (view) => ['login-view', 'denied-view', 'panel-view'].forEach((v) => ($(v).hidden = v !== view));
  let toastTimer;
  function toast(text) {
    $('toast').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($('toast').hidden = true), 2600);
  }
  function setMsg(id, text) {
    $(id).textContent = text || '';
    $(id).hidden = !text;
  }

  // ── Sesión ─────────────────────────────────────────────
  async function route(session) {
    if (!session) return show('login-view');
    const { data, error } = await db.from('agenda_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (error || !data) {
      $('denied-email').textContent = session.user.email;
      return show('denied-view');
    }
    show('panel-view');
    loadEvents();
  }

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg('login-msg');
    $('login-submit').disabled = true;
    const { data, error } = await db.auth.signInWithPassword({
      email: $('login-email').value.trim(),
      password: $('login-password').value,
    });
    $('login-submit').disabled = false;
    if (error) return setMsg('login-msg', 'Correo o contraseña incorrectos. Revísalos e inténtalo de nuevo.');
    $('login-password').value = '';
    route(data.session);
  });
  const logout = async () => { await db.auth.signOut(); show('login-view'); };
  $('logout').onclick = logout;
  $('denied-logout').onclick = logout;

  // ── Lista ──────────────────────────────────────────────
  async function loadEvents() {
    const { data, error } = await db.from('agenda_events').select('*').order('starts_at', { ascending: true });
    if (error) {
      $('list').innerHTML = '<p class="state"><strong>No pudimos cargar los eventos</strong>Recarga la página para intentarlo de nuevo.</p>';
      return;
    }
    events = data;
    renderList();
  }

  function item(ev) {
    const confirming = pendingDelete === ev.id;
    const short = A.utcFmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(A.keyDate(A.startKey(ev)));
    return `
      <li class="admin-item" style="--c: var(--c-${esc(ev.category)})">
        <div class="when">${esc(short)}<br>${esc(A.timeLabel(ev))}</div>
        <div>
          <div class="t">${esc(ev.title)}${ev.published ? '' : '<span class="badge">Oculto</span>'}</div>
          <div class="sub">${esc(A.CATEGORIES[ev.category])}${ev.location ? ' · ' + esc(ev.location) : ''}</div>
        </div>
        <div class="ops">
          ${confirming
            ? `<span class="sub" style="align-self:center">¿Borrar definitivamente?</span>
               <button type="button" class="btn small danger" data-op="confirm" data-id="${ev.id}">Sí, borrar</button>
               <button type="button" class="btn small" data-op="keep" data-id="${ev.id}">Conservar</button>`
            : `<button type="button" class="btn small" data-op="edit" data-id="${ev.id}">Editar</button>
               <button type="button" class="btn small" data-op="copy" data-id="${ev.id}">Duplicar</button>
               <button type="button" class="btn small danger" data-op="delete" data-id="${ev.id}">Borrar</button>`}
        </div>
      </li>`;
  }

  function renderList() {
    const t = A.dayKey(new Date());
    const upcoming = events.filter((e) => A.endKey(e) >= t);
    const past = events.filter((e) => A.endKey(e) < t).reverse();
    let html = '';
    if (!events.length) {
      html = '<div class="state"><strong>Aún no hay eventos</strong>Crea el primero con «+ Nuevo evento». Aparecerá en la agenda al instante.</div>';
    } else {
      html += `<h2 class="section-title">Próximos (${upcoming.length})</h2>`;
      html += upcoming.length ? `<ul class="admin-list">${upcoming.map(item).join('')}</ul>` : '<p class="sub" style="color:var(--muted)">No hay eventos próximos.</p>';
      if (past.length) html += `<h2 class="section-title">Pasados (${past.length})</h2><ul class="admin-list">${past.map(item).join('')}</ul>`;
    }
    $('list').innerHTML = html;
  }

  $('list').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-op]');
    if (!b) return;
    const ev = events.find((x) => x.id === b.dataset.id);
    if (!ev) return;
    const op = b.dataset.op;
    if (op === 'edit') openEditor(ev);
    if (op === 'copy') openEditor({ ...ev, id: null, title: ev.title + ' (copia)' }, true);
    if (op === 'delete') { pendingDelete = ev.id; renderList(); }
    if (op === 'keep') { pendingDelete = null; renderList(); }
    if (op === 'confirm') {
      b.disabled = true;
      const { error } = await db.from('agenda_events').delete().eq('id', ev.id);
      pendingDelete = null;
      if (error) { toast('No se pudo borrar. Inténtalo de nuevo.'); return renderList(); }
      removeImage(ev.image_url);
      toast('Evento borrado');
      loadEvents();
    }
  });

  // ── Formulario ─────────────────────────────────────────
  $('f-category').innerHTML = Object.entries(A.CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');

  function syncAllDay() {
    const all = $('f-allday').checked;
    $('w-start').hidden = all;
    $('w-end').hidden = all;
  }
  $('f-allday').onchange = syncAllDay;

  function setPreview(url) {
    imageUrl = url || null;
    $('f-preview').hidden = !imageUrl;
    $('f-remove-image').hidden = !imageUrl;
    if (imageUrl) $('f-preview').src = imageUrl;
  }
  $('f-remove-image').onclick = () => { setPreview(null); $('f-image').value = ''; };
  $('f-image').onchange = () => {
    const f = $('f-image').files[0];
    if (f) { $('f-preview').src = URL.createObjectURL(f); $('f-preview').hidden = false; $('f-remove-image').hidden = false; }
  };

  function openEditor(ev, isCopy) {
    editing = ev && ev.id ? ev : null;
    $('event-form').reset();
    setMsg('form-msg');
    $('editor-title').textContent = editing ? 'Editar evento' : 'Nuevo evento';
    $('save').textContent = editing ? 'Guardar cambios' : 'Publicar evento';
    if (ev) {
      const s = A.startKey(ev), e = A.endKey(ev);
      $('f-title').value = ev.title;
      $('f-category').value = ev.category;
      $('f-location').value = ev.location || '';
      $('f-date').value = s;
      $('f-enddate').value = e !== s ? e : '';
      $('f-allday').checked = ev.all_day;
      $('f-start').value = ev.all_day ? '' : A.hhmm(ev.starts_at);
      $('f-end').value = ev.all_day || !ev.ends_at ? '' : A.hhmm(ev.ends_at);
      $('f-description').value = ev.description || '';
      $('f-signup').value = ev.signup_url || '';
      $('f-published').checked = ev.published;
      setPreview(isCopy ? null : ev.image_url);
    } else {
      $('f-date').value = A.dayKey(new Date());
      $('f-start').value = '12:00';
      setPreview(null);
    }
    syncAllDay();
    $('editor').showModal();
    $('f-title').focus();
  }
  $('new-event').onclick = () => openEditor(null);
  $('editor-close').onclick = $('cancel').onclick = () => $('editor').close();

  /** Reduce la imagen a 1600 px como máximo y la convierte a JPEG para que cargue rápido. */
  async function shrink(file) {
    if (file.type === 'image/gif') return { blob: file, ext: 'gif' };
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
      if (blob) return { blob, ext: 'jpg' };
    } catch { /* se sube el original */ }
    return { blob: file, ext: (file.name.split('.').pop() || 'jpg').toLowerCase() };
  }

  async function uploadImage(file) {
    const { blob, ext } = await shrink(file);
    if (blob.size > 5 * 1024 * 1024) throw new Error('La imagen pesa más de 5 MB. Usa una más ligera.');
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from('agenda').upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000' });
    if (error) throw new Error('No se pudo subir la imagen. Inténtalo de nuevo.');
    return db.storage.from('agenda').getPublicUrl(path).data.publicUrl;
  }

  function removeImage(url) {
    const marker = '/storage/v1/object/public/agenda/';
    if (!url || !url.includes(marker)) return;
    db.storage.from('agenda').remove([url.split(marker)[1]]);
  }

  $('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg('form-msg');
    const title = $('f-title').value.trim();
    const date = $('f-date').value;
    const allDay = $('f-allday').checked;
    const start = $('f-start').value;
    const end = $('f-end').value;
    const endDate = $('f-enddate').value;
    const signupRaw = $('f-signup').value.trim();

    if (!title) return setMsg('form-msg', 'Ponle un título al evento.');
    if (!date) return setMsg('form-msg', 'Elige la fecha del evento.');
    if (!allDay && !start) return setMsg('form-msg', 'Indica a qué hora empieza, o marca «Dura todo el día».');
    if (endDate && endDate < date) return setMsg('form-msg', 'El último día no puede ser anterior a la fecha de inicio.');
    const signup = signupRaw ? A.safeUrl(signupRaw) : null;
    if (signupRaw && !signup) return setMsg('form-msg', 'El enlace de inscripción debe empezar con https://');

    const iso = (d, t) => new Date(`${d}T${t}:00${A.TZ_OFFSET}`).toISOString();
    const starts_at = iso(date, allDay ? '00:00' : start);
    let ends_at = null;
    if (allDay) ends_at = iso(endDate || date, '23:59');
    else if (end || endDate) ends_at = iso(endDate || date, end || start);
    if (ends_at && ends_at < starts_at) return setMsg('form-msg', 'La hora de término es anterior a la de inicio.');

    $('save').disabled = true;
    try {
      const file = $('f-image').files[0];
      const previous = editing ? editing.image_url : null;
      const image_url = file ? await uploadImage(file) : imageUrl;
      const row = {
        title, starts_at, ends_at, all_day: allDay,
        category: $('f-category').value,
        location: $('f-location').value.trim(),
        description: $('f-description').value.trim(),
        signup_url: signup,
        image_url,
        published: $('f-published').checked,
      };
      const q = editing
        ? db.from('agenda_events').update({ ...row, updated_at: new Date().toISOString() }).eq('id', editing.id)
        : db.from('agenda_events').insert(row);
      const { error } = await q;
      if (error) throw new Error('No se pudo guardar el evento. Revisa tu conexión e inténtalo de nuevo.');
      if (previous && previous !== image_url) removeImage(previous);
      $('editor').close();
      toast(editing ? 'Cambios guardados' : (row.published ? 'Evento publicado' : 'Evento guardado como oculto'));
      loadEvents();
    } catch (err) {
      setMsg('form-msg', err.message);
    } finally {
      $('save').disabled = false;
    }
  });

  // ── Arranque ───────────────────────────────────────────
  db.auth.getSession().then(({ data }) => route(data.session));
})();
