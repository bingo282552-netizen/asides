// Shared helpers and save-compatible state defaults for experience modules.
(function(){
  const config=window.SUPERKICK_FEATURE_CONFIG||{};
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[ch]));
  function ensureState(){
    if(typeof G==='undefined')return;
    G.matchHistory=G.matchHistory||[];
    G.worldNews=G.worldNews||[];
    G.onlineManagers=G.onlineManagers||[];
    G.seasonFixtures=G.seasonFixtures||[];
    G.canChangeLeague=!!G.canChangeLeague;
    G.matchSubsUsed=G.matchSubsUsed||0;
  }
  window.SuperkickExperience={config,byId,esc,ensureState};
})();
