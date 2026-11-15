/* Agenda pública: lista de próximos eventos, vista mensual y detalle. */
(() => {
  const A = AGENDA;
  const { esc } = A;
  const $ = (id) => document.getElementById(id);
  const main = $('main');
  const detail = $('detail');

  const state = {
    events: [],
    category: 'todos',
    view: 'list',
    showPast: false,
    month: A.dayKey(new Date()).slice(0, 7), // 'YYYY-MM'
    selectedDay: null,
  };
  const todayKey = () => A.dayKey(new Date());

  // ── Datos ──────────────────────────────────────────────
  async function load() {
    try {
      const res = await fetch(
        `${A.SUPABASE_URL}/rest/v1/agenda_events?select=*&published=eq.true&order=starts_at.asc`,
        { headers: { apikey: A.SUPABASE_KEY } }
      );
      if (!res.ok) throw new Error(res.status);
      state.events = await res.json();
      render();
      openFromHash();
    } catch {
      main.innerHTML = `<div class="state"><strong>No pudimos cargar la agenda</strong>Revisa tu conexión y vuelve a intentarlo.<button type="button" class="link-btn" id="retry">Reintentar</button></div>`;
      $('retry').onclick = () => { main.innerHTML = '<p class="state">Cargando la agenda…</p>'; load(); };
    }
  }

  const filtered = () =>
    state.category === 'todos' ? state.events : state.events.filter((e) => e.category === state.category);

  // ── Piezas ─────────────────────────────────────────────
  function relLabel(ev) {
    const t = todayKey(), s = A.startKey(ev), e = A.endKey(ev);
    if (s <= t && t <= e) return 'Hoy';
    if (s === A.addDays(t, 1)) return 'Mañana';
    return '';
  }

  function card(ev) {
    const s = A.startKey(ev);
    const d = A.keyDate(s);
    const dow = A.utcFmt({ weekday: 'short' }).format(d).replace('.', '');
    const rel = relLabel(ev);
    const multi = A.endKey(ev) !== s;
    const past = A.endKey(ev) < todayKey();
    const img = A.safeUrl(ev.image_url);
    return `
      <li class="event${past ? ' past' : ''}" style="--c: var(--c-${esc(ev.category)})">
        <div class="event-date">
          <span class="dow">${esc(dow)}</span>
          <span class="num">${Number(s.slice(8))}</span>
          ${rel ? `<span class="rel">${rel}</span>` : ''}
        </div>
        <div class="event-body">
          <span class="tag"><span class="dot"></span>${esc(A.CATEGORIES[ev.category] || 'Evento')}</span>
          <h3 class="event-title"><a href="#e-${esc(ev.id)}">${esc(ev.title)}</a></h3>
          <div class="meta">
            <span class="time">${esc(multi ? A.dateLabel(ev) : A.timeLabel(ev))}</span>
            ${ev.location ? `<span>${esc(ev.location)}</span>` : ''}
          </div>
        </div>
        ${img ? `<img class="event-thumb" src="${esc(img)}" alt="" loading="lazy">` : ''}
      </li>`;
  }

  function groupByMonth(events) {
    const groups = new Map();
    for (const ev of events) {
      const k = A.startKey(ev).slice(0, 7);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(ev);
    }
    return [...groups].map(([k, list]) => {
      const d = A.keyDate(k + '-01');
      const name = A.cap(A.utcFmt({ month: 'long' }).format(d));
      return `<h2 class="month-title">${name} <span>${k.slice(0, 4)}</span></h2><ul class="events">${list.map(card).join('')}</ul>`;
    }).join('');
  }

  // ── Vista: lista ───────────────────────────────────────
  function renderList() {
    const t = todayKey();
    const all = filtered();
    const upcoming = all.filter((e) => A.endKey(e) >= t);
    const past = all.filter((e) => A.endKey(e) < t).reverse();
    let html = '';
    if (upcoming.length) {
      html += groupByMonth(upcoming);
    } else {
      const what = state.category === 'todos' ? 'eventos' : `eventos de tipo «${esc(A.CATEGORIES[state.category])}»`;
      html += `<div class="state"><strong>Nada programado por ahora</strong>Todavía no hay ${what} próximos. Vuelve pronto: la agenda se actualiza seguido.</div>`;
    }
    if (past.length) {
      html += `<button type="button" class="link-btn" id="toggle-past">${state.showPast ? 'Ocultar eventos pasados' : `Ver eventos pasados (${past.length})`}</button>`;
      if (state.showPast) html += groupByMonth(past);
    }
    main.innerHTML = html;
    const tp = $('toggle-past');
    if (tp) tp.onclick = () => { state.showPast = !state.showPast; render(); };
  }

  // ── Vista: mes ─────────────────────────────────────────
  function eventsByDay(events) {
    const map = new Map();
    for (const ev of events) {
      let k = A.startKey(ev);
      const end = A.endKey(ev);
      for (let i = 0; k <= end && i < 62; i++, k = A.addDays(k, 1)) {
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(ev);
      }
    }
    return map;
  }

  function renderMonth() {
    const [y, m] = state.month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1, 12));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7; // semana inicia en lunes
    const byDay = eventsByDay(filtered());
    const t = todayKey();
    const title = A.cap(A.utcFmt({ month: 'long', year: 'numeric' }).format(first));

    let cells = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<div class="cal-dow">${d}</div>`).join('');
    cells += '<div class="cal-day blank"></div>'.repeat(lead);
    for (let d = 1; d <= daysInMonth; d++) {
      const k = `${state.month}-${String(d).padStart(2, '0')}`;
      const evs = byDay.get(k) || [];
      const label = A.utcFmt({ day: 'numeric', month: 'long' }).format(A.keyDate(k)) + (evs.length ? `, ${evs.length} evento${evs.length > 1 ? 's' : ''}` : '');
      cells += `
        <button type="button" class="cal-day${k === t ? ' is-today' : ''}" data-day="${k}" aria-pressed="${k === state.selectedDay}" aria-label="${esc(label)}">
          <span class="n">${d}</span>
          ${evs.slice(0, 2).map((e) => `<span class="cal-ev" style="--c: var(--c-${esc(e.category)})">${esc(e.title)}</span>`).join('')}
          ${evs.length > 2 ? `<span class="cal-more">+${evs.length - 2} más</span>` : ''}
          <span class="cal-dots">${evs.slice(0, 4).map((e) => `<i style="--c: var(--c-${esc(e.category)})"></i>`).join('')}</span>
        </button>`;
    }

    let below = '';
    if (state.selectedDay) {
      const evs = byDay.get(state.selectedDay) || [];
      const name = A.cap(A.utcFmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(A.keyDate(state.selectedDay)));
      below = `<h3 class="day-title">${name}</h3>` +
        (evs.length ? `<ul class="events">${evs.map(card).join('')}</ul>` : '<p class="state">Sin eventos este día.</p>');
    }

    main.innerHTML = `
      <div class="cal-head">
        <h2>${title}</h2>
        <button type="button" class="btn small" id="cal-today">Hoy</button>
        <button type="button" class="icon-btn" id="cal-prev" aria-label="Mes anterior">‹</button>
        <button type="button" class="icon-btn" id="cal-next" aria-label="Mes siguiente">›</button>
      </div>
      <div class="cal-grid">${cells}</div>
      <div id="day-events">${below}</div>`;

    const shift = (n) => {
      const d = new Date(Date.UTC(y, m - 1 + n, 1, 12));
      state.month = d.toISOString().slice(0, 7);
      state.selectedDay = null;
      render();
    };
    $('cal-prev').onclick = () => shift(-1);
    $('cal-next').onclick = () => shift(1);
    $('cal-today').onclick = () => { state.month = t.slice(0, 7); state.selectedDay = t; render(); };
    main.querySelectorAll('.cal-day[data-day]').forEach((b) => {
      b.onclick = () => { state.selectedDay = b.dataset.day; render(); };
    });
  }

  // ── Barra ──────────────────────────────────────────────
  function renderChips() {
    const used = new Set(state.events.map((e) => e.category));
    const cats = Object.keys(A.CATEGORIES).filter((c) => used.has(c));
    $('chips').innerHTML =
      `<button type="button" class="chip" data-cat="todos" aria-pressed="${state.category === 'todos'}">Todos</button>` +
      cats.map((c) => `<button type="button" class="chip" data-cat="${c}" style="--c: var(--c-${c})" aria-pressed="${state.category === c}"><span class="dot"></span>${esc(A.CATEGORIES[c])}</button>`).join('');
    $('chips').querySelectorAll('.chip').forEach((b) => {
      b.onclick = () => { state.category = b.dataset.cat; render(); };
    });
  }

  function render() {
    renderChips();
    $('view-list').setAttribute('aria-pressed', state.view === 'list');
    $('view-month').setAttribute('aria-pressed', state.view === 'month');
    state.view === 'list' ? renderList() : renderMonth();
  }

  // ── Detalle y calendario personal ──────────────────────
  const stamp = (d) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '');
  function calendarRange(ev) {
    if (ev.all_day) {
      return { allDay: true, start: A.startKey(ev).replace(/-/g, ''), end: A.addDays(A.endKey(ev), 1).replace(/-/g, '') };
    }
    const end = ev.ends_at ? new Date(ev.ends_at) : new Date(new Date(ev.starts_at).getTime() + 3600e3);
    return { allDay: false, start: stamp(ev.starts_at), end: stamp(end) };
  }
  function googleUrl(ev) {
    const r = calendarRange(ev);
    const p = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates: `${r.start}/${r.end}`, details: ev.description || '', location: ev.location || '' });
    return 'https://calendar.google.com/calendar/render?' + p;
  }
  function icsFile(ev) {
    const r = calendarRange(ev);
    const t = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Medios y Cultura Digital//Agenda//ES', 'BEGIN:VEVENT',
      `UID:${ev.id}@agenda-medios`, `DTSTAMP:${stamp(new Date())}`,
      r.allDay ? `DTSTART;VALUE=DATE:${r.start}` : `DTSTART:${r.start}`,
      r.allDay ? `DTEND;VALUE=DATE:${r.end}` : `DTEND:${r.end}`,
      `SUMMARY:${t(ev.title)}`, `DESCRIPTION:${t(ev.description)}`, `LOCATION:${t(ev.location)}`,
      'END:VEVENT', 'END:VCALENDAR',
    ];
    return new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  }

  function openDetail(ev) {
    const img = A.safeUrl(ev.image_url);
    const signup = A.safeUrl(ev.signup_url);
    const multi = A.endKey(ev) !== A.startKey(ev);
    detail.style.setProperty('--c', `var(--c-${ev.category})`);
    detail.innerHTML = `
      <div class="sheet">
        <div class="sheet-top">
          <span class="tag"><span class="dot"></span>${esc(A.CATEGORIES[ev.category] || 'Evento')}</span>
          <button type="button" class="close" id="detail-close" aria-label="Cerrar">✕</button>
        </div>
        <h2 id="detail-title">${esc(ev.title)}</h2>
        <dl class="facts">
          <dt>Cuándo</dt><dd>${esc(A.dateLabel(ev))}${multi && ev.all_day ? '' : ' · ' + esc(A.timeLabel(ev))}</dd>
          ${ev.location ? `<dt>Dónde</dt><dd>${esc(ev.location)}</dd>` : ''}
        </dl>
        ${ev.description ? `<p class="desc">${esc(ev.description)}</p>` : ''}
        <div class="actions">
          ${signup ? `<a class="btn primary" href="${esc(signup)}" target="_blank" rel="noopener">Inscribirme</a>` : ''}
          <a class="btn" href="${esc(googleUrl(ev))}" target="_blank" rel="noopener">Agregar a Google Calendar</a>
          <button type="button" class="btn" id="detail-ics">Apple / Outlook</button>
          <button type="button" class="btn" id="detail-copy">Copiar enlace</button>
        </div>
        ${img ? `<a href="${esc(img)}" target="_blank" rel="noopener"><img class="poster" src="${esc(img)}" alt="Afiche de ${esc(ev.title)}"></a>` : ''}
      </div>`;
    $('detail-close').onclick = () => detail.close();
    $('detail-ics').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(icsFile(ev));
      a.download = 'evento.ics';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('detail-copy').onclick = async (e) => {
      try {
        await navigator.clipboard.writeText(location.href);
        e.target.textContent = 'Enlace copiado';
      } catch {
        e.target.textContent = 'No se pudo copiar';
      }
    };
    if (!detail.open) detail.showModal();
  }

  function openFromHash() {
    const m = location.hash.match(/^#e-(.+)$/);
    const ev = m && state.events.find((e) => e.id === m[1]);
    if (ev) openDetail(ev);
    else if (detail.open) detail.close();
  }
  detail.addEventListener('close', () => {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });
  detail.addEventListener('click', (e) => { if (e.target === detail) detail.close(); });
  window.addEventListener('hashchange', openFromHash);

  // ── Arranque ───────────────────────────────────────────
  $('today').textContent = 'Hoy es ' + A.fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  $('view-list').onclick = () => { state.view = 'list'; render(); };
  $('view-month').onclick = () => { state.view = 'month'; render(); };
  load();
})();
