// Landing-page tutorial walkthrough.
(function(){
  const {config,byId,esc}=SuperkickExperience;
  let tutorialIndex=0;
  function inject(){
    document.body.insertAdjacentHTML('beforeend',`
      <div id="tutorial-modal" class="feature-modal"><div class="feature-panel">
        <div class="fbtw"><div class="ct">วิธีเล่น</div><button class="mc" onclick="closeTutorial()">x</button></div>
        <div id="tutorial-content"></div>
        <div class="fbtw" style="margin-top:.8rem;"><button class="btn bgh" onclick="tutorialPrevious()">ก่อนหน้า</button><span id="tutorial-progress" class="tm"></span><button class="btn bg" onclick="tutorialNext()">ถัดไป</button></div>
      </div></div>`);
    document.querySelector('.land-menu')?.insertAdjacentHTML('beforeend','<button class="land-btn-main land-btn-sec" onclick="openTutorial()">วิธีเล่น</button>');
  }
  function render(){
    const steps=config.tutorialSteps||[],step=steps[tutorialIndex]||{};
    byId('tutorial-content').innerHTML=`<div class="tutorial-step"><div class="ct">${esc(step.title||'วิธีเล่น')}</div><div>${esc(step.body||'')}</div></div>`;
    byId('tutorial-progress').textContent=`${tutorialIndex+1} / ${steps.length}`;
  }
  window.openTutorial=()=>{tutorialIndex=0;render();byId('tutorial-modal').classList.add('open');};
  window.closeTutorial=()=>byId('tutorial-modal').classList.remove('open');
  window.tutorialPrevious=()=>{tutorialIndex=Math.max(0,tutorialIndex-1);render();};
  window.tutorialNext=()=>{
    if(tutorialIndex>=(config.tutorialSteps||[]).length-1){closeTutorial();return;}
    tutorialIndex++;render();
  };
  window.SuperkickTutorial={inject};
})();
