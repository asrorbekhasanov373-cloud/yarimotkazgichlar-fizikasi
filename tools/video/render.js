// Sayt animatsiyalaridan MP4 video tayyorlash (virtual vaqt, kadrma-kadr)
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const FPS=30,BASE='http://localhost:8765/';
const SITE='asrorbekhasanov373-cloud.github.io/yarimotkazgichlar-fizikasi';

const INIT=`(()=>{window.__vt=0;window.__cbs=[];
  window.requestAnimationFrame=cb=>{window.__cbs.push(cb);return window.__cbs.length;};
  performance.now=()=>window.__vt;
  window.__step=ms=>{window.__vt+=ms;const c=window.__cbs;window.__cbs=[];c.forEach(f=>{try{f(window.__vt)}catch(e){console.error(e)}});};
  window.__ease=(a,b,p)=>{p=Math.max(0,Math.min(1,p));const e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;return a+(b-a)*e;};
})();`;

const CSS=`
nav.bar,footer,article>header,article>p,article>h2,article>h3,article>aside,article>ol,article>details,article>table,figure{display:none!important}
html,body{overflow:hidden!important}
figure.vshow{display:block!important;position:fixed;left:50%;top:98px;transform:translateX(-50%);margin:0!important}
figure.vshow figcaption,figure.vshow .btns{display:none!important}
#vhead{position:fixed;left:64px;top:26px;right:64px;display:flex;justify-content:space-between;align-items:baseline;font:600 13px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}
#vhead span:last-child{color:var(--muted);letter-spacing:.04em;text-transform:none;font-weight:500}
#vtitle{position:fixed;left:64px;top:46px;font:700 30px/1.15 "Source Serif 4",serif;color:var(--ink)}
#vcap{position:fixed;left:50%;transform:translateX(-50%);bottom:26px;width:1080px;text-align:center;font:400 25px/1.4 "Source Serif 4",serif;color:var(--ink)}
#vcard{position:fixed;inset:0;background:var(--paper);display:flex;flex-direction:column;justify-content:center;padding:0 140px;z-index:10}
#vcard .k{font:600 15px/1 Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin-bottom:22px}
#vcard .t{font:700 58px/1.1 "Source Serif 4",serif;color:var(--ink);margin-bottom:18px;letter-spacing:-.01em}
#vcard .d{font:italic 400 26px/1.45 "Source Serif 4",serif;color:var(--ink2);max-width:900px}
#vcard .r{width:0;height:3px;background:var(--accent);margin:28px 0 0}
#vfade{position:fixed;inset:0;background:var(--paper);pointer-events:none;z-index:20;opacity:0}
#vprog{position:fixed;left:0;bottom:0;height:3px;background:var(--accent);z-index:30;opacity:.85}
figure.vshow{transform-origin:50% 40%}
`;

// Har bir video uchun o'tish uslubi (nom bo'yicha): fade, slide, zoom, rise
function variantOf(name){let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;return ['fade','slide','zoom','rise'][h%4];}
async function render(video,outFile){
  const VAR=video.variant||variantOf(outFile);
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1.5,colorScheme:'light'});
  const pg=await ctx.newPage();
  pg.on('pageerror',e=>console.error('pageerror',e.message));
  await pg.addInitScript(INIT);
  await pg.goto(BASE+video.url,{waitUntil:'networkidle'});
  await pg.evaluate(()=>document.fonts.ready);
  await pg.evaluate(([css,kick,title])=>{
    const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    const h=document.createElement('div');h.id='vhead';h.innerHTML=`<span>${kick}</span><span>Yarimoʻtkazgichlar fizikasi asoslari</span>`;document.body.appendChild(h);
    const t=document.createElement('div');t.id='vtitle';t.textContent=title;document.body.appendChild(t);
    const c=document.createElement('div');c.id='vcap';document.body.appendChild(c);
    const k=document.createElement('div');k.id='vcard';document.body.appendChild(k);
    for(const id of ['vfade','vprog']){const d=document.createElement('div');d.id=id;document.body.appendChild(d);}
  },[CSS,video.kicker,video.title]);
  if(video.setup)await pg.evaluate(video.setup);
  for(let i=0;i<10;i++)await pg.evaluate('__step(33.33)');
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-',
    '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-r',String(FPS),outFile]);
  ff.stderr.on('data',d=>process.stderr.write(d));
  const done=new Promise(r=>ff.on('close',r));
  let frames=0;const segs=video.segs,total=segs.reduce((a,x)=>a+Math.round(x.dur*FPS),0);
  const key=x=>x.card?'card:'+x.card.t:'fig:'+x.fig;
  // bir xil rasm davom etadigan "run" lar
  const runs=[];segs.forEach((x,i)=>{if(i&&key(segs[i-1])===key(x))runs[runs.length-1].push(i);else runs.push([i]);});
  const runOf=i=>runs.find(r=>r.includes(i));
  const events=[],starts=[];let tcur=0;
  for(let si=0;si<segs.length;si++){const seg=segs[si];
    const r=runOf(si),runStart=r[0]===si,runEnd=r[r.length-1]===si;
    const runDur=r.reduce((a,j)=>a+segs[j].dur,0),runOff=r.slice(0,r.indexOf(si)).reduce((a,j)=>a+segs[j].dur,0);
    if(runStart)events.push({t:tcur,type:seg.card?'card':'cut'});
    starts.push({t:tcur,lead:seg.lead||0.5});
    const n=Math.round(seg.dur*FPS);
    await pg.evaluate(([seg])=>{
      document.querySelectorAll('figure').forEach(f=>f.classList.remove('vshow'));
      const card=document.getElementById('vcard');
      if(seg.card){card.style.display='flex';card.innerHTML=`<div class="k">${seg.card.k}</div><div class="t">${seg.card.t}</div><div class="d">${seg.card.d||''}</div><div class="r"></div>`;}
      else{card.style.display='none';const f=document.getElementById(seg.fig).closest('figure');f.classList.add('vshow');f.style.width=seg.w+'px';}
      const cap=document.getElementById('vcap');if(cap.dataset.t!==(seg.cap||'')){cap.dataset.t=seg.cap||'';cap.innerHTML=seg.cap||'';cap.dataset.fresh='1';}else cap.dataset.fresh='0';
      window.dispatchEvent(new Event('resize'));
    },[{card:seg.card,fig:seg.fig,w:seg.w||900,cap:seg.cap}]);
    if(seg.start)await pg.evaluate(seg.start);
    for(let i=0;i<n;i++){
      const p=n>1?i/(n-1):1,tt=i/FPS,rt=runOff+tt;
      const eo=x=>1-Math.pow(1-Math.max(0,Math.min(1,x)),3);
      const fadeIn=runStart&&si>0?Math.max(0,1-tt/0.35):0,fadeOut=runEnd&&si<segs.length-1?Math.max(0,1-(seg.dur-tt)/0.22):0;
      const ein=eo(rt/0.7);
      const sc=(VAR==='zoom'?0.88+0.12*ein:0.965+0.035*ein)*(1+0.03*rt/runDur);
      const dx=VAR==='slide'?70*(1-ein):0,dy=VAR==='rise'?40*(1-ein):0;
      const fx={fade:Math.max(fadeIn,fadeOut)*(VAR==='fade'?1:0.75),sc,dx,dy,cap:eo(tt/0.5),prog:(frames+1)/total,
        k:eo((rt-0.15)/0.6),t:eo((rt-0.35)/0.7),d:eo((rt-0.8)/0.7),r:eo((rt-1.1)/0.8)};
      await pg.evaluate(`(()=>{const p=${p};${seg.act||''};__step(${1000/FPS});const fx=${JSON.stringify(fx)};
        const cap=document.getElementById('vcap');const fr=cap.dataset.fresh==='1';
        cap.style.opacity=fr?fx.cap:1;cap.style.transform='translateX(-50%) translateY('+(fr?16*(1-fx.cap):0)+'px)';
        const f=document.querySelector('figure.vshow');if(f)f.style.transform='translateX(calc(-50% + '+fx.dx+'px)) translateY('+fx.dy+'px) scale('+fx.sc+')';
        const card=document.getElementById('vcard');
        if(card.style.display!=='none'){const q=s=>card.querySelector(s);
          q('.k').style.opacity=fx.k;q('.k').style.transform='translateY('+(12*(1-fx.k))+'px)';
          q('.t').style.opacity=fx.t;q('.t').style.transform='translateY('+(26*(1-fx.t))+'px)';
          q('.d').style.opacity=fx.d;q('.d').style.transform='translateY('+(14*(1-fx.d))+'px)';
          q('.r').style.width=(120*fx.r)+'px';}
        document.getElementById('vfade').style.opacity=fx.fade;
        document.getElementById('vprog').style.width=(fx.prog*100)+'%';})()`);
      const buf=await pg.screenshot({type:'jpeg',quality:94});
      ff.stdin.write(buf);frames++;
    }
    tcur+=n/FPS;
  }
  require('fs').writeFileSync(outFile.replace(/\.mp4$/,'.json'),JSON.stringify({dur:frames/FPS,events,starts}));
  ff.stdin.end();await done;await b.close();
  console.log(outFile,frames,'kadr',(frames/FPS).toFixed(1)+' s');
}

const END={card:{k:'',t:'Yarimoʻtkazgichlar fizikasi asoslari',d:'A. Hasanov'},dur:5};
const VIDEOS={
 pn1:{url:'sim/pn-otish/',kicker:'7-bob',title:'p-n oʻtish qanday hosil boʻladi',segs:[
  {card:{k:'Yarimoʻtkazgichlar fizikasi asoslari · 7-bob',t:'p-n oʻtish qanday hosil boʻladi',d:'Kambagʻallashgan soha, ionlar va ichki elektr maydon'},dur:4.5},
  {fig:'f1',w:1150,dur:6,cap:'Chapda p-tur kremniy: harakatchan <b style="color:var(--hole)">kovaklar</b> va qoʻzgʻalmas manfiy ionlar (kvadratchalar).'},
  {fig:'f1',w:1150,dur:5,cap:'Oʻngda n-tur kremniy: harakatchan <b style="color:var(--elec)">elektronlar</b> va qoʻzgʻalmas musbat ionlar.'},
  {fig:'f1',w:1150,dur:6.5,start:"document.getElementById('join').click()",cap:'Boʻlaklar tekkanda elektronlar va kovaklar chegarada uchrashib, rekombinatsiyalanadi.'},
  {fig:'f1',w:1150,dur:6,cap:'Ortda faqat qoʻzgʻalmas ionlar qoladi. Bu qatlam <i>kambagʻallashgan soha</i> deyiladi.'},
  {fig:'f2',w:660,dur:7,start:"S.set('Na',17);S.set('Nd',16)",cap:'Ochilgan ionlar elektr maydon hosil qiladi. Bu maydon diffuziyani toʻxtatib turadi.'},
  {fig:'f2',w:660,dur:7,act:"S.set('Nd',__ease(16,15,p))",cap:'n-soha kuchsizroq legirlansa, kambagʻallashgan soha asosan shu tomonga yoyiladi.'},
  {fig:'f2',w:660,dur:6,act:"S.set('Nd',__ease(15,16,p))",cap:'Musbat va manfiy zaryadlar miqdori doim teng: N<sub>a</sub>x<sub>p</sub> = N<sub>d</sub>x<sub>n</sub>.'},
  END]},
 pn2:{url:'sim/pn-otish/',kicker:'7–8-bob',title:'Diod: toʻgʻri va teskari ulanish',setup:"S.set('V',0)",segs:[
  {card:{k:'Yarimoʻtkazgichlar fizikasi asoslari · 7–8-bob',t:'Diod: toʻgʻri va teskari ulanish',d:'Nima uchun diod tokni faqat bir yoʻnalishda oʻtkazadi'},dur:4.5},
  {fig:'f3',w:860,dur:6,cap:'Muvozanatda elektronlar oldida 0,78 eV balandlikdagi toʻsiq bor. Koʻpchiligi orqaga qaytadi.'},
  {fig:'f3',w:860,dur:6,act:"S.set('V',__ease(0,0.6,p))",cap:'Toʻgʻri kuchlanish berilganda toʻsiq pasayadi.'},
  {fig:'f3',w:860,dur:6,cap:'Endi elektronlar va kovaklar toʻsiqdan oshib oʻta boshlaydi.'},
  {fig:'f3',w:860,dur:7,act:"S.set('V',__ease(0.6,-6,p))",cap:'Teskari kuchlanishda toʻsiq koʻtariladi va kambagʻallashgan soha kengayadi.'},
  {fig:'f4',w:1180,dur:5,start:"S.set('V',0)",cap:'Endi diodni batareyaga ulaymiz. Oʻngda uning volt-amper xarakteristikasi.'},
  {fig:'f4',w:1180,dur:7,act:"S.set('V',__ease(0,0.62,p))",cap:'Toʻgʻri ulanishda zarrachalar toʻsiqdan oʻtib, rekombinatsiyalanadi: zanjirda tok oqadi.'},
  {fig:'f4',w:1180,dur:5,cap:'Sariq chaqnashlar — elektron va kovakning uchrashishi (rekombinatsiya).'},
  {fig:'f4',w:1180,dur:8,act:"S.set('V',__ease(0.62,-5,p))",cap:'Teskari ulanishda tok deyarli oqmaydi: faqat kam sonli juftlarni maydon olib ketadi.'},
  END]},
 fermi:{url:'sim/fermi-sathi/',kicker:'4-bob',title:'Fermi sathi va harorat',setup:"S.set('T0',30);S.set('T',40);S.set('N',16);S.set('type','n')",segs:[
  {card:{k:'Yarimoʻtkazgichlar fizikasi asoslari · 4-bob',t:'Fermi sathi va harorat',d:'Kremniyda erkin elektronlar qayerdan paydo boʻladi'},dur:4.5},
  {fig:'f1',w:760,dur:5,cap:'Toza kremniy. Past haroratda barcha elektronlar kovalent bogʻlarda band.'},
  {fig:'f1',w:760,dur:9,act:"S.set('T0',Math.round(__ease(30,700,p)))",cap:'Qizdirganda bogʻlar uziladi: <b style="color:var(--elec)">elektron</b> va <b style="color:var(--hole)">kovak</b> juftlari paydo boʻladi.'},
  {fig:'f2',w:720,dur:5,cap:'Fosfor qoʻshamiz. Past haroratda ortiqcha elektron donor atrofida aylanib yuradi.'},
  {fig:'f2',w:720,dur:8,act:"S.set('T',Math.round(__ease(40,300,p)))",cap:'Harorat oshganda donorlar ionlanadi va elektronlar erkin boʻladi.'},
  {fig:'f3',w:860,dur:5,cap:'Zona diagrammasida Fermi sathi oʻtkazuvchanlik zonasiga yaqin joylashgan.'},
  {fig:'f3',w:860,dur:8,act:"S.set('T',Math.round(__ease(300,700,p)))",cap:'Juda yuqori haroratda juftlar koʻpayib ketadi va Fermi sathi zona oʻrtasiga qaytadi.'},
  {fig:'f4',w:960,dur:9,act:"S.set('T',Math.round(__ease(30,700,p)))",cap:'Uchta soha: muzlash, kirishma sohasi va xususiy soha.'},
  END]},
 kristall:{url:'sim/kristall/',kicker:'1-bob',title:'Kristall panjaralar',segs:[
  {card:{k:'Yarimoʻtkazgichlar fizikasi asoslari · 1-bob',t:'Kristall panjaralar',d:'Kubik panjaralar, olmos va sfalerit tuzilishlari'},dur:4.5},
  {fig:'cv',w:820,dur:6,start:"document.querySelector('#struct [data-v=ok]').click()",cap:'Oddiy kubik panjara: yacheykada 1 ta atom, har bir atomning 6 ta qoʻshnisi bor.'},
  {fig:'cv',w:820,dur:6,start:"document.querySelector('#struct [data-v=hmk]').click()",cap:'Hajmiy markazlashgan kubik (HMK): 2 ta atom, 8 ta qoʻshni.'},
  {fig:'cv',w:820,dur:6,start:"document.querySelector('#struct [data-v=ymk]').click()",cap:'Yoqlari markazlashgan kubik (YMK): 4 ta atom, 12 ta qoʻshni — eng zich joylashish.'},
  {fig:'cv',w:820,dur:8,start:"document.querySelector('#struct [data-v=olmos]').click()",cap:'Olmos tuzilishi (kremniy, germaniy): 8 ta atom, har biri 4 ta qoʻshnisi bilan tetraedr hosil qiladi.'},
  {fig:'cv',w:820,dur:7,start:"document.querySelector('#cells [data-v=\"2\"]').click()",cap:'Kristall shu yacheykaning uch yoʻnalishda takrorlanishidan iborat.'},
  {fig:'cv',w:820,dur:7,start:"document.querySelector('#cells [data-v=\"1\"]').click();document.querySelector('#struct [data-v=sfalerit]').click()",cap:'Sfalerit (GaAs): xuddi shu tuzilish, lekin ikki xil atom — Ga va As — navbatlashib joylashadi.'},
  END]},
};
(async()=>{const name=process.argv[2],out=process.argv[3];
  const VO=JSON.parse(require('fs').readFileSync(process.env.VOICE_JSON||(__dirname+'/voice.json'),'utf8'))[name];
  let v=VIDEOS[name];
  if(!v){ // tashqi sahna fayli: scenes/<name>.json  {url,kicker,title,card:{k,t,d},segs:[...]}
    const sc=JSON.parse(require('fs').readFileSync(__dirname+'/scenes/'+name+'.json','utf8'));
    v={url:sc.url,kicker:sc.kicker,title:sc.title,setup:sc.setup,segs:[{card:sc.card,dur:4.5},...sc.segs,END]};}
  v.segs=v.segs.map((sg,i)=>{const lead=sg.card?0.6:0.5;const need=VO&&VO[i]?lead+VO[i].dur+0.5:0;return {...sg,dur:Math.max(sg.dur,need),lead};});
  await render(v,out);})();
