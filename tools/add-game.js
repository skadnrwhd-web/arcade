#!/usr/bin/env node
/* UJ ARCADE 새 게임 등록 도우미 (Node.js 만 있으면 됩니다. 설치할 것 없음)

   1) 게임 파일을 games/<id>.html 로 먼저 넣는다.
   2) 점검만:   node tools/add-game.js check
   3) 등록하기: node tools/add-game.js add --id my-game --title "내 게임" --title-en "My Game" \
                  --desc "한 줄 설명" --desc-en "One-line description" --badge 퍼즐 \
                  --c1 "#1e1b4b" --c2 "#6366f1" [--art 그림.svg] [--dry]

   add 가 해 주는 일: 메인 목록에 앱 아이콘 카드 추가, 영어 문구 추가, 
                     sitemap.xml 과 검색용 목록(JSON-LD) 추가. --dry 를 붙이면 바꾸지 않고 미리보기만 한다.
   하지 않는 일:      랭킹 등록(rank.js)은 점수 규칙을 사람이 정해야 해서 안내만 출력한다. */
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const P = (f) => path.join(root, f);
const SITE = "https://skadnrwhd-web.github.io/arcade/";

function args(list) {
  const o = {};
  for (let i = 0; i < list.length; i++) if (list[i].startsWith("--")) {
    const k = list[i].slice(2), v = list[i + 1];
    if (v === undefined || v.startsWith("--")) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escJs = (s) => JSON.stringify(String(s));          // 영어 사전용(따옴표 처리)
function gridRange(html) {
  const a = html.indexOf('<section class="sec" id="games"');
  if (a < 0) throw new Error("index.html 에서 games 구역을 못 찾았습니다.");
  const mm = /\r?\n    <\/div>\r?\n  <\/div>\r?\n<\/section>/.exec(html.slice(a));
  const b = mm ? a + mm.index : -1;
  if (b < 0) throw new Error("games 구역의 끝을 못 찾았습니다.");
  return [a, b];
}
function registered(html) {
  const [a, b] = gridRange(html);
  return [...html.slice(a, b).matchAll(/data-play="([^"]+)"/g)].map((m) => m[1]);
}

const DEFAULT_ART = '<rect x="96" y="56" width="128" height="68" rx="30" fill="#fff" stroke="#fff" stroke-width="4"/><rect x="118" y="82" width="30" height="8" rx="4" fill="#475569"/><rect x="129" y="71" width="8" height="30" rx="4" fill="#475569"/><circle cx="186" cy="80" r="8" fill="#ef4444"/><circle cx="204" cy="96" r="8" fill="#3b82f6"/>';

function check() {
  const html = fs.readFileSync(P("index.html"), "utf8");
  const sm = fs.existsSync(P("sitemap.xml")) ? fs.readFileSync(P("sitemap.xml"), "utf8") : "";
  const files = fs.readdirSync(P("games")).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""));
  const reg = registered(html);
  let bad = 0;
  const say = (m) => { console.log("  ✗ " + m); bad++; };
  files.forEach((id) => {
    if (!reg.includes(id)) say(id + ": games 폴더에는 있는데 메인 목록에 카드가 없음");
    if (!sm.includes("games/" + id + ".html")) say(id + ": sitemap.xml 에 없음");
    if (!html.includes('"url": "' + SITE + "games/" + id + '.html"')) say(id + ": 검색용 목록(JSON-LD)에 없음");
  });
  reg.forEach((id) => {
    const href = html.match(new RegExp('href="games/' + id.replace(/[-.]/g, "\\$&") + '\\.html"[^>]*data-play="' + id.replace(/[-.]/g, "\\$&") + '"'));
    if (!href && !files.includes(id)) return;          // 바깥 주소로 연결된 게임은 파일 검사 생략
  });
  const n = reg.length;
  console.log(bad ? "\n문제 " + bad + "개" : "문제 없음: 카드 " + n + "개, games 파일 " + files.length + "개, 모두 등록되어 있습니다.");
  process.exitCode = bad ? 1 : 0;
}

function add(a) {
  for (const k of ["id", "title", "desc", "c1", "c2"]) if (!a[k] || a[k] === true) { console.error("빠진 항목: --" + k); process.exit(2); }
  const id = String(a.id);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { console.error("id 는 영문 소문자·숫자·- 만 쓸 수 있습니다."); process.exit(2); }
  if (!/^#[0-9a-fA-F]{6}$/.test(a.c1) || !/^#[0-9a-fA-F]{6}$/.test(a.c2)) { console.error("색은 #RRGGBB 형식 (예: #1e1b4b)"); process.exit(2); }
  if (!fs.existsSync(P("games/" + id + ".html"))) { console.error("games/" + id + ".html 파일이 먼저 있어야 합니다."); process.exit(2); }
  let html = fs.readFileSync(P("index.html"), "utf8");
  if (registered(html).includes(id)) { console.error(id + " 는 이미 등록되어 있습니다."); process.exit(2); }
  const key = id.replace(/-/g, "_");
  const titleEn = a["title-en"] || a.title, descEn = a["desc-en"] || a.desc;
  const art = a.art && a.art !== true ? fs.readFileSync(a.art, "utf8").replace(/<\/?svg[^>]*>/g, "") : DEFAULT_ART;
  const badge = a.badge && a.badge !== true ? a.badge : "게임";
  const card =
`      <a class="game rv" href="games/${id}.html" data-play="${id}" target="_blank" rel="noopener" style="--hue:var(--cyan); --c1:${a.c1}; --c2:${a.c2}">
        <div class="cover"><span class="badge">${esc(badge)}</span>
          <svg viewBox="0 0 320 176" fill="none">${art.trim()}</svg></div>
        <div class="b"><h3 data-i="t_${key}">${esc(a.title)}</h3><p data-i="f_${key}_p">${esc(a.desc)}</p><div class="meta"><span data-i="newtab">댓글 남기기</span><span class="go">▶ <span data-i="open">플레이</span></span></div></div>
      </a>`;
  let [, b] = gridRange(html);
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  html = html.slice(0, b) + eol + card.replace(/\n/g, eol) + html.slice(b);
  html = html.replace("var EN={", () => "var EN={t_" + key + ":" + escJs(titleEn) + ",f_" + key + "_p:" + escJs(descEn) + ",");
  const n = registered(html).length;   /* 게임 개수는 화면에 적지 않는다(사용자 결정) */
  const m = html.match(/"itemListElement": \[/);
  if (m) {
    const s = m.index + m[0].length, e = html.indexOf("]", s), count = (html.slice(s, e).match(/"@type": "ListItem"/g) || []).length;
    html = html.slice(0, e) + ', {"@type": "ListItem", "position": ' + (count + 1) + ", \"name\": " + JSON.stringify(a.title) + ", \"url\": \"" + SITE + "games/" + id + ".html\"}" + html.slice(e);
  }
  let sm = fs.existsSync(P("sitemap.xml")) ? fs.readFileSync(P("sitemap.xml"), "utf8") : null;
  if (sm && !sm.includes("games/" + id + ".html")) {
    const d = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    sm = sm.replace("</urlset>", () => "  <url><loc>" + SITE + "games/" + id + ".html</loc><lastmod>" + d + "</lastmod><priority>0.8</priority></url>\n</urlset>");
  }
  if (a.dry) { console.log("[미리보기] 바뀌지 않았습니다. 추가될 카드:\n" + card + "\n카드 수: " + n + "개"); return; }
  fs.writeFileSync(P("index.html"), html);
  if (sm) fs.writeFileSync(P("sitemap.xml"), sm);
  console.log("등록 완료: " + id + " (카드 " + n + "개)");
  console.log("\n남은 일(사람이 확인)");
  console.log(" 1. 로컬 미리보기에서 아이콘 모양과 플레이가 되는지 본다.");
  console.log(" 2. 점수 랭킹이 필요하면 rank.js 의 게임 목록에 한 줄을 넣는다. 예:");
  console.log('    "' + id + '": { title: [' + JSON.stringify(a.title) + ", " + JSON.stringify(titleEn) + '], better: "high", unit: ["점", " pts"], label: ["점수", "Score"], bounds: [1, 1000000] },');
  console.log(" 3. node tools/add-game.js check 로 빠진 곳이 없는지 확인한 뒤 올린다.");
}

const cmd = process.argv[2];
if (cmd === "check") check();
else if (cmd === "add") add(args(process.argv.slice(3)));
else console.log("사용법:\n  node tools/add-game.js check\n  node tools/add-game.js add --id <id> --title <이름> --desc <설명> --c1 <#색> --c2 <#색> [--title-en --desc-en --badge --art --dry]");
