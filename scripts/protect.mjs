// Đóng gói bản build thành 1 trang HTML đã MÃ HOÁ bằng mật khẩu.
// Chạy sau `vite build`:  APP_PASSWORD=... node scripts/protect.mjs
//
// - Gộp CSS/JS của dist/ vào một tài liệu HTML duy nhất
// - Mã hoá bằng AES-256-GCM, khoá dẫn xuất từ mật khẩu bằng PBKDF2-SHA256 (310 000 vòng)
// - Ghi dist/index.html = trang nhập mật khẩu + bản mã; xoá JS/CSS gốc khỏi dist/
// Không có mật khẩu thì không đọc được mã nguồn app.
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { webcrypto as crypto } from 'node:crypto'

const password = process.env.APP_PASSWORD
if (!password || password.length < 6) {
  console.error('Thiếu APP_PASSWORD (tối thiểu 6 ký tự). Đặt trong GitHub: Settings → Secrets and variables → Actions → New repository secret.')
  process.exit(1)
}

const ITERATIONS = 310000
const dist = 'dist'
const assetsDir = join(dist, 'assets')
const files = readdirSync(assetsDir)
const cssFile = files.find((f) => f.endsWith('.css'))
const jsFile = files.find((f) => f.endsWith('.js'))
if (!cssFile || !jsFile) throw new Error('Không tìm thấy bundle trong dist/assets')

const css = readFileSync(join(assetsDir, cssFile), 'utf8')
const js = readFileSync(join(assetsDir, jsFile), 'utf8').replace(/<\/script/gi, '<\\/script')
const built = readFileSync(join(dist, 'index.html'), 'utf8')
const head = (built.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '')
  .replace(/<script[^>]*src="[^"]*assets\/[^"]+"[^>]*><\/script>/g, '')
  .replace(/<link[^>]*href="[^"]*assets\/[^"]+\.css"[^>]*>/g, '')

const app = `<!doctype html><html lang="vi"><head>${head}<style>${css}</style></head><body><div id="root"></div><script type="module">${js}</script></body></html>`

const enc = new TextEncoder()
const salt = crypto.getRandomValues(new Uint8Array(16))
const iv = crypto.getRandomValues(new Uint8Array(12))
const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(app)))
const b64 = (u8) => Buffer.from(u8).toString('base64')

const gate = `<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0b0c0e">
<meta name="robots" content="noindex, nofollow">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="./icon.svg">
<title>Gym Plan</title>
<style>
:root{--bg:#0b0c0e;--surface:#15171b;--border:#2a2e35;--text:#f3f5ef;--muted:#8b919b;--accent:#d4ff3a;--ink:#0d0f08;--danger:#ff6b5e;color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px max(20px,env(safe-area-inset-right)) 24px max(20px,env(safe-area-inset-left))}
form{width:100%;max-width:360px;display:flex;flex-direction:column;gap:14px}
.brand{display:flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.04em}
.brand svg{color:var(--accent)}
h1{margin:6px 0 0;font-size:2rem;letter-spacing:-.02em}
p{margin:0;color:var(--muted)}
input[type=password]{font:inherit;font-size:1.05rem;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:15px 16px;width:100%}
input[type=password]:focus{outline:2px solid var(--accent);outline-offset:-1px}
label.remember{display:flex;gap:10px;align-items:center;color:var(--muted);font-size:.9rem}
label.remember input{width:18px;height:18px;accent-color:var(--accent)}
button{font:inherit;font-weight:800;font-size:1.05rem;padding:16px;border:none;border-radius:999px;background:var(--accent);color:var(--ink);cursor:pointer}
button:disabled{opacity:.6}
.err{color:var(--danger);min-height:1.2em;font-size:.9rem}
</style>
</head>
<body>
<main>
<form id="gate" autocomplete="on">
  <span class="brand"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7Z" fill="currentColor"/></svg>GYM PLAN</span>
  <h1>Nhập mật khẩu</h1>
  <p>App riêng tư. Nhập mật khẩu để mở.</p>
  <input type="text" name="username" value="gym-plan" autocomplete="username" hidden>
  <input id="pw" type="password" name="password" autocomplete="current-password" placeholder="Mật khẩu" required autofocus>
  <label class="remember"><input id="remember" type="checkbox" checked> Ghi nhớ trên máy này</label>
  <button id="go" type="submit">Mở app</button>
  <span class="err" id="err" role="alert"></span>
</form>
</main>
<script>
(function () {
  var P = { salt: "${b64(salt)}", iv: "${b64(iv)}", it: ${ITERATIONS}, data: "${b64(cipher)}" };
  var KEY = "gymplan:unlock:" + P.salt;
  function u8(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function b64(a) { var s = ""; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  async function derive(pw) {
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: u8(P.salt), iterations: P.it, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }
  async function open(key) {
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: u8(P.iv) }, key, u8(P.data));
    var html = new TextDecoder().decode(plain);
    document.open(); document.write(html); document.close();
  }
  // Đã ghi nhớ: mở luôn
  try {
    var saved = localStorage.getItem(KEY);
    if (saved) {
      crypto.subtle.importKey("raw", u8(saved), "AES-GCM", false, ["decrypt"]).then(open).catch(function () { localStorage.removeItem(KEY); });
    }
  } catch (e) {}
  var form = document.getElementById("gate"), err = document.getElementById("err"), go = document.getElementById("go");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    err.textContent = ""; go.disabled = true; go.textContent = "Đang mở…";
    try {
      var key = await derive(document.getElementById("pw").value);
      var raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
      var k2 = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      await crypto.subtle.decrypt({ name: "AES-GCM", iv: u8(P.iv) }, k2, u8(P.data));
      try { if (document.getElementById("remember").checked) localStorage.setItem(KEY, b64(raw)); } catch (e2) {}
      await open(k2);
    } catch (x) {
      err.textContent = "Sai mật khẩu. Thử lại.";
      go.disabled = false; go.textContent = "Mở app";
    }
  });
})();
</script>
</body>
</html>
`

writeFileSync(join(dist, 'index.html'), gate)
rmSync(assetsDir, { recursive: true, force: true })
console.log(`Đã mã hoá app (${(app.length / 1024).toFixed(0)} KB) → dist/index.html`)
