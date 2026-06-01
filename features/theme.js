// Visual polish shared by the categorized experience modules.
(function(){
  function inject(){
    const style=document.createElement('style');
    style.textContent=`
      body{background:
        radial-gradient(circle at 14% 8%,rgba(240,180,41,.16),transparent 24%),
        radial-gradient(circle at 88% 16%,rgba(57,197,207,.12),transparent 28%),
        radial-gradient(circle at 50% 100%,rgba(45,106,79,.34),transparent 42%),
        linear-gradient(145deg,#05080d,#0d1117 44%,#07160f);
        background-attachment:fixed;}
      #game-ui.visible{position:relative;isolation:isolate;min-height:100vh;}
      #game-ui.visible:before{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;background:
        linear-gradient(115deg,transparent 0 20%,rgba(240,180,41,.055) 20% 21%,transparent 21% 52%,rgba(88,166,255,.045) 52% 53%,transparent 53%),
        repeating-linear-gradient(90deg,rgba(255,255,255,.028) 0 1px,transparent 1px 72px),
        radial-gradient(ellipse at 50% 115%,rgba(26,71,42,.72),transparent 58%);}
      #game-ui.visible:after{content:"";position:fixed;left:50%;bottom:-26vh;width:min(1100px,130vw);height:48vh;transform:translateX(-50%);z-index:-1;pointer-events:none;border:1px solid rgba(255,255,255,.07);border-bottom:0;border-radius:50% 50% 0 0;box-shadow:0 0 90px rgba(63,185,80,.12) inset;opacity:.8;}
      button,.btn,.tb,.lineup-player,.sc{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
      .card{background:linear-gradient(160deg,rgba(22,27,34,.94),rgba(13,17,23,.9));box-shadow:0 14px 34px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.035);backdrop-filter:blur(6px);}
      .card:hover{border-color:rgba(240,180,41,.38);}
      #hdr{background:linear-gradient(135deg,rgba(7,20,15,.96),rgba(18,56,35,.94));box-shadow:0 10px 28px rgba(0,0,0,.28);}
      #nav{overflow:visible;flex-wrap:wrap;position:sticky;top:54px;z-index:90;background:rgba(17,24,32,.9);backdrop-filter:blur(10px);}
      .nav-group{position:relative;}
      .nav-menu{display:none;position:absolute;left:0;top:100%;min-width:190px;padding:5px;background:#111820;border:1px solid var(--border);border-radius:0 0 8px 8px;box-shadow:0 12px 28px rgba(0,0,0,.45);z-index:120;}
      .nav-group.open .nav-menu{display:block;}
      .nav-menu button{display:block;width:100%;padding:8px 10px;text-align:left;background:none;border:none;color:var(--muted);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;}
      .nav-menu button:hover{color:var(--gold);background:rgba(240,180,41,.08);}
      .mobile-nav-popover{display:none;}
      .hud-help{width:28px;height:28px;border:1px solid rgba(240,180,41,.55);border-radius:50%;background:rgba(240,180,41,.12);color:var(--gold);font-weight:900;cursor:pointer;}
      .hud-help:hover{background:var(--gold);color:#000;}
      .auth-shell{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:1rem;background:radial-gradient(circle at center,#123b25,#050a0e 70%);}
      .auth-shell.open{display:flex;}
      .auth-card{width:min(430px,100%);background:rgba(13,17,23,.96);border:1px solid var(--gold);border-radius:14px;padding:1.2rem;box-shadow:0 24px 80px rgba(0,0,0,.55);}
      .auth-title{font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--gold);letter-spacing:2px;}
      .auth-tabs{display:flex;gap:6px;margin:.8rem 0;}
      .auth-pane{display:none}.auth-pane.active{display:block}
      .auth-social{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:.8rem;}
      .auth-error{min-height:20px;color:var(--red);font-size:.78rem;margin-top:6px;}
      .feature-modal{position:fixed;inset:0;z-index:11000;display:none;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.86);}
      .feature-modal.open{display:flex;}
      .feature-panel{width:min(620px,100%);max-height:88vh;overflow:auto;background:var(--card);border:1px solid var(--gold);border-radius:12px;padding:1rem;}
      .tutorial-step{min-height:120px;padding:.9rem;border-radius:12px;background:linear-gradient(135deg,rgba(45,106,79,.24),rgba(0,0,0,.16));}
      .tutorial-body{font-size:.9rem;line-height:1.45;margin-bottom:.75rem;}
      .tutorial-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
      .tutorial-card{padding:9px;border:1px solid var(--border);border-radius:9px;background:rgba(13,17,23,.64);}
      .tutorial-card-title{font-weight:800;color:var(--gold);margin-bottom:3px;}
      .settings-grid{display:grid;grid-template-columns:1fr;gap:10px;}
      .settings-row{display:grid;grid-template-columns:150px 1fr 42px;gap:8px;align-items:center;}
      .sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .sub-player{display:flex;justify-content:space-between;gap:8px;padding:7px;border:1px solid var(--border);border-radius:7px;margin-bottom:5px;background:#0d1117;color:var(--text);cursor:pointer;width:100%;}
      .sub-player.selected{border-color:var(--gold);background:rgba(240,180,41,.12);}
      .pc{box-shadow:0 10px 24px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.035);}
      .pc:hover{box-shadow:0 16px 32px rgba(0,0,0,.26),0 0 24px rgba(240,180,41,.1);}
      .pf,.lineup-avatar,.mini-face,.pack-face{box-shadow:0 0 0 3px rgba(255,255,255,.025),0 8px 22px rgba(0,0,0,.28);}
      .pp{box-shadow:inset 0 1px 0 rgba(255,255,255,.16);}
      .scoreboard{background:radial-gradient(circle at center,rgba(240,180,41,.12),transparent 42%),linear-gradient(135deg,rgba(26,71,42,.95),rgba(9,14,20,.98));border:1px solid rgba(240,180,41,.22);box-shadow:0 16px 42px rgba(0,0,0,.26);}
      #pitch,.mp-pitch{box-shadow:inset 0 0 0 2px rgba(255,255,255,.035),inset 0 0 48px rgba(0,0,0,.2),0 14px 36px rgba(0,0,0,.26);}
      .lineup-player.selected{border-color:var(--gold);background:rgba(240,180,41,.14);box-shadow:0 0 0 2px rgba(240,180,41,.14);}
      .lineup-touch-hint{display:none;padding:8px 10px;margin-bottom:7px;border:1px solid rgba(88,166,255,.45);border-radius:7px;background:rgba(88,166,255,.1);color:var(--blue);font-size:.78rem;}
      .mobile-tactics-actions{display:none;}
      .fixture-row{display:grid;grid-template-columns:55px 1fr 80px;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;}
      .fixture-row.current{color:var(--gold);font-weight:700;}
      .account-id{font-family:'Bebas Neue',sans-serif;letter-spacing:2px;font-size:1.2rem;color:var(--gold);}
      .inventory-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      .inventory-card{min-height:130px;}
      .inventory-icon{display:inline-flex;width:42px;height:42px;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,255,255,.08);font-size:1.45rem;}
      .inventory-stat{text-align:center;padding:.85rem;}
      .inventory-actions{justify-content:flex-end;flex-wrap:wrap;}
      .admin-player-list{max-height:520px;overflow:auto;padding-right:3px;}
      .admin-player-row{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;text-align:left;padding:9px;margin-bottom:6px;border:1px solid var(--border);border-radius:9px;background:rgba(255,255,255,.035);color:var(--text);cursor:pointer;}
      .admin-player-row.selected{border-color:var(--gold);background:rgba(240,180,41,.12);}
      .admin-mini{padding:.6rem;display:flex;justify-content:space-between;gap:8px;align-items:center;}
      .admin-action-grid{display:grid;grid-template-columns:1fr;gap:12px;}
      .admin-log-row{padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem;}
      @media(max-width:700px){
        #hdr{padding:0 .55rem;gap:.55rem;}
        .logo{flex:0 0 auto;font-size:1.25rem;letter-spacing:1px;}
        .hud{min-width:0;flex:1;gap:.7rem;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;}
        .hud::-webkit-scrollbar,#nav::-webkit-scrollbar{display:none;}
        .hud>.fbtw{flex:0 0 auto;gap:3px;}
        .hv{font-size:.9rem;}
        .hud-help{flex:0 0 auto;width:32px;height:32px;}
        #nav{top:54px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-width:none;}
        .nav-group{flex:0 0 auto;}
        .nb{min-height:44px;padding:10px 12px;}
        .nav-group.open .nav-menu{display:none;}
        .mobile-nav-popover{position:fixed;left:.55rem;right:.55rem;max-height:calc(100vh - 112px);overflow-y:auto;padding:6px;background:#111820;border:1px solid var(--border);border-radius:10px;box-shadow:0 16px 36px rgba(0,0,0,.55);z-index:10050;}
        .mobile-nav-popover.open{display:block;}
        .mobile-nav-title{padding:8px 10px;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:800;border-bottom:1px solid var(--border);margin-bottom:4px;}
        .mobile-nav-popover button{display:block;width:100%;min-height:44px;padding:10px;text-align:left;background:none;border:none;border-radius:7px;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.95rem;}
        .mobile-nav-popover button:hover,.mobile-nav-popover button:active{color:var(--gold);background:rgba(240,180,41,.08);}
        .pg{padding:.7rem .65rem 5rem;}
        .card{padding:.8rem;}
        .g2{grid-template-columns:minmax(0,1fr);}
        .g3,.g4{grid-template-columns:repeat(2,minmax(0,1fr));}
        .btn,.tb,.ng-choice-btn,.ng-league-btn,.ng-back{min-height:44px;}
        .bsm{padding:8px 10px;font-size:.82rem;}
        .mc{min-width:44px;min-height:44px;}
        select,input[type=text],input[type=number],input[type=password]{min-height:44px;font-size:16px;}
        input[type=range]{min-height:34px;}
        .auth-shell{overflow-y:auto;}
        .auth-card,.feature-panel,.md{width:100%;max-width:100%;}
        .tutorial-grid{grid-template-columns:1fr;}
        .inventory-list{grid-template-columns:1fr;}
        .inventory-actions .btn{flex:1;}
        .admin-player-row{grid-template-columns:1fr;gap:4px;}
        .sub-grid{grid-template-columns:1fr;}
        .settings-row{grid-template-columns:100px 1fr 34px;}
        .scoreboard{gap:.7rem;padding:.9rem .55rem;}
        .snum{font-size:2.7rem;}
        .mp-pitch{min-height:285px;}
        #pitch{min-height:440px;}
        .squad-panel{max-height:340px;}
        .lineup-touch-hint{display:block;}
        .lineup-player{min-height:54px;cursor:pointer;}
        .sc{width:54px;height:54px;}
        .mobile-tactics-actions{display:flex;gap:8px;margin-bottom:.7rem;}
        .mobile-tactics-actions .btn{flex:1;}
        #pg-tactics>.g2{display:flex;flex-direction:column;}
        #pg-tactics>.g2>.lineup-layout{order:-1;}
        #pg-squad>.fbtw{display:block;}
        #pg-squad>.fbtw>.fb{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);margin-top:8px;}
        #pg-squad>.fbtw>.fb select{width:100%!important;}
        #pg-squad>.fbtw>.fb .btn{grid-column:1 / -1;}
        #m-events{max-height:220px!important;}
        #notif{left:.65rem;right:.65rem;bottom:calc(.65rem + env(safe-area-inset-bottom));}
        .nitem{max-width:none;}
      }
    `;
    document.head.appendChild(style);
  }
  window.SuperkickTheme={inject};
})();
