// ══════════════════════════════════
//  MENU EDITOR
// ══════════════════════════════════
let admCat='p';
function openEditor(){renderAdmTabs();renderAdmList();openModal('modal-editor');}
function renderAdmTabs(){
  document.getElementById('adm-tabs').innerHTML=['p','s','dw','cz','d'].map(c=>`<div class="adm-tab${c===admCat?' active':''}" onclick="setAdmCat('${c}')">${CATLABELS[c]}</div>`).join('');
}
function setAdmCat(c){admCat=c;renderAdmTabs();renderAdmList();}
function renderAdmList(){
  document.getElementById('adm-list').innerHTML=menu.filter(m=>m.cat===admCat).map(i=>`
    <div class="adm-item-row">
      <div class="adm-img" onclick="openEditItem(${i.id})">${i.img?`<img src="${i.img}" alt="" onerror="this.style.display='none'">`:'📷'}</div>
      <div class="adm-info"><div class="adm-name">${i.n}</div><div class="adm-price">R$ ${fmtPrice(i.p)}</div></div>
      <button class="adm-edit-btn" onclick="openEditItem(${i.id})">EDITAR</button>
    </div>`).join('');
}
function openEditItem(id){
  editId=id;const it=menu.find(m=>m.id===id);if(!it)return;
  adminImg=it.img||null;
  document.getElementById('item-edit-title').innerText='EDITAR: '+it.n;
  document.getElementById('item-name').value=it.n;
  document.getElementById('item-desc').value=it.d;
  document.getElementById('item-price').value=it.p;
  document.getElementById('item-cat').value=it.cat;
  document.getElementById('adm-img-file').value='';
  document.getElementById('del-item-btn').style.display='block';
  updateImgPreview(it.img||null);
  openModal('modal-item-edit');
}
function _nextMenuId(){
  // retorna o próximo ID sequencial baseado no maior ID atual do menu
  const maxId=menu.reduce((m,i)=>Math.max(m,Number(i.id)||0),0);
  return maxId+1;
}
async function publicarNovidadesCardapio(automatico){
  const novidades=DEFAULT_MENU.filter(i=>[45].includes(i.id));
  const jaTem=novidades.every(i=>menu.some(m=>m.n===i.n));
  if(jaTem) return; // já publicado, não faz nada (silencioso)
  if(!automatico && !confirm('Isso vai publicar a pizza Baiana no cardápio ao vivo (site + bot do WhatsApp), sem mexer em nenhum item que já existe. Continuar?'))return;
  _initFB();
  if(!FS){ if(!automatico) alert('Sem conexão com o banco agora. Tente de novo em instantes.'); return; }
  for(const i of novidades){
    if(!menu.some(m=>m.n===i.n)) menu.push({...i});
    await su('menu_items',{id:String(i.id),slug_id:i.id,name:i.n,description:i.d,price:i.p,category:i.cat,img_url:i.img||null,active:true},'slug_id');
  }
  DB.set('menu_custom',menu);
  renderMenu();
  if(!automatico) alert('Pronto! A Baiana já está no cardápio, no site e no bot do WhatsApp.');
}
async function restaurarCardapioPadrao(){
  if(!confirm('Restaurar TODO o cardápio para o padrão original? Fotos e alterações serão perdidas.'))return;
  menu=[...DEFAULT_MENU];
  DB.set('menu_custom',menu);
  // limpa no Firebase
  _initFB();
  if(FS){
    const snap=await FS.collection('menu_items').get();
    const batch=FS.batch();
    snap.docs.forEach(d=>batch.delete(d.ref));
    await batch.commit().catch(()=>{});
    for(const i of menu)await su('menu_items',{id:String(i.id),slug_id:i.id,name:i.n,description:i.d,price:i.p,category:i.cat,img_url:null,active:true},'slug_id');
  }
  renderMenu();renderAdmList();
  alert('✅ Cardápio restaurado ao padrão!');
}

async function restaurarItemPadrao(){
  if(editId===null)return;
  const orig=DEFAULT_MENU.find(m=>m.id===editId);
  if(!orig){alert('Este item não existe no cardápio padrão.');return;}
  if(!confirm(`Restaurar "${orig.n}" ao padrão original?`))return;
  const idx=menu.findIndex(m=>m.id===editId);
  if(idx!==-1)menu[idx]={...orig};
  try{
    await saveMenuDB();
    closeModal('modal-item-edit');
    renderMenu();renderAdmList();
  }catch(e){
    console.error('Erro ao restaurar item:',e);
    alert('Não foi possível restaurar agora (sem conexão com o banco?). Tente de novo.');
  }
}

function openAddItem(){
  editId=null;adminImg=null;
  document.getElementById('item-edit-title').innerText='NOVO ITEM';
  document.getElementById('item-name').value='';
  document.getElementById('item-desc').value='';
  document.getElementById('item-price').value='';
  document.getElementById('item-cat').value=admCat;
  document.getElementById('del-item-btn').style.display='none';
  document.getElementById('adm-img-file').value='';
  updateImgPreview(null);openModal('modal-item-edit');
}
function updateImgPreview(url){
  const lbl=document.getElementById('img-upload-lbl');
  const ph=document.getElementById('img-ph');
  const rmBtn=document.getElementById('adm-rm-img-btn');
  const prev=lbl.querySelector('img');if(prev)prev.remove();
  if(url){
    ph.style.display='none';
    const img=document.createElement('img');img.src=url;lbl.appendChild(img);
    if(rmBtn)rmBtn.style.display='block';
  } else {
    ph.style.display='';
    if(rmBtn)rmBtn.style.display='none';
  }
}
function removeItemImg(){
  adminImg=null;
  updateImgPreview(null);
  document.getElementById('adm-img-file').value='';
}
function handleImgFile(input){
  const f=input.files[0];if(!f)return;
  const lbl=document.getElementById('img-upload-lbl');
  if(lbl) lbl.style.opacity='.5';
  const r=new FileReader();
  r.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      // redimensiona/comprime pra nunca estourar o limite de 1MB por registro no banco
      const MAX_LADO=900;
      let w=img.width,h=img.height;
      if(w>h && w>MAX_LADO){ h=Math.round(h*MAX_LADO/w); w=MAX_LADO; }
      else if(h>=w && h>MAX_LADO){ w=Math.round(w*MAX_LADO/h); h=MAX_LADO; }
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      let qualidade=0.82;
      let dataUrl=canvas.toDataURL('image/jpeg',qualidade);
      // se ainda assim ficar grande (foto muito detalhada), reduz a qualidade até caber com folga
      while(dataUrl.length>700000 && qualidade>0.35){
        qualidade-=0.12;
        dataUrl=canvas.toDataURL('image/jpeg',qualidade);
      }
      if(dataUrl.length>900000){
        alert('Essa imagem ainda ficou grande demais mesmo comprimida. Tenta uma foto mais simples ou já reduzida.');
        if(lbl) lbl.style.opacity='';
        return;
      }
      adminImg=dataUrl;
      updateImgPreview(adminImg);
      if(lbl) lbl.style.opacity='';
    };
    img.onerror=()=>{ alert('Não foi possível ler essa imagem.'); if(lbl) lbl.style.opacity=''; };
    img.src=e.target.result;
  };
  r.onerror=()=>{ alert('Não foi possível ler o arquivo.'); if(lbl) lbl.style.opacity=''; };
  r.readAsDataURL(f);
}
async function saveItem(){
  const name=document.getElementById('item-name').value.trim();
  const desc=document.getElementById('item-desc').value.trim();
  const price=parseFloat(document.getElementById('item-price').value);
  const cat=document.getElementById('item-cat').value;
  const img=adminImg||null;
  if(!name) return alert('Preencha o nome do item.');
  if(isNaN(price)||price<0) return alert('Preencha um preço válido (0 ou mais).');
  const btn=document.querySelector('#modal-item-edit .m-btn');
  if(btn){btn.disabled=true;btn.textContent='Salvando...';}
  try{
    if(editId!==null){
      const idx=menu.findIndex(m=>m.id===editId);
      if(idx!==-1)menu[idx]={...menu[idx],n:name,d:desc,p:price,cat,img};
    } else {
      menu.push({id:_nextMenuId(),n:name,d:desc,p:price,cat,img});
    }
    await saveMenuDB();
    closeModal('modal-item-edit');renderMenu();renderAdmList();
  }catch(e){
    console.error('Erro ao salvar item:',e);
    alert('Não foi possível salvar agora (sem conexão com o banco?). Nada foi publicado — verifique sua internet e tente de novo.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='SALVAR';}
  }
}
async function deleteItem(){
  if(!confirm('Remover item?'))return;
  const idRemovido=editId;
  const btn=document.getElementById('del-item-btn');
  if(btn){btn.disabled=true;btn.textContent='Removendo...';}
  try{
    _initFB();
    if(FS) await FS.collection('menu_items').doc(String(idRemovido)).delete();
    menu=menu.filter(m=>m.id!==idRemovido);
    DB.set('menu_custom',menu);
    closeModal('modal-item-edit');renderMenu();renderAdmList();
  }catch(e){
    console.error('Erro ao remover item:',e);
    alert('Não foi possível remover o item agora (sem conexão com o banco?). Nada foi apagado — tente de novo.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='🗑 REMOVER ITEM';}
  }
}
async function saveMenuDB(){
  DB.set('menu_custom',menu);
  _initFB();
  if(!FS) throw new Error('Sem conexão com o banco de dados.');
  for(const i of menu){
    await FS.collection('menu_items').doc(String(i.id)).set({
      id:String(i.id),slug_id:i.id,name:i.n,description:i.d,price:i.p,category:i.cat,img_url:i.img||null,active:true,
      updated_at:new Date().toISOString()
    },{merge:true});
  }
}

