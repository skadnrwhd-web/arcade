/* UJ ARCADE 랭킹 (공용 파일)
 * 게임이 끝났을 때 ArcadeRank.show({id:"게임ID", score:점수}) 를 부르면
 *   ① 내 점수와 예상 순위  ② 이름 입력 후 등록  ③ TOP 10 목록  을 담은 창이 뜬다.
 * 저장소: 게시판과 같은 Supabase 'comments' 표를 쓴다. (별도 서버 설정 없음)
 *   thread   = "score: 게임ID"
 *   nickname = 이름
 *   body     = 점수를 10자리 숫자로 채운 글자(예: 0000012345). 글자순 정렬 = 점수순 정렬이라 서버가 바로 TOP을 골라 준다.
 *              (시간처럼 낮을수록 좋은 게임은 9999999999 - 점수 로 저장한다)
 * 주의: 정적 사이트라 점수를 100% 막을 수는 없다. 게임마다 '현실적인 범위(bounds)'를 두어 말도 안 되는 값은 걸러낸다.
 */
(function () {
  if (window.ArcadeRank) return;

  var BACKEND = { url: "https://cerfluoyzcdzhwmxysym.supabase.co", key: "sb_publishable_WoR4KB7m7z4dWR8Y4pkCmw_-galDvZG" };
  var MAXV = 9999999999, TOP = 10, FETCH = 100, COOLDOWN = 15000, NAME_MAX = 12;

  /* 게임별 설정. better: high=높을수록 좋음 / low=낮을수록 좋음, bounds=[최소,최대] 현실적인 값의 범위 */
  var GAMES = {
    "suika-game":    { title: ["수박게임", "Suika Game"], better: "high", unit: ["점", " pts"], label: ["점수", "Score"], bounds: [1, 100000] },
    "subway-rush":   { title: ["출근길 지하철 피하기", "Subway Rush"], better: "high", unit: ["점", " pts"], label: ["점수", "Score"], bounds: [1, 300000] },
    "dragon-flight": { title: ["네온 드래곤 플라이트", "Neon Dragon Flight"], better: "high", unit: ["점", " pts"], label: ["점수", "Score"], bounds: [1, 2000000] },
    "slither-neon":  { title: ["네온 지렁이 키우기", "Neon Worm"], better: "high", unit: ["", ""], label: ["길이", "Length"], bounds: [1, 420] },
    "gem-match":     { title: ["Gem Match", "Gem Match"], better: "high", fmt: "level", label: ["기록", "Record"], bounds: [100001, 9999999] },
    "dodge":         { title: ["네온 닷지", "Neon Dodge"], better: "high", unit: ["점", " pts"], label: ["점수", "Score"], bounds: [1, 100000] },
    "pairs":         { title: ["짝 맞추기", "Pair Match"], better: "low", unit: ["번", " moves"], label: ["횟수", "Moves"], bounds: [8, 300] },
    "order":         { title: ["순서 터치", "Tap in Order"], better: "low", fmt: "tenths", unit: ["초", "s"], label: ["시간", "Time"], bounds: [30, 6000] },
    "wobble-tower":  { title: ["워블 타워", "Wobble Tower"], better: "high", unit: ["개", " blocks"], label: ["쌓은 블록", "Blocks"], bounds: [1, 150] },
    "water-ring":    { title: ["물 고리 걸기", "Water Ring Toss"], better: "low", fmt: "tenths", unit: ["초", "s"], label: ["시간", "Time"], bounds: [20, 6000] }
  };
  /* 하노이탑: 클래식 모드만. 점수 = 이동 횟수*10000 + 걸린 초(최대 9999). 횟수가 적을수록, 같으면 빨리 푼 사람이 위 */
  [[3, 3, 7], [3, 4, 15], [3, 5, 31], [3, 6, 63], [3, 7, 127]].forEach(function (d) { addHanoi("hanoi3d-" + d[1], "하노이탑 3D", "Tower of Hanoi 3D", d[1], d[2]); });
  [[4, 4, 9], [4, 5, 13], [4, 6, 17], [4, 7, 25], [4, 8, 33]].forEach(function (d) { addHanoi("hanoi4-" + d[1], "4기둥 하노이탑", "4-Peg Hanoi", d[1], d[2]); });
  function addHanoi(id, ko, en, n, optimal) {
    GAMES[id] = { title: [ko + " · " + n + "개", en + " · " + n + " disks"], better: "low", fmt: "movesec", label: ["기록", "Record"], bounds: [optimal * 10000, 800 * 10000 + 9999] };
  }

  /* 이름에 쓰면 안 되는 말(전부는 못 막는다). 띄어쓰기·기호를 빼고 비교한다 */
  var BAD = ["시발", "씨발", "ㅅㅂ", "ㅆㅂ", "병신", "ㅂㅅ", "개새끼", "새끼", "좆", "존나", "지랄", "미친놈", "미친년", "섹스", "야동", "fuck", "shit", "bitch", "nigger", "nigga", "asshole", "porn"];

  var TXT = {
    rank: ["랭킹", "Ranking"], mine: ["내 ", "Your "], est: ["예상 순위", "Estimated rank"], th: ["위", ""],
    namePh: ["이름 (최대 12자)", "Name (up to 12)"], submit: ["등록", "Submit"], close: ["닫기", "Close"],
    loading: ["불러오는 중…", "Loading…"], fail: ["랭킹을 불러오지 못했어요.", "Could not load the ranking."], retry: ["다시 시도", "Retry"],
    empty: ["아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!", "No records yet. Be the first!"],
    done: ["등록했어요!", "Submitted!"], out: ["아쉽지만 100위 안에는 들지 못했어요.", "Not in the top 100 this time."],
    needName: ["이름을 적어 주세요.", "Please enter a name."], badName: ["사용할 수 없는 이름이에요.", "That name is not allowed."],
    wait: ["잠시 뒤에 다시 등록할 수 있어요.", "Please wait a moment before submitting again."],
    err: ["등록하지 못했어요. 잠시 뒤 다시 해 주세요.", "Could not submit. Please try again."],
    many: ["지금 글이 너무 많아요. 1분 뒤에 다시 해 주세요.", "Too many posts right now. Try again in a minute."],
    note: ["실명·연락처는 적지 마세요. 등록한 기록은 누구나 볼 수 있어요.", "Don't use your real name or contact info. Records are public."],
    me: ["나", "You"], more: ["…", "…"]
  };
  function lang() { try { return localStorage.getItem("arc-lang") === "en" ? 1 : 0; } catch (e) { return 0; } }
  function T(k) { var v = TXT[k]; return v ? v[lang()] : k; }
  function tx(a) { return Array.isArray(a) ? a[lang()] : (a == null ? "" : a); }

  /* ---- 점수 ↔ 정렬용 글자 ---- */
  function pad(n) { var s = String(n); while (s.length < 10) s = "0" + s; return s; }
  function keyOf(cfg, m) { return pad(cfg.better === "low" ? MAXV - m : m); }
  function metricOf(cfg, key) { var k = parseInt(key, 10); return cfg.better === "low" ? MAXV - k : k; }
  function keyRange(cfg) { var lo = cfg.bounds[0], hi = cfg.bounds[1]; return cfg.better === "low" ? [pad(MAXV - hi), pad(MAXV - lo)] : [pad(lo), pad(hi)]; }
  function inBounds(cfg, m) { return typeof m === "number" && isFinite(m) && Math.floor(m) === m && m >= cfg.bounds[0] && m <= cfg.bounds[1]; }
  function fmt(cfg, m) {
    if (cfg.fmt === "level") return (lang() ? "Level " : "레벨 ") + Math.floor(m / 100000) + " · " + (m % 100000).toLocaleString() + (lang() ? " pts" : "점");
    if (cfg.fmt === "movesec") return Math.floor(m / 10000) + (lang() ? " moves · " : "번 · ") + (m % 10000) + (lang() ? "s" : "초");
    if (cfg.fmt === "tenths") return (m / 10).toFixed(1) + tx(cfg.unit);
    return m.toLocaleString() + tx(cfg.unit);
  }

  /* ---- 서버(Supabase) ---- */
  var sb = null, sbWait = [], sbState = 0;
  function withSb(cb) {
    if (sbState === 2) return cb(sb); if (sbState === 3) return cb(null);
    sbWait.push(cb); if (sbState === 1) return; sbState = 1;
    function flush(ok) { sbState = ok ? 2 : 3; var w = sbWait; sbWait = []; w.forEach(function (f) { f(ok ? sb : null); }); }
    function ready() { try { sb = window.supabase.createClient(BACKEND.url, BACKEND.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); flush(true); } catch (e) { flush(false); } }
    if (window.supabase && window.supabase.createClient) return ready();
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js";
    s.integrity = "sha384-uteMfOloLDGt042uDz+xHGF3ym63/WQ6rFq7murQRG8Ih7QrXGEGNtWd8688sb4O"; s.crossOrigin = "anonymous";
    s.onload = ready; s.onerror = function () { flush(false); }; document.head.appendChild(s);
  }
  function thread(id) { return "score: " + id; }
  function fetchBoard(id, cfg, cb) {
    withSb(function (c) {
      if (!c) return cb({ error: true });
      var r = keyRange(cfg);
      c.from("comments").select("nickname,body,created_at").eq("thread", thread(id)).gte("body", r[0]).lte("body", r[1])
        .order("body", { ascending: false }).limit(FETCH).then(function (res) {
          if (res.error) return cb({ error: true });
          var rows = res.data || [], seen = {}, out = [];
          rows.forEach(function (x) {   /* 한 사람(이름)당 최고 기록 하나만 */
            if (!/^\d{10}$/.test(String(x.body))) return;
            var n = String(x.nickname == null ? "" : x.nickname).trim(); if (!n || seen[n]) return; seen[n] = 1;
            out.push({ name: n, key: x.body, m: metricOf(cfg, x.body) });
          });
          cb({ rows: out, raw: rows.length });
        });
    });
  }
  /* 내 점수의 순위: 목록 안이면 정확히, 목록 밖(100위 밖)이면 null */
  function rankOf(board, key) {
    var c = 0, i; for (i = 0; i < board.rows.length; i++) if (board.rows[i].key > key) c++;
    if (board.raw >= FETCH && board.rows.length && key < board.rows[board.rows.length - 1].key) return null;
    return c + 1;
  }
  function badName(n) { var t = n.toLowerCase().replace(/[\s._\-~!@#$%^&*()+=,/\\|'"`?<>:;{}\[\]]/g, ""); for (var i = 0; i < BAD.length; i++) if (t.indexOf(BAD[i]) >= 0) return true; return false; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { } return null; }

  /* ---- 화면 (Shadow DOM: 게임 CSS와 섞이지 않게) ---- */
  var CSS = ":host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI','Malgun Gothic',sans-serif}" +
    ".bd{position:fixed;inset:0;background:rgba(5,6,14,.84);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:grid;place-items:center;padding:14px;color:#f3f4ff}" +
    ".card{width:min(380px,100%);max-height:100%;overflow:auto;background:#15182e;border:1px solid #272b4a;border-radius:20px;padding:18px;box-shadow:0 30px 80px rgba(0,0,0,.6)}" +
    "h2{margin:0 0 12px;font-size:19px;font-weight:900}" +
    ".mine{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#0f1122;border:1px solid #272b4a;border-radius:14px;padding:10px 14px;margin:0 0 12px}" +
    ".mine small{display:block;color:#7078a0;font-size:12px}.mine b{font-size:22px;color:#37e0ff;font-weight:900}.mine .r{text-align:right}.mine .r b{color:#ffd23f}" +
    "form{display:flex;gap:8px;margin:0 0 8px}input{flex:1;min-width:0;background:#090a14;border:1px solid #272b4a;border-radius:12px;padding:11px 13px;color:#f3f4ff;font-size:16px}" +
    "input:focus{outline:none;border-color:#37e0ff}button{font:inherit;font-weight:800;border:0;border-radius:999px;padding:11px 18px;cursor:pointer;color:#fff;background:linear-gradient(135deg,#ff4d8d,#8f6bff);-webkit-tap-highlight-color:transparent}" +
    "button:disabled{opacity:.55;cursor:default}button.line{background:transparent;border:1px solid #272b4a;color:#f3f4ff}" +
    ".msg{min-height:18px;margin:0 0 8px;font-size:13.5px;color:#ff4d8d}.msg.ok{color:#7dff9b}" +
    "ol{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:6px}" +
    "li{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;background:#0f1122;border:1px solid #272b4a;border-radius:12px;padding:9px 12px;font-size:15px}" +
    "li.me{border-color:#37e0ff;background:rgba(55,224,255,.1)}li .n{color:#aab0d0;font-weight:900;text-align:center}li .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}li .sc{font-weight:900;color:#f3f4ff}" +
    ".st{margin:0 0 12px;padding:14px;border:1px dashed #272b4a;border-radius:12px;color:#aab0d0;font-size:14px;text-align:center}.note{margin:0 0 12px;color:#7078a0;font-size:12px;line-height:1.5}" +
    ".row{display:flex;gap:8px;justify-content:flex-end}";

  var host = null, root = null, timer = null, current = null;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function close() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (host) { host.remove(); host = null; root = null; }
    var cb = current && current.onClose; current = null; if (cb) { try { cb(); } catch (e) { } }
  }
  function mount() {
    if (host) { host.remove(); host = null; }
    host = document.createElement("div"); host.id = "arcade-rank-host"; host.style.cssText = "position:fixed;inset:0;z-index:2147483000";
    root = host.attachShadow({ mode: "open" });
    var st = document.createElement("style"); st.textContent = CSS; root.appendChild(st);
    /* 창 안의 터치·키 입력이 뒤쪽 게임(재시작 등)에 전달되지 않게 막는다 */
    ["click", "mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "touchend", "keydown", "keyup", "keypress", "wheel"].forEach(function (ev) {
      host.addEventListener(ev, function (e) { if (ev === "keydown" && e.key === "Escape") { close(); } e.stopPropagation(); });
    });
    document.body.appendChild(host);
    var bd = el("div", "bd"), card = el("div", "card"); card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true");
    bd.appendChild(card); root.appendChild(bd);
    bd.addEventListener("click", function (e) { if (e.target === bd) close(); });
    return card;
  }

  function render(o) {
    var id = o.id, cfg = GAMES[id], card = mount(), submitted = false, myKey = null, myName = "", token = {};
    var score = (o.score == null) ? null : Math.round(Number(o.score));
    var valid = score != null && inBounds(cfg, score); if (valid) myKey = keyOf(cfg, score);
    card.appendChild(el("h2", null, "🏆 " + tx(cfg.title) + " " + T("rank")));

    var mine = null, rankB = null;
    if (valid) {
      mine = el("div", "mine"); var l = el("div"); l.appendChild(el("small", null, T("mine") + tx(cfg.label))); l.appendChild(el("b", null, fmt(cfg, score)));
      var r = el("div", "r"); r.appendChild(el("small", null, T("est"))); rankB = el("b", null, "…"); r.appendChild(rankB);
      mine.appendChild(l); mine.appendChild(r); card.appendChild(mine);
    }
    var formBox = el("div"), msg = el("p", "msg"), listBox = el("div"), note = el("p", "note", T("note")), row = el("div", "row");
    var closeBtn = el("button", "line", T("close")); closeBtn.type = "button"; closeBtn.addEventListener("click", close); row.appendChild(closeBtn);
    card.appendChild(formBox); card.appendChild(msg); card.appendChild(listBox); card.appendChild(note); card.appendChild(row);

    function setMsg(t, ok) { msg.textContent = t || ""; msg.className = "msg" + (ok ? " ok" : ""); }
    function paintList(board) {
      listBox.textContent = "";
      if (board.error) { var e = el("div", "st", T("fail")); var rb = el("button", "line", T("retry")); rb.type = "button"; rb.style.marginTop = "10px"; rb.addEventListener("click", load); e.appendChild(document.createElement("br")); e.appendChild(rb); listBox.appendChild(e); return; }
      if (!board.rows.length) { listBox.appendChild(el("div", "st", T("empty"))); return; }
      var ol = el("ol"), medal = ["🥇", "🥈", "🥉"], mineShown = false, i;
      function item(n, rowData, isMe) { var li = el("li", isMe ? "me" : ""); li.appendChild(el("span", "n", n <= 3 ? medal[n - 1] : String(n))); li.appendChild(el("span", "nm", rowData.name + (isMe ? " · " + T("me") : ""))); li.appendChild(el("span", "sc", fmt(cfg, rowData.m))); return li; }
      for (i = 0; i < board.rows.length && i < TOP; i++) {
        var x = board.rows[i], isMe = submitted && x.name === myName && x.key === myKey; if (isMe) mineShown = true;
        ol.appendChild(item(i + 1, x, isMe));
      }
      if (submitted && !mineShown) {   /* 내 기록이 TOP 10 밖이면 아래에 따로 보여 준다 */
        for (i = TOP; i < board.rows.length; i++) if (board.rows[i].name === myName && board.rows[i].key === myKey) { ol.appendChild(el("li", "", T("more"))); ol.appendChild(item(i + 1, board.rows[i], true)); break; }
      }
      listBox.appendChild(ol);
    }
    function paintForm(board) {
      formBox.textContent = "";
      if (!valid || submitted || board.error) return;
      var rk = rankOf(board, myKey);
      if (rankB) rankB.textContent = rk == null ? "100+" : rk + T("th");
      if (rk == null) { setMsg(T("out")); return; }
      var form = el("form"), inp = el("input"), btn = el("button", null, T("submit"));
      inp.type = "text"; inp.maxLength = NAME_MAX; inp.placeholder = T("namePh"); inp.autocomplete = "nickname"; inp.value = (store("arc-nick") || "").slice(0, NAME_MAX);
      inp.setAttribute("aria-label", T("namePh")); btn.type = "submit"; form.appendChild(inp); form.appendChild(btn); formBox.appendChild(form);
      form.addEventListener("submit", function (e) {
        e.preventDefault(); if (btn.disabled) return;
        var name = inp.value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, NAME_MAX);
        if (!name) { setMsg(T("needName")); inp.focus(); return; }
        if (badName(name)) { setMsg(T("badName")); inp.focus(); return; }
        var last = parseInt(store("arc-rank-last"), 10) || 0; if (Date.now() - last < COOLDOWN) { setMsg(T("wait")); return; }
        btn.disabled = true; setMsg("");
        withSb(function (c) {
          if (!c) { btn.disabled = false; setMsg(T("err")); return; }
          c.from("comments").insert({ thread: thread(id), nickname: name, body: myKey }).then(function (res) {
            if (res.error) { btn.disabled = false; setMsg(/too many/i.test(res.error.message || "") ? T("many") : T("err")); return; }
            store("arc-nick", name); store("arc-rank-last", String(Date.now()));
            submitted = true; myName = name; formBox.textContent = ""; setMsg(T("done"), true);
            if (window.track) { try { window.track("rank_submit", { game_id: id }); } catch (e2) { } }
            load();
          });
        });
      });
      setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) { } }, 50);
    }
    function load() {
      listBox.textContent = ""; listBox.appendChild(el("div", "st", T("loading")));
      var mytoken = token = {};
      fetchBoard(id, cfg, function (board) {
        if (mytoken !== token || !host) return;
        paintList(board); paintForm(board);
        if (submitted && rankB && !board.error) { var rk = rankOf(board, myKey); rankB.textContent = rk == null ? "100+" : rk + T("th"); }
      });
    }
    load();
  }

  /* 공개 함수 */
  function show(o) {
    if (!o || !GAMES[o.id]) return;
    if (timer) clearTimeout(timer);
    var delay = o.delay == null ? 800 : o.delay;
    timer = setTimeout(function () {
      timer = null;
      if (o.cancelIf && o.cancelIf()) return;    /* 그 사이 게임을 다시 시작했으면 띄우지 않는다 */
      current = o; render(o);
      if (window.track) { try { window.track("rank_view", { game_id: o.id, after_game: 1 }); } catch (e) { } }
    }, delay);
  }
  function open(o) {          /* 점수 없이 랭킹만 보기 */
    if (!o || !GAMES[o.id]) return; if (timer) { clearTimeout(timer); timer = null; }
    current = o; render({ id: o.id, onClose: o.onClose });
    if (window.track) { try { window.track("rank_view", { game_id: o.id, after_game: 0 }); } catch (e) { } }
  }
  window.ArcadeRank = { show: show, open: open, close: close, games: GAMES, _keyOf: keyOf, _metricOf: metricOf };
})();
