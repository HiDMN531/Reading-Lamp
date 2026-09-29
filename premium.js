/* Personal GitHub Pages edition: the complete story bank is already in stories.json. */
(function (root) {
  'use strict';
  const fullAccess = () => ({ premium: true, offline: false, price: '', available: false, restorable: false });
  root.ReadingLampPremium = {
    init: async () => true,
    purchase: async () => true,
    restore: async () => true,
    loadStories: async () => [],
    state: fullAccess,
  };
})(window);
