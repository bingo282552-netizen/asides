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
  function markActive(page){
    document.querySelectorAll('#nav .nb').forEach(btn=>btn.classList.toggle('active',btn.dataset.page===page));
  }
  window.toggleNavGroup=button=>{
    const group=button.closest('.nav-group');
    document.querySelectorAll('.nav-group').forEach(el=>{if(el!==group)el.classList.remove('open');});
    group?.classList.toggle('open');
  };
  window.closeNavMenus=()=>document.querySelectorAll('.nav-group').forEach(el=>el.classList.remove('open'));
  window.goMenuPage=page=>{closeNavMenus();goPage(page);markActive(page);};
  window.openTransferTab=tab=>{goMenuPage('transfer');swTab('tr',tab);};
  window.SuperkickNavigation={rebuild,markActive};
})();
