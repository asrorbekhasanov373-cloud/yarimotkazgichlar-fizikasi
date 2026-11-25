// Umumiy yordamchi funksiyalar
const SUP={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
function sup(s){return String(s).split('').map(c=>SUP[c]||c).join('');}
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
function fmtN(x,d=2){return x.toFixed(d).replace('.',',').replace('-','−');}
// Fonli yozuv (chiziqlar ustida o'qilishi uchun)
function labelBg(c,text,x,y,align){c.save();c.textAlign=align||'left';const w=c.measureText(text).width,x0=align==='right'?x-w:align==='center'?x-w/2:x;
  c.fillStyle=cssVar('--card');c.globalAlpha=.85;c.fillRect(x0-3,y-9,w+6,18);c.restore();c.textAlign=align||'left';c.fillText(text,x,y);}
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
// Retina uchun canvas o'lchami
function fitCanvas(cv,aspect){
  const dpr=window.devicePixelRatio||1,w=cv.clientWidth,h=Math.round(w*aspect);
  cv.style.height=h+'px';cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);return {c,w,h};
}
function segGroup(el,onChange){
  el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    el.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));onChange(b.dataset.v);});
}
const mq=window.matchMedia('(prefers-color-scheme: dark)');
function onTheme(f){mq.addEventListener?mq.addEventListener('change',f):mq.addListener(f);}
