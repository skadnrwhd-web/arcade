/* UJ ARCADE 서비스 워커: 항상 최신 화면을 먼저 받고(네트워크 우선), 인터넷이 안 될 때만 저장해 둔 화면을 보여 줍니다.
   게임 코드를 고쳐 올려도 예전 화면이 남지 않도록 '캐시 우선'은 쓰지 않습니다. */
var CACHE = "arcade-v1";
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(["./", "index.html", "icons/icon-192.png"]); }).catch(function () {}));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;   /* 다른 사이트(댓글 서버 등)는 건드리지 않음 */
  e.respondWith(
    fetch(r).then(function (res) {
      if (res && res.ok) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, cp); }); }
      return res;
    }).catch(function () {
      return caches.match(r).then(function (m) { return m || caches.match("index.html"); });
    })
  );
});
