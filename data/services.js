// Runtime endpoints only. Keep every private key on your server, never here.
// GitHub Pages cannot run Python or write files, so it must use browser storage
// unless deployment-config.js explicitly points to a hosted backend.
const SUPERKICK_DEPLOYMENT=window.SUPERKICK_DEPLOYMENT_CONFIG||{};
const SUPERKICK_STATIC_PAGE=window.location.protocol==='file:'||window.location.hostname.endsWith('.github.io');
const SUPERKICK_INFERRED_BACKEND=SUPERKICK_STATIC_PAGE?'':window.location.origin;
const SUPERKICK_BACKEND_ORIGIN=String(SUPERKICK_DEPLOYMENT.backendOrigin||SUPERKICK_INFERRED_BACKEND||'').replace(/\/+$/,'');
window.SUPERKICK_SERVICE_CONFIG={
  online:{
    enabled:!!SUPERKICK_BACKEND_ORIGIN,
    apiBase:SUPERKICK_BACKEND_ORIGIN?`${SUPERKICK_BACKEND_ORIGIN}/api`:'',
    mode:SUPERKICK_BACKEND_ORIGIN?'backend':'browser',
  },
  payments:{enabled:false,provider:'',checkoutEndpoint:'',allowClientSlipTopup:false},
};
window.SUPERKICK_RUNTIME={
  mode:SUPERKICK_BACKEND_ORIGIN?'backend':'browser',
  backendOrigin:SUPERKICK_BACKEND_ORIGIN,
  staticPage:SUPERKICK_STATIC_PAGE,
};
