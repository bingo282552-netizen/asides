// Visual polish shared by the categorized experience modules.
(function(){
  function inject(){
    const style=document.createElement('style');
    style.textContent=`
      body{background:radial-gradient(circle at 10% 0%,rgba(45,106,79,.2),transparent 36%),linear-gradient(145deg,#080d13,#0d1117 45%,#0a1711);}
      .card{box-shadow:0 8px 24px rgba(0,0,0,.12);}
      #nav{overflow:visible;flex-wrap:wrap;position:sticky;top:54px;z-index:90;}
      .nav-group{position:relative;}
      .nav-menu{display:none;position:absolute;left:0;top:100%;min-width:190px;padding:5px;background:#111820;border:1px solid var(--border);border-radius:0 0 8px 8px;box-shadow:0 12px 28px rgba(0,0,0,.45);z-index:120;}
      .nav-group.open .nav-menu{display:block;}
      .nav-menu button{display:block;width:100%;padding:8px 10px;text-align:left;background:none;border:none;color:var(--muted);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-weight:700;}
      .nav-menu button:hover{color:var(--gold);background:rgba(240,180,41,.08);}
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
      .tutorial-step{min-height:120px;padding:.75rem;border-radius:9px;background:linear-gradient(135deg,rgba(45,106,79,.2),rgba(0,0,0,.12));}
      .settings-grid{display:grid;grid-template-columns:1fr;gap:10px;}
      .settings-row{display:grid;grid-template-columns:150px 1fr 42px;gap:8px;align-items:center;}
      .sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .sub-player{display:flex;justify-content:space-between;gap:8px;padding:7px;border:1px solid var(--border);border-radius:7px;margin-bottom:5px;background:#0d1117;color:var(--text);cursor:pointer;width:100%;}
      .sub-player.selected{border-color:var(--gold);background:rgba(240,180,41,.12);}
      .fixture-row{display:grid;grid-template-columns:55px 1fr 80px;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:.82rem;}
      .fixture-row.current{color:var(--gold);font-weight:700;}
      .account-id{font-family:'Bebas Neue',sans-serif;letter-spacing:2px;font-size:1.2rem;color:var(--gold);}
      @media(max-width:640px){#nav{top:54px}.nav-menu{position:fixed;left:.5rem;right:.5rem;top:96px}.sub-grid{grid-template-columns:1fr}.settings-row{grid-template-columns:110px 1fr 34px}}
    `;
    document.head.appendChild(style);
  }
  window.SuperkickTheme={inject};
})();
