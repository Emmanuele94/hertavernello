/* Admin icon editor: replaces existing PNG assets, no new JSON schema. */
(() => {
  const catalogue = [
    ['Logo della lega','assets/logo.png',true],
    ['Quiz in alto','assets/icone/icon-quiz.png',true],
    ['Navigazione · Home','assets/icone/icon-house.png',true],
    ['Navigazione · Squadre','assets/icone/icon-teams.png',true],
    ['Navigazione · Archivio','assets/icone/icon-archivio.png',true],
    ['Navigazione · Regolamento','assets/icone/icon-regolamento.png',true],
    ['Navigazione · Esci','assets/icone/icon-exit.png',true],
    ['Chi gioca contro chi','assets/icone/icon-vs.png',false],
    ['Highlights della settimana','assets/icone/icon-highlights_home.png',false],
    ['Classifica della lega','assets/icone/icon-classificaDellaLega.png',false],
    ['Classifica previsioni','assets/icone/icon-win-classifica-generale.png',false],
    ['Classifica Serie A','assets/icone/icon-serieA.png',false],
    ['Top marcatori','assets/icone/icon-player.png',false],
  ];
  if (document.querySelector('.home-3col')) {
    const showShortcut = () => {
      if(window.hv_role!=='admin'||document.querySelector('.pv-icons-shortcut'))return;
      const link=document.createElement('a');link.className='pv-icons-shortcut';
      link.href='admin.html#pv-admin-icons';link.textContent='Personalizza le icone della Home';
      document.querySelector('.pv-intro')?.append(link);
    };
    document.addEventListener('hv:unlocked',showShortcut);
    const homeApp=document.getElementById('app');
    if(homeApp)new MutationObserver(showShortcut).observe(homeApp,{attributes:true,attributeFilter:['class']});
    showShortcut();
  }
  if (!document.querySelector('.admin-wrap')) return;
  let mounted = false;
  const make = (tag, cls, text) => {const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el;};
  async function toPNG(file) {
    if (!file || file.size>5*1024*1024) throw new Error('Scegli un’immagine fino a 5 MB.');
    if (!/\.(png|jpe?g|webp|svg)$/i.test(file.name)) throw new Error('Usa PNG, JPG, WebP o SVG.');
    const url=URL.createObjectURL(file);const img=new Image();
    try {
      img.src=url;await img.decode();
      if (!img.naturalWidth || img.naturalWidth*img.naturalHeight>25000000) throw new Error('L’immagine è troppo grande: usa un’icona con meno di 25 megapixel.');
      const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
      const ctx=canvas.getContext('2d');const scale=Math.min(512/img.naturalWidth,512/img.naturalHeight);
      const w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(512-w)/2,(512-h)/2,w,h);
      return canvas.toDataURL('image/png');
    } catch (error) {throw new Error(error.message.includes('megapixel')?error.message:'Impossibile leggere l’immagine. Prova un PNG o un SVG senza risorse esterne.');}
    finally {URL.revokeObjectURL(url);}
  }
  function mount() {
    if (window.hv_role!=='admin' || mounted) return;
    mounted=true;
    const panel=make('section','admin-box');panel.id='pv-admin-icons';
    panel.append(make('h2','','10. Icone della Home'),make('p','pv-icons-help','Scegli un’immagine, controlla l’anteprima e salvala. Le proporzioni e la trasparenza vengono mantenute: ogni icona viene adattata a un PNG di 512 × 512.'));
    panel.append(make('p','pv-icons-help','Le icone di navigazione e il logo sono condivisi: aggiornarli cambia anche le altre pagine che li utilizzano. Puoi scaricare il PNG senza pubblicare nulla.'));
    const grid=make('div','pv-icons-grid');panel.append(grid);
    for (const [label,asset,shared] of catalogue) {
      const row=make('article','pv-icon-editor');row.dataset.iconAsset=asset;
      const title=make('h3','',label),image=make('img');image.src=asset;image.alt=label;
      const input=make('input');input.type='file';input.accept='.png,.jpg,.jpeg,.webp,.svg';input.setAttribute('aria-label','Nuova icona: '+label);
      const actions=make('div','pv-icon-actions');
      const save=make('button','','Salva su GitHub'),download=make('button','pv-icon-download','Scarica PNG'),reset=make('button','pv-icon-download','Annulla scelta');
      for(const b of [save,download,reset]){b.type='button';b.disabled=true;actions.append(b);}
      const status=make('p','pv-icon-status');status.setAttribute('role','status');
      row.append(title,make('p','pv-icon-shared',shared?'Condivisa con le altre pagine':'Icona della sezione Home'),image,input,actions,status);grid.append(row);
      let png=null,sequence=0,busy=false,savedURL=asset;
      const message=(s,error=false)=>{status.textContent=s;status.classList.toggle('pv-icon-error',error);};
      const update=()=>{save.disabled=download.disabled=reset.disabled=!png||busy;input.disabled=busy;};
      input.addEventListener('change',async()=>{
        const seq=++sequence;png=null;image.src=savedURL;update();if(!input.files[0])return;
        message('Preparo l’anteprima…');
        try {const converted=await toPNG(input.files[0]);if(seq!==sequence)return;png=converted;image.src=png;message('Anteprima pronta. Non ancora salvata.');}
        catch(e){if(seq===sequence)message(e.message,true);}finally{if(seq===sequence)update();}
      });
      reset.addEventListener('click',()=>{sequence++;png=null;input.value='';image.src=savedURL;message('Scelta annullata.');update();});
      download.addEventListener('click',()=>{if(!png)return;const a=make('a');a.href=png;a.download=asset.split('/').pop();a.click();});
      save.addEventListener('click',async()=>{
        if(!png||busy||window.hv_role!=='admin')return;
        busy=true;update();message('Controllo la destinazione…');
        try {
          const res=await fetch('data/config.json',{cache:'no-store'});if(!res.ok)throw new Error('Non riesco a leggere la configurazione.');
          const config=await res.json();const {githubOwner:owner,githubRepo:repo}=config.lega;
          if(!owner||!repo)throw new Error('Configura la repository di destinazione prima di salvare.');
          const token=hv_getGithubToken();if(!token)throw new Error('Salvataggio annullato: token non inserito.');
          const existing=await hv_ghGetFile(owner,repo,asset,token);
          message('Salvataggio dell’icona…');
          await hv_ghPutFile(owner,repo,asset,token,png.split(',')[1],'Aggiorna icona Home: '+label,existing?.sha,'main',seconds=>message('Attendo il turno di salvataggio: '+seconds+' s.'));
          savedURL=png;png=null;input.value='';
          message('Icona salvata. Sarà visibile dopo l’aggiornamento del sito; ricarica la Home tra circa un minuto.');
        } catch(e) {message(e.message,true);} finally {busy=false;update();}
      });
    }
    document.querySelector('.admin-wrap').append(panel);
    const nav=document.querySelector('.pv-admin-nav');if(nav){const link=make('a','','10. Icone della Home');link.href='#pv-admin-icons';nav.append(link);}
    if(location.hash==='#pv-admin-icons')requestAnimationFrame(()=>panel.scrollIntoView({block:'start'}));
  }
  document.addEventListener('hv:unlocked',mount);
  // Other initializers set the saved role asynchronously; observe app visibility.
  const app=document.getElementById('app');
  if(app)new MutationObserver(mount).observe(app,{attributes:true,attributeFilter:['class']});
  mount();
})();
