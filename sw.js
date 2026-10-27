// v3: no offline cache until visual assets are finalized
self.addEventListener('install',event=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.registration.unregister().then(()=>self.clients.claim())));
