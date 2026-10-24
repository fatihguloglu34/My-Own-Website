(function(){
var d=document,r=d.documentElement,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
r.classList.add('js');
// name letters
var nm=d.getElementById('name'),i=0;
['Fatih','Güloğlu'].forEach(function(w){var s=d.createElement('span');s.className='w';s.setAttribute('aria-hidden','true');
w.split('').forEach(function(ch){var l=d.createElement('span');l.className='l';l.style.setProperty('--i',i++);l.textContent=ch===' '?'\u00a0':ch;s.appendChild(l)});nm.appendChild(s)});
// typing
var roles=['Yazılım geliştirici','Python ile veri otomasyonu','Veri mühendisliği yolunda'],t=d.getElementById('typed'),ri=0,ci=0,del=false;
function tick(){var w=roles[ri];if(rm){t.textContent=w;return}
t.textContent=w.slice(0,ci);
if(!del&&ci<w.length){ci++;setTimeout(tick,70)}else if(!del){del=true;setTimeout(tick,1500)}
else if(ci>0){ci--;setTimeout(tick,35)}else{del=false;ri=(ri+1)%roles.length;setTimeout(tick,300)}}
tick();
// marquee
var sk=['Python','C','JavaScript','SQL','PostgreSQL','Git','Linux','HTML','CSS','Excel otomasyonu'],h='';
for(var k=0;k<4;k++)sk.forEach(function(s){h+='<span>'+s+'</span>'});d.getElementById('mq').innerHTML=h;
// reveal
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
d.querySelectorAll('.rv').forEach(function(e){io.observe(e)});
// progress
var bar=d.getElementById('bar');addEventListener('scroll',function(){var m=r.scrollHeight-innerHeight;bar.style.width=(m>0?scrollY/m*100:0)+'%'},{passive:true});
// photo tilt
var ph=d.getElementById('ph'),fr=d.getElementById('fr');
if(!rm){ph.addEventListener('pointermove',function(e){var b=ph.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;fr.style.transform='rotateY('+x*14+'deg) rotateX('+(-y*14)+'deg)'});
ph.addEventListener('pointerleave',function(){fr.style.transform=''})}
// card glow
d.querySelectorAll('.proj').forEach(function(c){c.addEventListener('pointermove',function(e){var b=c.getBoundingClientRect();c.style.setProperty('--mx',e.clientX-b.left+'px');c.style.setProperty('--my',e.clientY-b.top+'px')})});
// demo
var raw=['KM 0+120 | kazı 3.2 m | destek A','KM 0+124 | kazı 2.8 m | destek B','KM 0+128 | kazı 3.0 m | destek A','KM 0+132 | kazı 3.4 m | destek C'];
d.getElementById('raw').innerHTML=raw.map(function(x){return x+'<br>'}).join('');
var tb=d.getElementById('tbl'),go=d.getElementById('go');
function reset(){tb.innerHTML='';}
go.addEventListener('click',function(){reset();var rows=[['KM','Kazı (m)','Destek']].concat(raw.map(function(x){var p=x.split(' | ');return[p[0].slice(3),p[1].slice(5,8),p[2].slice(7)]}));
rows.forEach(function(rw,n){var e=d.createElement('div');e.innerHTML=rw.map(function(c){return'<span>'+c+'</span>'}).join('');tb.appendChild(e);setTimeout(function(){e.classList.add('in')},rm?0:n*350)})});
// grid canvas
var c=d.getElementById('grid'),x=c.getContext('2d'),S=56,W,H,cells=new Map(),ln='#ccc';
function rs(){W=c.width=innerWidth;H=c.height=innerHeight}addEventListener('resize',rs);rs();
function draw(){ln=getComputedStyle(r).getPropertyValue('--line');x.clearRect(0,0,W,H);
cells.forEach(function(v,k){var p=k.split(',');x.fillStyle='rgba(242,183,5,'+v*.4+')';x.fillRect(p[0]*S,p[1]*S,S,S);v-=.014;v<=0?cells.delete(k):cells.set(k,v)});
x.strokeStyle=ln;x.lineWidth=1;x.beginPath();for(var a=0;a<=W;a+=S){x.moveTo(a+.5,0);x.lineTo(a+.5,H)}for(var b=0;b<=H;b+=S){x.moveTo(0,b+.5);x.lineTo(W,b+.5)}x.stroke();
if(!rm)requestAnimationFrame(draw)}
draw();
if(!rm)addEventListener('pointermove',function(e){cells.set(Math.floor(e.clientX/S)+','+Math.floor(e.clientY/S),1)});
// theme
d.getElementById('tg').addEventListener('click',function(){var a=r.getAttribute('data-theme'),dk=a?a==='dark':matchMedia('(prefers-color-scheme: dark)').matches;r.setAttribute('data-theme',dk?'light':'dark');if(rm)draw()});
})();
