/* UJ ARCADE 공통 상단 홈(⌂) 버튼
   · 게임을 사이트 플레이어(iframe) 안에서 열었으면 플레이어만 닫고 메인 화면으로 돌아갑니다.
   · 게임 파일을 단독으로 열었으면(검색 유입 등) ../index.html 로 이동합니다.
   버튼 모양은 게임마다 놓인 자리의 이웃 버튼과 같은 네온 아이콘 버튼으로 맞춥니다. */
(function () {
  'use strict';

  var CSS = [
    '.uj-home{display:flex;align-items:center;justify-content:center;flex:0 0 auto;width:38px;height:38px;',
    'padding:0;box-sizing:border-box;border-radius:12px;border:1px solid rgba(120,170,255,.28);',
    'background:rgba(18,28,54,.8);color:#cfe0ff;font-family:inherit;font-size:18px;font-weight:800;',
    'line-height:1;text-decoration:none;cursor:pointer;pointer-events:auto;touch-action:manipulation;',
    '-webkit-tap-highlight-color:transparent;transition:transform .12s ease,background .12s ease}',
    '.uj-home:active{transform:scale(.93);background:rgba(40,60,110,.92)}',
    '.uj-home.sm{width:34px;height:34px;border-radius:11px;font-size:16px}',
    '.uj-home.round{width:34px;height:34px;border-radius:50%;font-size:16px}',
    '.uj-home.lite{background:#fff;border-color:rgba(150,90,60,.18);color:#8a5a45;box-shadow:0 1px 3px rgba(150,90,60,.14)}'
  ].join('');

  var SEL = '[data-home],a[aria-label="UJ ARCADE 홈으로"],a[aria-label="아케이드 홈"],'
    + 'a[aria-label="UJ ARCADE"],a#btnHome,a#homeBtn,a#homeBtn2,a#homeBtn3';

  function injectCss() {
    if (document.getElementById('ujHomeCss')) return;
    var s = document.createElement('style');
    s.id = 'ujHomeCss';
    s.appendChild(document.createTextNode(CSS));
    (document.head || document.documentElement).appendChild(s);
  }

  function mainUrl() {
    try { return new URL('../index.html', location.href).href; } catch (e) { return '../index.html'; }
  }

  function inFrame() {
    try { return !!(window.top && window.top !== window.self); } catch (e) { return true; }
  }

  /* 플레이어가 닫았다는 답(home-ok)을 받으면 예비 이동을 취소한다 */
  var ackTimer = 0;
  try {
    window.addEventListener('message', function (e) {
      var d = e && e.data;
      if (!d || typeof d !== 'object' || d.arcade !== 'home-ok') return;
      if (ackTimer) { clearTimeout(ackTimer); ackTimer = 0; }
    });
  } catch (e) {}

  function goHome(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!inFrame()) { location.href = mainUrl(); return; }   /* 단독 실행: 메인으로 이동 */
    try { window.parent.postMessage({ arcade: 'home' }, '*'); } catch (err) {}
    if (ackTimer) clearTimeout(ackTimer);
    /* 옛 화면이 캐시돼 플레이어가 답하지 않으면, 최상위 창을 메인으로 보낸다 */
    ackTimer = setTimeout(function () {
      ackTimer = 0;
      try { window.top.location.replace(mainUrl()); } catch (err) { location.replace(mainUrl()); }
    }, 400);
  }
  window.ujHome = goHome;   /* 게임 스크립트에서도 같은 동작을 부를 수 있게 */

  function bind(el) {
    el.addEventListener('click', goHome);
    /* 게임이 document 레벨에서 터치/포인터를 가로채(칼 던지기 등) 탭이 막히지 않도록 */
    el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, false);
    el.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
    el.addEventListener('touchend', function (e) { e.stopPropagation(); }, { passive: true });
  }

  function init() {
    injectCss();
    var list = document.querySelectorAll(SEL);
    for (var i = 0; i < list.length; i++) bind(list[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
