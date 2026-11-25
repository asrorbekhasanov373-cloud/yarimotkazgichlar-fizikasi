// Umumiy yordamchi funksiyalar
const SUP={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
function sup(s){return String(s).split('').map(c=>SUP[c]||c).join('');}
function fmtN(x,d=2){return x.toFixed(d).replace('.',',').replace('-','−');}
// 1.23e16 -> "1,23 × 10¹⁶"
function fmtE(x,d=2){
  if(!isFinite(x))return '—';
  if(x===0)return '0';
  const e=Math.floor(Math.log10(Math.abs(x)));
  if(e>=-2&&e<=2)return fmtN(x,d);
  let ee=e,m=x/Math.pow(10,e);
  if(Math.abs(+m.toFixed(d))>=10){m/=10;ee++;}
  return fmtN(m,d)+' × 10'+sup(ee);
}
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// Canvas: kenglikka moslash, retina
function fitCanvas(cv,aspect,maxH){
  const dpr=Math.min(3,window.devicePixelRatio||1),w=cv.clientWidth;
  let h=Math.round(w*aspect); if(maxH)h=Math.min(h,maxH);
  if(cv._w!==w||cv._h!==h||cv._d!==dpr){cv.style.height=h+'px';cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv._w=w;cv._h=h;cv._d=dpr;}
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);return {c,w,h};
}
// Yozuv orqasida fon (chiziq ustida o'qilishi uchun)
function label(c,text,x,y,opt={}){
  c.save();c.font=opt.font||'500 12px Inter,system-ui,sans-serif';c.textAlign=opt.align||'left';c.textBaseline='middle';
  if(opt.bg){const w=c.measureText(text).width,x0=c.textAlign==='right'?x-w:c.textAlign==='center'?x-w/2:x;
    c.fillStyle=opt.bg;c.fillRect(x0-3,y-8,w+6,16);}
  c.fillStyle=opt.color||cssVar('--ink2');c.fillText(text,x,y);c.restore();
}
// Elektron (to'ldirilgan shar) va kovak (halqa)
function drawElectron(c,x,y,r=4.5,a=1){
  c.save();c.globalAlpha=a;const col=cssVar('--elec');
  const g=c.createRadialGradient(x-r*.35,y-r*.4,r*.15,x,y,r);g.addColorStop(0,'rgba(255,255,255,.85)');g.addColorStop(.35,col);g.addColorStop(1,col);
  c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,7);c.fill();c.restore();
}
function drawHole(c,x,y,r=4.3,a=1){
  c.save();c.globalAlpha=a;c.strokeStyle=cssVar('--hole');c.lineWidth=Math.max(1.6,r*0.42);
  c.fillStyle=cssVar('--paper');c.beginPath();c.arc(x,y,r,0,7);c.fill();c.stroke();c.restore();
}
function drawIon(c,x,y,sign,s=9,a=.85){
  c.save();const col=cssVar(sign>0?'--ion-n':'--ion-p');c.strokeStyle=col;c.lineWidth=1.3;c.globalAlpha=a;
  c.strokeRect(x-s/2,y-s/2,s,s);c.beginPath();c.moveTo(x-s*.28,y);c.lineTo(x+s*.28,y);
  if(sign>0){c.moveTo(x,y-s*.28);c.lineTo(x,y+s*.28);}c.stroke();c.restore();
}

// Holat ombori: bir nechta surgich bitta qiymatga bog'lanadi
function makeStore(init){
  const st={...init},subs=[];
  return {get:k=>st[k],all:()=>st,set(k,v){st[k]=v;subs.forEach(f=>f(k,v));},sub(f){subs.push(f);}};
}
function slider(host,store,o){
  const row=document.createElement('label');row.className='sl';
  row.innerHTML=`<span>${o.label}</span><input type="range" min="${o.min}" max="${o.max}" step="${o.step}"><output></output>`;
  const inp=row.querySelector('input'),out=row.querySelector('output');
  const show=()=>{inp.value=store.get(o.key);out.innerHTML=o.fmt(store.get(o.key));};
  inp.addEventListener('input',()=>store.set(o.key,+inp.value));
  store.sub(k=>{if(k===o.key||o.watch)show();});show();host.appendChild(row);return row;
}
function buttons(host,store,o){
  const box=document.createElement('div');box.className='btns';
  o.options.forEach(([v,t])=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.dataset.v=v;
    b.addEventListener('click',()=>store.set(o.key,typeof store.get(o.key)==='number'?+v:v));box.appendChild(b);});
  const show=()=>box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v)===String(store.get(o.key))));
  store.sub(k=>{if(k===o.key)show();});show();host.appendChild(box);return box;
}
// Faqat ekranda ko'rinib turgan rasmlarni chizish
function animate(items){
  const vis=new Map();
  const io=new IntersectionObserver(es=>es.forEach(e=>vis.set(e.target,e.isIntersecting)),{rootMargin:'100px'});
  items.forEach(it=>{io.observe(it.el);vis.set(it.el,true);});
  let last=performance.now();
  const loop=t=>{const dt=Math.min(50,t-last);last=t;items.forEach(it=>{if(vis.get(it.el))it.draw(dt);});requestAnimationFrame(loop);};
  requestAnimationFrame(loop);
}
const mq=window.matchMedia('(prefers-color-scheme: dark)');
function onTheme(f){mq.addEventListener?mq.addEventListener('change',f):mq.addListener(f);}
function segGroup(el,onChange){
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    el.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));onChange(b.dataset.v);});
}
