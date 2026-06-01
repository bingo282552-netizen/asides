// Ordered experience startup and adapters around the original game engine.
(function(){
  const {ensureState}=SuperkickExperience;
  function hookCoreFunctions(){
    const coreGoPage=window.goPage;
    window.goPage=function(page){
      coreGoPage(page);
      if(page==='fixtures')renderFixtures();
      if(page==='history')renderMatchHistoryPage();
      if(page==='legacy')SuperkickLegacy.render();
      if(page==='online'){SuperkickOnlineWorld.seed();SuperkickOnlineWorld.render();}
      SuperkickNavigation.markActive(page);
    };
    const coreHome=window.renderHome;
    window.renderHome=function(){coreHome();SuperkickOnlineWorld.renderWorldNews();};
    const coreLegacy=window.renderLegacy;
    window.renderLegacy=function(){coreLegacy();SuperkickLegacy.render();};
    const afterStart=()=>{
      ensureState();
      SuperkickMatchTools.ensureSeasonFixtures();
      SuperkickOnlineWorld.seed();
      SuperkickOnlineWorld.renderWorldNews();
      SuperkickAuth.renderAccountCard();
      startMenuMusic();
    };
    const coreStartNew=window.startNewGame;
    window.startNewGame=function(){coreStartNew();afterStart();};
    const coreQuick=window.quickStart;
    window.quickStart=function(){coreQuick();afterStart();};
    const coreLoad=window.loadGame;
    window.loadGame=function(){coreLoad();afterStart();};
  }
  function init(){
    SuperkickTheme.inject();
    SuperkickAuth.inject();
    SuperkickTutorial.inject();
    SuperkickAudio.inject();
    SuperkickMatchTools.inject();
    SuperkickLegacy.inject();
    SuperkickOnlineWorld.inject();
    SuperkickNavigation.rebuild();
    hookCoreFunctions();
    SuperkickAuth.init();
    document.addEventListener('click',event=>{if(!event.target.closest('.nav-group')&&!event.target.closest('#mobile-nav-popover'))closeNavMenus();},{passive:true});
    document.addEventListener('pointerdown',()=>{try{SuperkickAudio.ensureAudioContext();startMenuMusic();}catch(e){}},{once:true});
  }
  window.initExperienceFeatures=init;
  init();
})();
