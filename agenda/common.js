/* Configuración y utilidades compartidas entre la agenda pública y el panel. */
const AGENDA = (() => {
  // Claves públicas de Supabase: pensadas para ir en el navegador.
  // La seguridad la dan las políticas RLS de la base (solo admins escriben).
  const SUPABASE_URL = 'https://ubkqmjotwyapxfnwiarj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_5_fGFHqCzJ-Lj44aLKI-cg_j1CzZ5Uj';

  // Todas las horas se muestran y capturan en hora de Monterrey (UTC-6, sin horario de verano).
  const TZ = 'America/Monterrey';
  const TZ_OFFSET = '-06:00';

  const CATEGORIES = {
    charla: 'Charla',
    taller: 'Taller',
    proyeccion: 'Proyección',
    exposicion: 'Exposición',
    convocatoria: 'Convocatoria',
    otro: 'Otro',
  };

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const safeUrl = (u) => {
    try {
      const url = new URL(u);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
      return null;
    }
  };

  const fmt = (opts) => new Intl.DateTimeFormat('es-MX', { timeZone: TZ, ...opts });
  const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  /** 'YYYY-MM-DD' del instante en hora de Monterrey. */
  const dayKey = (d) => keyFmt.format(new Date(d));
  /** 'HH:MM' (24 h) en hora de Monterrey. */
  const hhmm = (d) => timeFmt.format(new Date(d));
  /** Fecha a mediodía UTC de una clave de día: segura para aritmética de calendario. */
  const keyDate = (key) => new Date(key + 'T12:00:00Z');
  const addDays = (key, n) => {
    const d = keyDate(key);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const utcFmt = (opts) => new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', ...opts });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const startKey = (ev) => dayKey(ev.starts_at);
  const endKey = (ev) => dayKey(ev.ends_at || ev.starts_at);

  /** "18:00 – 20:00", "Todo el día", "18:00". */
  const timeLabel = (ev) => {
    if (ev.all_day) return 'Todo el día';
    const a = hhmm(ev.starts_at);
    if (!ev.ends_at) return a;
    const b = hhmm(ev.ends_at);
    return a === b ? a : `${a} – ${b}`;
  };

  /** "Jueves 19 de noviembre" o "19 – 21 de noviembre". */
  const dateLabel = (ev) => {
    const s = startKey(ev), e = endKey(ev);
    const long = utcFmt({ weekday: 'long', day: 'numeric', month: 'long' });
    if (s === e) return cap(long.format(keyDate(s)));
    const dm = utcFmt({ day: 'numeric', month: 'long' });
    if (s.slice(0, 7) === e.slice(0, 7)) return `${Number(s.slice(8))} – ${dm.format(keyDate(e))}`;
    return `${dm.format(keyDate(s))} – ${dm.format(keyDate(e))}`;
  };

  return { SUPABASE_URL, SUPABASE_KEY, TZ, TZ_OFFSET, CATEGORIES, esc, safeUrl, fmt, utcFmt, cap, dayKey, hhmm, keyDate, addDays, startKey, endKey, timeLabel, dateLabel };
})();
