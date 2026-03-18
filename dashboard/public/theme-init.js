// Blocking: set data-theme before first paint to prevent flash.
// This file MUST be loaded as an external script (not inline) because
// OpenClaw's control-ui CSP sets "script-src 'self'" which blocks inline scripts.
(function(){var t=localStorage.getItem('rc-theme');if(t)document.documentElement.setAttribute('data-theme',t)})();

// Cache invalidation — clear stale bundles on version change.
// The hash below is replaced at build time by the Vite cacheBust plugin.
// In dev mode the placeholder stays, so the check is a no-op.
(function(){
  var v='__RC_BUILD_HASH__';
  var k='rc-build';
  var prev=localStorage.getItem(k);
  localStorage.setItem(k,v);
  if(prev && prev!==v && v!=='__RC_BUILD_HASH__'){
    if(window.caches){caches.keys().then(function(ns){ns.forEach(function(n){caches.delete(n)})})}
    if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})})}
    location.reload();
  }
})();
