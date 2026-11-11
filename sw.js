// האוטומט החדש שלי - service worker (PWA שלב א')
// שומר רק את מעטפת האפליקציה (HTML, JS, CSS, אייקונים, פונטים).
// אף פעם לא נשמר: בקשות ל-Supabase (נתונים אישיים, תשובות, כניסה) או כל בקשה שאינה GET.
const VERSION = 'v2-2026-11-11-gh'
const SHELL = `shell-${VERSION}`
const FONTS = `fonts-${VERSION}`
const PRECACHE = ['./', './index.html', './offline.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== FONTS).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return // נתונים אישיים - רק רשת
  // ניווט: רשת קודם (תמיד הגרסה העדכנית), נפילה לקאש ואז למסך "אין חיבור"
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(SHELL).then((c) => c.put('./index.html', cp)); return r })
      .catch(() => caches.match('./index.html').then((r) => r || caches.match('./offline.html'))))
    return
  }
  // פונטים של גוגל: קאש קודם
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r }))))
    return
  }
  // קבצים סטטיים מאותו דומיין (assets עם hash, אייקונים): קאש קודם
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok && /-[\w-]{8}\.(js|css)$|\.png$/.test(url.pathname)) { const cp = r.clone(); caches.open(SHELL).then((c) => c.put(req, cp)) } return r })))
  }
})
