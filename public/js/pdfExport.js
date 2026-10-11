'use strict';

(function () {
  function openPrint(part) {
    const safe = ['piano', 'flute', 'viola', 'all'].includes(part) ? part : 'all';
    window.open(`/print/${safe}?autoprint=1`, '_blank', 'noopener');
  }

  window.Cadros2Pdf = {
    openPrint
  };
})();
