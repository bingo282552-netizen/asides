// Compact grouped navigation for the main game pages.
(function(){
  const {config,byId}=SuperkickExperience;
  function rebuild(){
    const nav=byId('nav');if(!nav)return;
    nav.innerHTML=(config.menuGroups||[]).map(group=>{
      if(group.page)return `<button class="nb" data-page="${group.page}" onclick="goMenuPage('${group.page}')">${group.label}</button>`;
      const items=(group.items||[]).map(item=>{
        const action=item.page?`goMenuPage('${item.page}')`:item.action;
        return `<button onclick="${action};closeNavMenus()">${item.label}</button>`;
      }).join('');
      return `<div class="nav-group"><button class="nb" onclick="toggleNavGroup(this)">${group.label}</button><div class="nav-menu">${items}</div></div>`;
    }).join('');
  }
  function mobileNavOpen(){
    return window.matchMedia?.('(max-width:700px)').matches;
  }
  function mobilePopover(){
    let popover=byId('mobile-nav-popover');
    if(!popover){
      popover=document.createElement('div');
      popover.id='mobile-nav-popover';
      popover.className='mobile-nav-popover';
      document.body.appendChild(popover);
    }
    return popover;
  }
  function showMobilePopover(group,button){
    const menu=group.querySelector('.nav-menu');
    const popover=mobilePopover();
    const nav=byId('nav');
    const navBottom=Math.round(nav?.getBoundingClientRect().bottom||96);
    popover.style.top=`${navBottom+6}px`;
    popover.innerHTML=`<div class="mobile-nav-title">${button.textContent}</div>${menu?.innerHTML||''}`;
    popover.classList.add('open');
  }
  function markActive(page){
    document.querySelectorAll('#nav .nb').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===page));
  }
  window.toggleNavGroup=button=>{
    const group=button.closest('.nav-group');
    const willOpen=!group?.classList.contains('open');
    document.querySelectorAll('.nav-group').forEach(el=>el.classList.remove('open'));
    mobilePopover().classList.remove('open');
    if(!group||!willOpen)return;
    group.classList.add('open');
    if(mobileNavOpen())showMobilePopover(group,button);
  };
  window.closeNavMenus=()=>{
    document.querySelectorAll('.nav-group').forEach(el=>el.classList.remove('open'));
    byId('mobile-nav-popover')?.classList.remove('open');
  };
  window.goMenuPage=page=>{closeNavMenus();goPage(page);markActive(page);};
  window.openTransferTab=tab=>{goMenuPage('transfer');swTab('tr',tab);};
  window.SuperkickNavigation={rebuild,markActive};
})();
