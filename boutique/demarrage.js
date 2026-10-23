// Thème clair / sombre selon l'appareil du client, puis application installable (service worker)
(function () {
  var sombre = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", sombre ? "dark" : "light");
})();
if ("serviceWorker" in navigator) addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
