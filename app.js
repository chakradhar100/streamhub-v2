
let API=null;
fetch('api.json').then(r=>r.json()).then(d=>{API=d;load();});

const heroTitle=document.getElementById('heroTitle');
const heroDesc=document.getElementById('heroDesc');
const heroPoster=document.getElementById('heroPoster');
const heroPlay=document.getElementById('heroPlay');
const rowsEl=document.getElementById('rows');
const cont=document.getElementById('continueRow');

const modal=document.getElementById('playerModal');
const player=document.getElementById('player');
const closePlayer=document.getElementById('closePlayer');

function load(){
 const f=API.featured;
 heroTitle.innerText=f.title;
 heroDesc.innerText=f.desc;
 heroPoster.src=f.poster;
 heroPlay.onclick=()=>open(f.video);
 renderRows(API.rows);
}

function renderRows(rows){
 rowsEl.innerHTML='';
 rows.forEach(row=>{
   const t=document.createElement('div');
   t.className='section-title';
   t.innerText=row.title;

   const r=document.createElement('div');
   r.className='video-row';

   row.items.forEach(v=>{
     const c=document.createElement('div');
     c.className='card';
     c.innerHTML=`<img src="${v.poster}"><div class='meta'><strong>${v.title}</strong></div>`;
     c.onclick=()=>open(v.video);
     r.appendChild(c);
   });

   rowsEl.appendChild(t);
   rowsEl.appendChild(r);
 });
}

function open(src){
 modal.style.display='flex';
 player.src=src;
 player.play();
}
closePlayer.onclick=()=>{
 modal.style.display='none';
 player.pause();
 player.src='';
};
