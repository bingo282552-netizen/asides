// Generated menu music, stadium ambience, match sounds, and their settings.
(function(){
  const {config,byId}=SuperkickExperience;
  const settingsKey='skfm_audio_settings_v1';
  let audioCtx=null,musicTimer=null,musicStep=0,stadiumSource=null,stadiumGain=null;
  const settings=()=>{
    try{return {...(config.audioDefaults||{}),...JSON.parse(localStorage.getItem(settingsKey)||'{}')};}
    catch(e){return {...(config.audioDefaults||{master:70,music:45,stadium:45,match:70})};}
  };
  const channelVolume=channel=>{
    const current=settings();
    return ((current.master??70)/100)*((current[channel]??70)/100);
  };
  function inject(){
    document.body.insertAdjacentHTML('beforeend',`
      <div id="settings-modal" class="feature-modal"><div class="feature-panel">
        <div class="fbtw"><div class="ct">ตั้งค่าเสียง</div><button class="mc" onclick="closeSettings()">x</button></div>
        <div class="settings-grid" id="settings-grid"></div>
        <hr class="div">
        <div class="fbtw"><div class="tm">ออกจากระบบแล้วจะต้องใส่ไอดีใหม่</div><button class="btn br bsm" onclick="logoutSuperkick()">ออกจากระบบ</button></div>
      </div></div>`);
  }
  function ensureAudioContext(){
    if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    return audioCtx;
  }
  function tone(freq,duration,volume,delay=0,type='sine'){
    try{
      const ctx=ensureAudioContext(),start=ctx.currentTime+delay;
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=type;osc.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.03);
      gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.03);
    }catch(e){}
  }
  window.startMenuMusic=()=>{
    if(musicTimer)return;
    const notes=[110,146,165,196,165,146,123,146];
    musicTimer=setInterval(()=>{tone(notes[musicStep++%notes.length],.4,.045*channelVolume('music'),0,'triangle');},480);
  };
  window.startStadiumAmbience=()=>{
    try{
      stopStadiumAmbience();
      const ctx=ensureAudioContext(),length=ctx.sampleRate*2,buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*.32;
      stadiumSource=ctx.createBufferSource();stadiumGain=ctx.createGain();
      stadiumSource.buffer=buffer;stadiumSource.loop=true;stadiumGain.gain.value=.055*channelVolume('stadium');
      stadiumSource.connect(stadiumGain);stadiumGain.connect(ctx.destination);stadiumSource.start();
      tone(220,.15,.08*channelVolume('match'),0,'square');
    }catch(e){}
  };
  window.stopStadiumAmbience=()=>{try{stadiumSource?.stop();}catch(e){}stadiumSource=null;stadiumGain=null;};
  window.playGoalSound=()=>{
    const volume=.16*channelVolume('match');
    [440,554,659,880].forEach((freq,index)=>tone(freq,.34,volume,index*.12,'sawtooth'));
  };
  function renderSettings(){
    const current=settings();
    const rows=[['master','เสียงหลัก'],['music','เสียงคลอในเกม'],['stadium','เสียงสนาม'],['match','เสียงภายในการแข่งขัน']];
    byId('settings-grid').innerHTML=rows.map(([key,label])=>`
      <div class="settings-row"><label>${label}</label><input type="range" min="0" max="100" value="${current[key]}" oninput="updateAudioSetting('${key}',this.value)"><span id="setting-${key}-value">${current[key]}</span></div>`).join('');
  }
  window.openSettings=()=>{renderSettings();byId('settings-modal').classList.add('open');};
  window.closeSettings=()=>byId('settings-modal').classList.remove('open');
  window.updateAudioSetting=(key,value)=>{
    const current=settings();current[key]=Number(value);localStorage.setItem(settingsKey,JSON.stringify(current));
    byId(`setting-${key}-value`).textContent=value;
    if((key==='master'||key==='stadium')&&stadiumGain)stadiumGain.gain.value=.055*channelVolume('stadium');
  };
  window.SuperkickAudio={inject,ensureAudioContext};
})();
