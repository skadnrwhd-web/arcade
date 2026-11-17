/* UJ ARCADE 홈 화면 설치 도우미 (메인 페이지 전용)
 * ① 카카오톡·인스타 같은 앱 안 브라우저에서 열렸으면 → 기본 브라우저로 여는 배너
 * ② 설치 안내 창: 안드로이드는 설치 창을 바로 띄우고, 아이폰은 브라우저(사파리/크롬)에 맞춘 3단계 안내
 * ③ 게임 끝나고 랭킹 창을 닫은 직후 "아이콘으로 바로 열기" 권유 (7일에 한 번, 이미 설치했으면 안 뜸)
 * ④ PC 화면에서는 "폰으로 열기" QR 코드
 * 아이폰은 웹페이지가 대신 설치해 줄 수 없다. 그래서 '쉬운 안내'가 최선이다.
 */
(function () {
  if (window.ArcadeInstall) return;
  var URL_HOME = "https://skadnrwhd-web.github.io/arcade/";
  var ua = navigator.userAgent || "";
  var standalone = (navigator.standalone === true) || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var android = /Android/i.test(ua);
  var kakao = /KAKAOTALK/i.test(ua);
  var inApp = /KAKAOTALK|Instagram|FBAN|FBAV|Threads|Line\/|NAVER|DaumApps/i.test(ua);
  var chromeIOS = ios && /CriOS/i.test(ua);
  var desktop = !ios && !android && window.matchMedia && window.matchMedia("(pointer:fine)").matches && window.innerWidth >= 900;
  var deferred = null;

  function lang() { try { return localStorage.getItem("arc-lang") === "en" ? 1 : 0; } catch (e) { return 0; } }
  function T(ko, en) { return lang() ? en : ko; }
  function track(n, p) { if (window.track) { try { window.track(n, p || {}); } catch (e) { } } }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }
  function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { } return null; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener("appinstalled", function () { deferred = null; store("arc-inst-done", "1"); closeAll(); });
  function installed() { return standalone || store("arc-inst-done") === "1"; }

  /* ---- 공용: Shadow DOM 창 ---- */
  var CSS = ":host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI','Malgun Gothic',sans-serif}" +
    ".bd{position:fixed;inset:0;background:rgba(5,6,14,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:grid;place-items:center;padding:14px;color:#f3f4ff}" +
    ".card{width:min(380px,100%);max-height:100%;overflow:auto;background:#15182e;border:1px solid #272b4a;border-radius:20px;padding:18px;box-shadow:0 30px 80px rgba(0,0,0,.6)}" +
    "h2{margin:0 0 6px;font-size:19px;font-weight:900}p{margin:0 0 12px;color:#aab0d0;font-size:14px;line-height:1.55}" +
    "ol{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:8px;counter-reset:s}" +
    "li{counter-increment:s;display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:center;background:#0f1122;border:1px solid #272b4a;border-radius:12px;padding:10px 12px;font-size:15px;line-height:1.4}" +
    "li:before{content:counter(s);display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff4d8d,#8f6bff);font-weight:900;font-size:14px}" +
    "b{color:#37e0ff}.note{font-size:12.5px;color:#7078a0;margin:0 0 12px}" +
    "button{font:inherit;font-weight:800;border:0;border-radius:999px;padding:11px 18px;cursor:pointer;color:#fff;background:linear-gradient(135deg,#ff4d8d,#8f6bff);-webkit-tap-highlight-color:transparent}" +
    "button.line{background:transparent;border:1px solid #272b4a;color:#f3f4ff}.row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}" +
    ".arrow{position:fixed;font-size:44px;line-height:1;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6));animation:bob 1s ease-in-out infinite;pointer-events:none}" +
    "@keyframes bob{50%{transform:translateY(10px)}}.qr{display:grid;place-items:center;background:#fff;border-radius:14px;padding:12px;margin:0 0 12px}.qr svg,.qr img{width:200px;height:200px;display:block}" +
    ".toast{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 14px);max-width:420px;margin:0 auto;background:#15182e;border:1px solid #37e0ff;border-radius:16px;padding:12px 14px;color:#f3f4ff;box-shadow:0 14px 40px rgba(0,0,0,.55);display:grid;gap:10px}" +
    ".toast strong{font-size:15px}.bar{position:fixed;left:0;right:0;top:0;background:#1d2140;border-bottom:1px solid #37e0ff;color:#f3f4ff;padding:calc(env(safe-area-inset-top) + 8px) 12px 8px;display:flex;gap:8px;align-items:center;font-size:13.5px;line-height:1.35}" +
    ".bar span{flex:1}.bar button{padding:8px 12px;font-size:13px}.bar .x{background:transparent;border:0;font-size:20px;padding:4px 8px;color:#aab0d0}";
  var host = null, root = null, kind = "";
  function closeAll() { if (host) { host.remove(); host = null; root = null; kind = ""; } }
  function mount(k, zi) {
    closeAll(); kind = k;
    host = document.createElement("div"); host.id = "arcade-install-host"; host.style.cssText = "position:fixed;inset:0;z-index:" + (zi || 2147482000) + ";pointer-events:none";
    root = host.attachShadow({ mode: "open" }); var st = document.createElement("style"); st.textContent = CSS; root.appendChild(st);
    document.body.appendChild(host); return root;
  }
  function modal(k) {
    var r = mount(k); host.style.pointerEvents = "auto";
    var bd = el("div", "bd"), card = el("div", "card"); card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); bd.appendChild(card); r.appendChild(bd);
    bd.addEventListener("click", function (e) { if (e.target === bd) closeAll(); });
    host.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
    return card;
  }
  function closeBtn(card, label) { var row = el("div", "row"), b = el("button", "line", label || T("닫기", "Close")); b.type = "button"; b.addEventListener("click", closeAll); row.appendChild(b); card.appendChild(row); return row; }

  /* ---- ② 설치 안내 ---- */
  function guide(source) {
    track("install_guide_open", { source: source || "button", platform: ios ? "ios" : android ? "android" : "other" });
    if (deferred) {       /* 안드로이드 크롬: 설치 창을 바로 띄운다 (버튼을 누른 직후여야 함) */
      var d = deferred; deferred = null; closeAll();
      d.prompt(); d.userChoice.then(function (c) { track("install_choice", { outcome: c && c.outcome }); if (c && c.outcome === "accepted") store("arc-inst-done", "1"); });
      return;
    }
    if (inApp) return escapeBrowser("guide");
    var card = modal("guide");
    card.appendChild(el("h2", null, "📲 " + T("홈 화면에 앱처럼 추가", "Add to Home Screen")));
    var steps = el("ol");
    if (ios) {
      if (chromeIOS) {
        card.appendChild(el("p", null, T("크롬에서는 주소창 옆 공유 버튼을 써요.", "In Chrome, use the share button next to the address bar.")));
        [["오른쪽 위 ", "공유 ⬆", " 버튼 누르기", "Tap the ", "Share ⬆", " button (top right)"], ["목록에서 ", "홈 화면에 추가", " 고르기", "Choose ", "Add to Home Screen", ""], ["오른쪽 위 ", "추가", " 누르기", "Tap ", "Add", " (top right)"]].forEach(function (s) { addStep(steps, s); });
      } else {
        card.appendChild(el("p", null, T("사파리 화면 맨 아래에서 시작해요.", "Start from the bottom of the Safari screen.")));
        [["아래쪽 ", "⋯ 또는 공유 ⬆", " 버튼 누르기", "Tap ", "⋯ or Share ⬆", " at the bottom"], ["메뉴에서 ", "공유", " → ", "홈 화면에 추가", " 고르기", "Choose ", "Share", " → ", "Add to Home Screen", ""], ["‘웹 앱으로 열기’는 ", "켜 둔 채", " ‘추가’ 누르기", "Keep ", "Open as Web App", " on, then tap Add"]].forEach(function (s) { addStep(steps, s); });
      }
      card.appendChild(steps);
      card.appendChild(el("p", "note", T("추가하면 주소창 없는 앱 화면으로 열려요. 이 창은 지금 닫아도 돼요.", "It will open full screen like an app. You can close this now.")));
      var a = el("div", "arrow", "👇"); if (chromeIOS) { a.textContent = "👆"; a.style.cssText = "top:calc(env(safe-area-inset-top) + 56px);right:22px"; } else { a.style.cssText = "bottom:calc(env(safe-area-inset-bottom) + 6px);left:50%;margin-left:-22px"; }
      root.appendChild(a);
    } else {
      card.appendChild(el("p", null, T("브라우저 메뉴(⋮)에서 ‘홈 화면에 추가’ 또는 ‘앱 설치’를 골라 주세요.", "Open the browser menu (⋮) and choose “Add to Home screen” or “Install app”.")));
    }
    closeBtn(card);
  }
  function addStep(ol, s) {
    var li = el("li"), half = s.length / 2, ko = s.slice(0, half), en = s.slice(half), parts = lang() ? en : ko, span = el("span");
    for (var i = 0; i < parts.length; i++) { if (i % 2 === 1) span.appendChild(el("b", null, parts[i])); else span.appendChild(document.createTextNode(parts[i])); }
    li.appendChild(span); ol.appendChild(li);
  }

  /* ---- ① 앱 안 브라우저 탈출 ---- */
  function copy(text, done) {
    function fb() { try { var t = document.createElement("textarea"); t.value = text; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); done(true); } catch (e) { done(false); } }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fb); else fb();
  }
  function escapeBrowser(source) {
    track("inapp_escape_click", { source: source || "bar", kakao: kakao ? 1 : 0, os: ios ? "ios" : "android" });
    if (kakao) { location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(URL_HOME); return; }
    if (android) { location.href = "intent://" + URL_HOME.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;end"; return; }
    copy(URL_HOME, function (ok) {
      var card = modal("escape"); card.appendChild(el("h2", null, T("사파리에서 열어 주세요", "Open in Safari")));
      card.appendChild(el("p", null, ok ? T("주소를 복사했어요. 사파리를 열고 주소창에 붙여넣으면 돼요.", "Link copied. Open Safari and paste it in the address bar.") : T("이 주소를 사파리에서 열어 주세요: ", "Open this link in Safari: ") + URL_HOME));
      closeBtn(card);
    });
  }
  function bar() {
    if (!inApp || standalone || sstore("arc-inst-bar") === "x") return;
    var r = mount("bar", 2147481000), b = el("div", "bar");
    b.appendChild(el("span", null, T("앱 안 화면이에요. 기본 브라우저로 열면 홈 화면에 추가할 수 있어요.", "You're in an in-app browser. Open it in your browser to add it to your Home Screen.")));
    var go = el("button", null, T("브라우저로 열기", "Open in browser")); go.type = "button"; go.style.pointerEvents = "auto"; go.addEventListener("click", function () { escapeBrowser("bar"); });
    var x = el("button", "x", "✕"); x.type = "button"; x.setAttribute("aria-label", T("닫기", "Close")); x.style.pointerEvents = "auto"; x.addEventListener("click", function () { sstore("arc-inst-bar", "x"); closeAll(); });
    b.appendChild(go); b.appendChild(x); r.appendChild(b); track("inapp_bar_show", { kakao: kakao ? 1 : 0 });
  }

  /* ---- ③ 게임 끝난 뒤 권유 ---- */
  function nudge() {
    if (installed() || inApp || desktop || sstore("arc-inst-nudged") === "1") return;
    var until = parseInt(store("arc-inst-snooze"), 10) || 0; if (Date.now() < until) return;
    if (!ios && !deferred) return;                 /* 안드로이드인데 설치 창을 못 띄우면 권유하지 않는다 */
    sstore("arc-inst-nudged", "1");
    var r = mount("nudge", 2147481500), t = el("div", "toast"); t.appendChild(el("strong", null, "📲 " + T("다음엔 아이콘으로 바로 열어요", "Next time, open it from an icon")));
    var row = el("div", "row"), no = el("button", "line", T("다음에", "Later")), yes = el("button", null, T("추가하기", "Add"));
    no.type = yes.type = "button"; no.style.pointerEvents = yes.style.pointerEvents = "auto";
    no.addEventListener("click", function () { store("arc-inst-snooze", String(Date.now() + 7 * 864e5)); track("install_nudge_later"); closeAll(); });
    yes.addEventListener("click", function () { track("install_nudge_yes"); guide("nudge"); });
    row.appendChild(no); row.appendChild(yes); t.appendChild(row); r.appendChild(t); track("install_nudge_show", { os: ios ? "ios" : "android" });
  }
  window.addEventListener("message", function (e) {   /* 게임(랭킹 창)이 닫혔다는 알림. 같은 사이트에서 온 것만 받는다 */
    if (e.origin !== location.origin || !e.data || e.data.arcade !== "rank-closed") return;
    setTimeout(nudge, 600);
  });
  window.addEventListener("arcade-rank-closed", function () { setTimeout(nudge, 600); });

  /* ---- ④ PC: 폰으로 열기 QR ---- */
  function qr() {
    track("qr_open");
    function draw() {
      var card = modal("qr"); card.appendChild(el("h2", null, "📱 " + T("폰으로 열기", "Open on your phone")));
      card.appendChild(el("p", null, T("폰 카메라로 QR을 찍으면 바로 열려요. 열린 뒤 ‘홈 화면에 추가’ 하세요.", "Scan with your phone camera, then add it to your Home Screen.")));
      var box = el("div", "qr");
      try { var q = window.qrcode(0, "M"); q.addData(URL_HOME); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true }); } catch (e) { box.textContent = URL_HOME; }
      card.appendChild(box); closeBtn(card);
    }
    if (window.qrcode) return draw();
    var s = document.createElement("script"); s.src = "qr-lib.js"; s.onload = draw; s.onerror = function () { alert(URL_HOME); }; document.head.appendChild(s);
  }
  function qrButton() {
    if (!desktop || standalone) return;
    var row = document.getElementById("instRow"), host2 = row ? row.parentNode : null; if (!host2) return;
    var d = el("div", "inst"), b = el("button", "btn line sm", "📱 " + T("폰으로 열기 (QR)", "Open on phone (QR)")); b.type = "button"; b.id = "qrBtn"; b.addEventListener("click", qr); d.appendChild(b); host2.insertBefore(d, row.nextSibling);
  }

  window.ArcadeInstall = { guide: guide, nudge: nudge, qr: qr, escape: escapeBrowser, _state: function () { return { inApp: inApp, kakao: kakao, ios: ios, android: android, desktop: desktop, standalone: standalone, chromeIOS: chromeIOS }; } };
  function init() { bar(); qrButton(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
