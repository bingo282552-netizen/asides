// Runtime endpoints only. Keep every private key on your server, never here.
const SUPERKICK_BACKEND_ORIGIN=window.location.origin==='null'?'http://127.0.0.1:8788':window.location.origin;
window.SUPERKICK_SERVICE_CONFIG={
  online:{enabled:true,apiBase:`${SUPERKICK_BACKEND_ORIGIN}/api`},
  payments:{enabled:false,provider:'',checkoutEndpoint:'',allowClientSlipTopup:false},
};
