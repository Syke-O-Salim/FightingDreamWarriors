'use strict';
const frontIds=Object.keys(homeStages),introOrder=['joey','kincaid','taryn','kristen','will','dan','rick','jesse','mark','alice','nancy'];
let frontScreen='boot',titleChoice=0,selectionSide='p1',cpuSelected='freddy',pendingTournament=[],frontIntroTime=0,frontLast=0,lastFrontNav=0,introSlashCount=0,musicStarted=false;
// Portrait artwork is separate from gameplay sprites and standing previews.
const photoPortraits={};let photosReady=false,portraitSheetsRemaining=2;
const portraitSheets=[
 {src:'portraits-2d-a-v26.png',ids:['kincaid','alice','taryn','joey','nancy','jesse']},
 {src:'portraits-2d-b-v25.png',ids:['kristen','mark','dan','will','freddy','rick']}
];
function portraitSheetFinished(){if(--portraitSheetsRemaining===0){photosReady=true;if(frontScreen==='select')renderSelection();}}
for(const sheet of portraitSheets){
 const atlas=new Image();
 atlas.onload=()=>{
  for(const [i,id] of sheet.ids.entries()){
   const sw=atlas.naturalWidth/3,sh=atlas.naturalHeight/2;
   const c=document.createElement('canvas');c.width=Math.round(sw);c.height=Math.round(sh);
   c.getContext('2d').drawImage(atlas,(i%3)*sw,Math.floor(i/3)*sh,sw,sh,0,0,c.width,c.height);
   photoPortraits[id]=c.toDataURL();
  }
  portraitSheetFinished();
 };
 atlas.onerror=portraitSheetFinished;atlas.src=sheet.src;
}
function portraitPhoto(id){return photoPortraits[id]||portraits[id]||'';}
const menuMusic=new Audio('audio/title-theme.mp3');menuMusic.loop=true;menuMusic.preload='auto';menuMusic.volume=.65;
function syncMenuMusic(){const allowed=['intro','title','select'].includes(frontScreen)&&mode==='menu'&&sound&&!document.hidden;if(allowed&&musicStarted){const promise=menuMusic.play();if(promise?.catch)promise.catch(()=>{$('#status').textContent='TAP SOUND ON TO ENABLE MUSIC';});}else menuMusic.pause();}
function frontShow(screen){frontScreen=screen;$('#front').hidden=!screen;for(const [id,name] of [['bootScreen','boot'],['introScreen','intro'],['titleScreen','title'],['selectScreen','select']])$('#'+id).hidden=screen!==name;if(screen){mode='menu';held.clear();$('#menu').hidden=true;$('#hud').hidden=true;$('#endMenu').hidden=true;$('#pauseMenu').hidden=true;message('');}syncMenuMusic();}
function frontLeave(){frontScreen='';$('#front').hidden=true;menuMusic.pause();menuMusic.currentTime=0;}
function beginIntro(){if(!ready||!photosReady){$('#bootStatus').textContent='Still preparing artwork—please wait.';return;}musicStarted=true;unlockSound();frontIntroTime=0;introSlashCount=0;$('#clawCuts').classList.remove('slashing');$('#photoStack').replaceChildren();for(const [i,id] of introOrder.entries()){const card=document.createElement('figure');card.className='intro-photo';card.style.setProperty('--tilt',((i*7)%17-8)+'deg');card.style.setProperty('--offset',((i*29)%55-27)+'px');const img=document.createElement('img');img.src=portraitPhoto(id);img.alt=id.toUpperCase();const label=document.createElement('figcaption');label.textContent=id.toUpperCase();card.append(img,label);$('#photoStack').append(card);}frontShow('intro');}
function titleScreen(){frontShow('title');renderTitle();}
function renderTitle(){document.querySelectorAll('[data-title-mode]').forEach((b,i)=>{b.classList.toggle('chosen',i===titleChoice);b.setAttribute('aria-pressed',String(i===titleChoice));});}
function openSelection(){musicStarted=true;selectionSide='p1';$('#playMode').value=titleChoice===0?'tournament':'versus';playMode=$('#playMode').value;pendingTournament=playMode==='tournament'?tournamentOrder(selected):[];cpuSelected=playMode==='tournament'?pendingTournament[0]:($('#opponent').value||'freddy');frontShow('select');renderSelection();}
function frontTournament(){return frontScreen==='select'&&pendingTournament.length?[...pendingTournament]:null;}
function renderSelection(){const tour=$('#playMode').value==='tournament';$('#frontArena').disabled=tour;$('#frontArena').value=tour?homeStages[cpuSelected]:$('#arenaChoice').value;$('#selectMode').textContent=tour?'TOURNAMENT':'VERSUS CPU';$('#selectPrompt').textContent=selectionSide==='p1'?'CHOOSE PLAYER 1':tour?'FIRST OPPONENT · FREDDY AWAITS AT THE END':'CHOOSE YOUR CPU OPPONENT';$('#selectConfirm').textContent=selectionSide==='p1'?'CONFIRM PLAYER 1 →':'START FIGHT →';for(const [prefix,id] of [['p1',selected],['cpu',cpuSelected]]){for(const suffix of ['Large','Standing']){const img=$('#'+prefix+suffix);img.src=suffix==='Large'?portraitPhoto(id):(portraits[id]||'');}$('#'+prefix+'Label').textContent=id.toUpperCase();}document.querySelectorAll('[data-roster]').forEach(b=>{b.classList.toggle('p1-selected',b.dataset.roster===selected);b.classList.toggle('cpu-selected',b.dataset.roster===cpuSelected);b.setAttribute('aria-label',b.dataset.roster.toUpperCase()+(b.dataset.roster===selected?' · Player 1':'')+(b.dataset.roster===cpuSelected?' · Computer':''));const img=b.querySelector('img');img.src=portraitPhoto(b.dataset.roster);});}
function chooseFrontFighter(id){if(selectionSide==='p1'){selected=id;$('#arenaChoice').value=homeStages[id];if($('#playMode').value==='tournament'){pendingTournament=tournamentOrder(id);cpuSelected=pendingTournament[0];}}else if($('#playMode').value!=='tournament'){cpuSelected=id;}renderSelection();}
function confirmFront(){if(frontScreen==='boot'){beginIntro();return;}if(frontScreen==='intro'){titleScreen();return;}if(frontScreen==='title'){openSelection();return;}if(frontScreen!=='select')return;if(selectionSide==='p1'){selectionSide='cpu';renderSelection();return;}$('#opponent').value=cpuSelected;$('#difficulty').value=$('#frontDifficulty').value;start();}
function backFront(){if(frontScreen==='select'&&selectionSide==='cpu'){selectionSide='p1';renderSelection();}else if(frontScreen==='select'||frontScreen==='intro')titleScreen();}
function frontInput(input){if(!frontScreen)return false;if(input==='confirm'){confirmFront();return true;}if(input==='back'){backFront();return true;}if(frontScreen==='title'&&(input==='up'||input==='down')){titleChoice=1-titleChoice;renderTitle();soundEffect('block');}else if(frontScreen==='select'){if(selectionSide==='cpu'&&$('#playMode').value==='tournament')return true;const current=selectionSide==='p1'?selected:cpuSelected,index=frontIds.indexOf(current),delta={up:-4,down:4,left:-1,right:1}[input];if(delta)chooseFrontFighter(frontIds[(index+delta+frontIds.length)%frontIds.length]);}return true;}
function frontFrame(now){const dt=Math.min(.08,(now-frontLast)/1000||0);frontLast=now;if(frontScreen==='boot'){const loaded=ready&&photosReady;$('#beginGame').disabled=!loaded;$('#bootStatus').textContent=loaded?'Press Enter or tap to enter the dream.':'Loading the dream warriors…';}if(frontScreen==='intro'&&!document.hidden){frontIntroTime+=dt;document.querySelectorAll('.intro-photo').forEach((card,i)=>{const u=Math.max(0,Math.min(1,(frontIntroTime-i*.85)/.5));card.style.opacity=u>0?'1':'0';card.style.transform='translate(calc(-50% + var(--offset)),calc(-50% - '+Math.pow(1-u,3)*850+'px)) rotate(var(--tilt))';});const cutStart=introOrder.length*.85+.35;if(frontIntroTime>=cutStart){$('#clawCuts').classList.add('slashing');const count=Math.min(4,Math.floor((frontIntroTime-cutStart)/.13)+1);if(count>introSlashCount){introSlashCount=count;soundEffect('rip');}}if(frontIntroTime>=cutStart+1.5)titleScreen();}requestAnimationFrame(frontFrame);}
for(const id of frontIds){const b=document.createElement('button');b.dataset.roster=id;const img=document.createElement('img');img.alt='';const label=document.createElement('span');label.textContent=id.toUpperCase();b.append(img,label);b.onclick=()=>chooseFrontFighter(id);$('#frontRoster').append(b);}
$('#beginGame').onclick=beginIntro;$('#skipIntro').onclick=titleScreen;$('#replayIntro').onclick=beginIntro;$('#backTitle').onclick=titleScreen;$('#selectConfirm').onclick=confirmFront;
document.querySelectorAll('[data-title-mode]').forEach((b,i)=>b.onclick=()=>{titleChoice=i;renderTitle();openSelection();});
// Capture menu input before combat handlers, using the same directional pad.
window.addEventListener('keydown',ev=>{enableMenuAudio();if(!frontScreen||ev.target.tagName==='SELECT')return;const input={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Enter:'confirm',Space:'confirm',KeyJ:'confirm',KeyK:'back',Escape:'back'}[ev.code];if(input){ev.preventDefault();ev.stopImmediatePropagation();if(!ev.repeat)frontInput(input);}},true);
$('#controls').addEventListener('pointerdown',ev=>{if(!frontScreen)return;const b=ev.target.closest('button');if(!b)return;ev.preventDefault();ev.stopImmediatePropagation();const input=b.dataset.hold||({jump:'up',punch:'confirm',kick:'back',super:'confirm'}[b.dataset.action]);frontInput(input);},true);
document.addEventListener('visibilitychange',syncMenuMusic);$('#sound').addEventListener('click',()=>{musicStarted=true;syncMenuMusic();});
frontShow('boot');requestAnimationFrame(frontFrame);

$('#frontArena').innerHTML=$('#arenaChoice').innerHTML;
$('#frontArena').onchange=()=>{$('#arenaChoice').value=$('#frontArena').value;};

function enableMenuAudio(){if(sound&&['intro','title','select'].includes(frontScreen)){musicStarted=true;unlockSound();syncMenuMusic();}}
window.addEventListener('pointerdown',enableMenuAudio,{capture:true,once:true});
