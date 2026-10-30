/* Send off-site links to a new tab.

   This page is embedded in Google Sites as a full-page iframe. That iframe's
   sandbox grants allow-popups but NOT allow-top-navigation, and every Google
   Sites host (icscanada.edu, fics., faculty., perspective.) answers with
   X-Frame-Options: DENY. So inside the embed:

     - a plain link to icscanada.edu tries to load in the iframe, is refused,
       and the visitor gets a blank frame;
     - target="_top" / target="_parent" are silently blocked by the sandbox;
     - target="_blank" is the only navigation that works.

   Opening off-site links in a new tab is also the right behaviour when the
   pages are viewed directly, so this runs unconditionally rather than
   sniffing for the iframe.

   Same-origin links (page to page within this site) are left alone: they
   navigate inside the embed, which is what we want.

   mailto:/tel: are left alone too — the sandbox's allow-popups permits them,
   and forcing _blank would leave stray blank tabs behind. */

(function () {
  'use strict';

  function mark(root) {
    var links = (root || document).querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.protocol !== 'http:' && a.protocol !== 'https:') continue;
      if (!a.target && a.origin !== window.location.origin) a.target = '_blank';
      /* Modern browsers imply noopener on target="_blank"; older ones do not. */
      if (a.target === '_blank' && a.rel.indexOf('noopener') === -1) {
        a.rel = a.rel ? a.rel + ' noopener' : 'noopener';
      }
    }
  }

  /* Three idempotent passes: now (covers the page and the footer just injected
     above), after parsing, and after load — the last one catches links added by
     other inline scripts. Content fetched later (the events feed on the landing
     page) sets its own target. */
  mark(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mark(document); });
  }
  window.addEventListener('load', function () { mark(document); });
})();
