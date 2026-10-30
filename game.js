'use strict';
const $=s=>document.querySelector(s), canvas=$('#game'),ctx=canvas.getContext('2d');
const GAUGE_UNIT=100/3;
const specialNames={nancy:['TELEPHONE THROW','BAT SWING','MOLOTOV COCKTAIL'],freddy:['LONG CLAW SWIPE','CLAW BARRAGE','NIGHTMARE SERPENT'],joey:['MTV','SILENT SLAP','DREAM VOICE'],kincaid:['MC ROCK','POLE POSITION','JUNKYARD'],taryn:['KNIFE THROW','LET’S DANCE','GET HIGH'],kristen:['KEEP THE BOURBON','FORWARD FLIP','DREAM PULL'],will:['D&D BOOK','MAGIC WAND','WIZARD MASTER'],alice:['POWER PEARLS','NIGHTMARE NUNCHUCKS','BUG ZAPPER'],dan:['QB BULLET','QB SNEAK','NEED FOR SPEED'],rick:['NINJA STAR','NIGHTMARE NUNCHUCKS','HELLO BABY'],jesse:['HEADS UP','HELP ME','HELP YOURSELF'],mark:['SHOOT 1ST','SKATEBOARD SWING','TIME TO DIE']};
function specialLevel(meter){return Math.min(3,Math.floor((meter+1e-7)/GAUGE_UNIT));}
const propArt=new Image(),snakeArt=new Image(),propFrames=[];let snakeFrame=null,loadedSpecialArt=0;
const W=1280,H=640,FLOOR=620,held=new Set(),sprites=new Image(),frames=[[],[]];
const poseArt=[new Image(),new Image()],poseFrames=[[],[]];
let debris=[],roundEnd=null,carImpact=null,grapple=null;
const fighterArt=[new Image(),new Image()];let loadedFighters=0,loadedPoses=0;
const portraits={},movementFrames=[[],[]],movementArt=new Image();
let ready=false,selected='freddy',mode='menu',previousMode='',p,e,round=1,wins=[0,0],clock=90,phase=0,phaseTime=0,t=0,last=0,shake=0,flash=0,particles=[],projectiles=[],combo=0,comboTime=0,sound=true,audio;
const backgrounds=Array.from({length:13},()=>new Image()),stageNames=['THE BOILER ROOM','SPRINGWOOD HIGH','JOEY’S HOSPITAL ROOM','THE JUNKYARD','THE ALLEY','THE BATHROOM','THE BLUE HALLWAY','THE OLD CHURCH','NIGHTMARE HIGHWAY','THE GARAGE DOJO','LISA’S POOL','NIGHTMARE WAREHOUSE','THE ELM STREET HOUSE'];backgrounds[12].src='elm-house.jpg';backgrounds[10].src='lisas-pool.png';backgrounds[11].src='nightmare-warehouse.png';backgrounds[8].src='nightmare-highway.png';backgrounds[9].src='garage-dojo.png';backgrounds[6].src='blue-hallway.png';backgrounds[7].src='old-church.png';backgrounds[4].src='alley.png';backgrounds[5].src='bathroom.png?v=12';backgrounds[2].src='hospital.png';backgrounds[3].src='junkyard.png';backgrounds[0].src='boiler-room.png';backgrounds[1].src='school-hall.png';
let arenaIndex=0,transition=null,stageCooldown=0;
const homeStages={freddy:0,nancy:1,joey:2,kincaid:3,taryn:4,kristen:5,will:6,alice:7,dan:8,rick:9,jesse:10,mark:11};
let playMode='versus',tournament=[],tournamentIndex=0;
function tournamentOrder(id){const order=Object.keys(homeStages).filter(x=>x!==id&&x!=='freddy');for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}return [...order,'freddy'];}
function currentOpponent(){return playMode==='tournament'?tournament[tournamentIndex]:$('#opponent').value||(selected==='freddy'?'nancy':'freddy');}
function syncModeOptions(){const tour=$('#playMode').value==='tournament';$('#opponent').disabled=tour;$('#arenaChoice').disabled=tour;$('#modeHelp').textContent=tour?'Beat every opponent in a shuffled ladder. Freddy is always the final boss—even if you choose Freddy.':'One match against your chosen CPU opponent. First to two rounds wins.';}
function finishMatch(){mode='over';message('');$('#endMenu').hidden=false;const won=wins[0]>=2,complete=won&&tournamentIndex===tournament.length-1;
 $('#endTitle').textContent=playMode==='tournament'?(won?(complete?'NIGHTMARE CHAMPION!':'OPPONENT DEFEATED.'): 'THE NIGHTMARE CONTINUES.'):(won?'YOU WIN!':'TRY TO STAY AWAKE.');
 $('#endText').textContent=p.id.toUpperCase()+' '+wins[0]+' — '+wins[1]+' '+e.id.toUpperCase()+(playMode==='tournament'?(won&&!complete?' · NEXT: '+tournament[tournamentIndex+1].toUpperCase():complete?' · YOU BEAT THE ENTIRE TOURNAMENT.':' · RETRY THIS OPPONENT TO CONTINUE.'):'');
 $('#rematch').textContent=playMode==='tournament'?(won?(complete?'NEW TOURNAMENT →':'NEXT OPPONENT →'):'RETRY OPPONENT →'):'REMATCH →';
 if(playMode==='tournament'&&complete&&typeof showCharacterEnding==='function')showCharacterEnding(p.id);
}
function continueMatch(){if(playMode==='tournament'){if(wins[0]>=2){if(tournamentIndex===tournament.length-1){start();return;}tournamentIndex++;}beginMatch();}else start();}
function beginMatch(){if(typeof hideCharacterEnding==='function')hideCharacterEnding();if(typeof frontLeave==='function')frontLeave();cancelVictoryVoice();round=1;wins=[0,0];arenaIndex=playMode==='tournament'?homeStages[currentOpponent()]:Number($('#arenaChoice').value)||0;transition=null;stageCooldown=0;mode='fight';held.clear();$('#menu').hidden=true;$('#hud').hidden=false;$('#pauseMenu').hidden=true;$('#endMenu').hidden=true;nextRound();tone(160,.25);}

const difficulty={easy:{speed:120,delay:.68,block:.12},normal:{speed:175,delay:.38,block:.25},hard:{speed:215,delay:.24,block:.42}};
function tone(freq=100,dur=.12,type='sawtooth',vol=.035){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq/3),audio.currentTime+dur);g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch{}}
function fighter(id,x){return{id,x,y:0,vy:0,hp:100,meter:35,face:x<W/2?1:-1,move:0,downTime:0,fallDir:0,downLanded:false,burn:0,poison:0,walkPhase:0,walking:false,action:'idle',actionTime:0,actionTotal:0,cooldown:0,stun:0,block:false,hit:false,ai:0,flash:0,crouch:false,airVx:0,jumpPrep:0,landTime:0,pendingAirAttack:null,superHits:0,superTarget:null,trailHp:100,trailHold:0,superLevel:0,specialGoal:1+Math.floor(Math.random()*3)};}
function message(s){$('#message').textContent=s;$('#message').classList.toggle('special-callout',s.startsWith('LV '));$('#message').classList.toggle('victory-callout',/ WINS$/.test(s)||['K.O.','TIME UP','DRAW'].includes(s));}
function updateHud(){if(!p)return;$('#pHealth').style.width=p.hp+'%';$('#pTrail').style.width=p.trailHp+'%';$('#eTrail').style.width=e.trailHp+'%';$('#pHealth').classList.toggle('danger',p.hp<25);$('#eHealth').classList.toggle('danger',e.hp<25);for(const [f,label] of [[p,'#pGaugeLabel'],[e,'#eGaugeLabel']]){const lv=specialLevel(f.meter);$(label).textContent=lv?'LV '+lv+' · '+specialNames[f.id][lv-1]:'CHARGING · 0 / 3';}$('#eHealth').style.width=e.hp+'%';$('#pMeter').style.width=p.meter+'%';$('#eMeter').style.width=e.meter+'%';$('#timer').textContent=Math.ceil(clock).toString().padStart(2,'0');$('#roundLabel').textContent=(playMode==='tournament'?'FIGHT '+(tournamentIndex+1)+'/'+tournament.length+' · ':'')+'ROUND '+round;$('#pRounds').textContent='● '.repeat(wins[0])+'○ '.repeat(2-wins[0]);$('#eRounds').textContent='● '.repeat(wins[1])+'○ '.repeat(2-wins[1]);const lv=specialLevel(p.meter);$('#superBtn').classList.toggle('ready',lv>0);$('#superBtn').dataset.level=lv;$('#superLabel').textContent=lv?'LEVEL '+lv:'SPECIAL';$('#status').textContent=roundEnd?.announced&&victoryLines[roundEnd.winner?.id]?victoryLines[roundEnd.winner.id]:lv?specialNames[p.id][lv-1]+' READY':'BUILD YOUR DREAM METER';}
function nextRound(){cancelVictoryVoice();grapple=null;carImpact=null;roundEnd=null;debris=[];p=fighter(selected,350);e=fighter(currentOpponent(),930);clock=90;phase=0;phaseTime=2.4;transition=null;projectiles=[];particles=[];combo=0;comboTime=0;message('ROUND '+round);$('#pName').textContent=p.id.toUpperCase();$('#eName').textContent=e.id.toUpperCase();updateHud();}
function start(){unlockSound();if(!ready){$('#loading').textContent='Fighters are still loading. Try again in a moment.';return;}playMode=$('#playMode').value==='tournament'?'tournament':'versus';tournamentIndex=0;tournament=playMode==='tournament'?((typeof frontTournament==='function'&&frontTournament())||tournamentOrder(selected)):[];beginMatch();}
function menu(){if(typeof hideCharacterEnding==='function')hideCharacterEnding();cancelVictoryVoice();grapple=null;carImpact=null;roundEnd=null;debris=[];mode='menu';held.clear();$('#menu').hidden=false;$('#hud').hidden=true;$('#pauseMenu').hidden=true;$('#endMenu').hidden=true;message('');$('#status').textContent='MAKE YOUR CHOICE';if(typeof openSelection==='function')openSelection();}
function pause(){if(mode==='fight'){mode='pause';held.clear();$('#pauseMenu').hidden=false;}else if(mode==='pause'){mode='fight';$('#pauseMenu').hidden=true;}}
function attack(f,kind){
 if(mode!=='fight'||phase!==1||transition||grapple||f.downTime>0||f.stun>0||f.actionTime>0||f.cooldown>0||f.block)return false;
 if(f.jumpPrep>0){if(kind!=='super'){f.pendingAirAttack=kind;return true;}return false;}
 if(kind==='super'&&(specialLevel(f.meter)<1||f.y>0||f.crouch)){if(f===p)$('#status').textContent='STAND UP WITH AT LEAST ONE FULL BAR';return false;}
 f.action=kind;f.superLevel=kind==='super'?specialLevel(f.meter):0;f.actionTotal=kind==='super'?(f.superLevel===1?(f.id==='freddy'?.85:.7):f.superLevel===2?(f.id==='nancy'?.9:1.45):f.id==='freddy'?1.85:1.45):kind==='kick'?.5:.34;if(kind==='super'&&f.id==='rick'&&f.superLevel===3)f.actionTotal=2.05;f.actionTime=f.actionTotal;f.hit=false;f.superHits=0;f.comboConnected=false;f.stepDistance=0;f.slammed=false;f.cooldown=f.actionTotal+.09;
 f.attackLevel=f.y>0?'air':f.crouch?'low':'high';
 if(f.attackLevel==='air'&&kind!=='super'){f.actionTotal=kind==='kick'?.75:.65;f.actionTime=f.actionTotal;f.cooldown=f.actionTotal+.06;}
 if(kind==='super'){f.meter=Math.max(0,f.meter-f.superLevel*GAUGE_UNIT);f.specialGoal=1+Math.floor(Math.random()*3);shake=3+f.superLevel*2;flash=.05*f.superLevel;const target=f===p?e:p;f.superTarget=Math.abs(target.x-f.x)<680?target:null;message('LV '+f.superLevel+' · '+specialNames[f.id][f.superLevel-1]);soundEffect(specialImpact(f.id,f.superLevel)==='rip'?'slash':specialImpact(f.id,f.superLevel)==='blast'?'charge':specialImpact(f.id,f.superLevel)==='fire'?'fire':'swing');}
 else soundEffect('swing');return true;
}
function jump(f,direction){if(!f)return;if(mode==='fight'&&phase===1&&!transition&&!grapple&&f.downTime<=0&&f.y===0&&f.stun<=0&&f.actionTime<=0&&f.jumpPrep<=0&&f.landTime<=0){
 f.jumpPrep=.12;f.vy=0;f.block=false;f.crouch=false;
 const dir=direction??(f===p?((held.has('right')?1:0)-(held.has('left')?1:0)):Math.sign(f.move));
 f.airVx=dir*350;tone(220,.09,'sine');}}
function action(a){if(!p)return;if(a==='jump')jump(p);else if(a==='jumpLeft')jump(p,-1);else if(a==='jumpRight')jump(p,1);else attack(p,a)}
function hit(a,b,damage,push,superHit=false,level='high',forceDown=false,impactKind=null){
 if(b.hp<=0||b.downTime>0||(!superHit&&b.stun>.19))return false;
 if(!superHit&&level==='high'&&b.crouch&&b.y===0)return false;
 const blocked=b.block&&b.y<20&&b.face===-a.face&&!(level==='air'&&b.crouch)&&!(level==='low'&&!b.crouch);
 const knockdown=superHit&&(damage===25||forceDown)&&!blocked;
 if(!blocked)b.fallDir=(Math.sign(b.x-a.x)||a.face)*(level==='low'?-1:1);
 damage=superHit?damage:1;damage=blocked?damage*.15:damage;b.hp=Math.max(0,b.hp-damage);b.trailHold=.4;b.stun=blocked?.12:.26;b.flash=.15;
 b.x=Math.max(70,Math.min(W-70,b.x+a.face*(blocked?push*.25:push)));b.meter=Math.min(100,b.meter+(blocked?4:9));a.meter=Math.min(100,a.meter+(superHit?0:blocked?5:13));shake=blocked?3:superHit?12:7;
 for(let i=0;i<16;i++)particles.push({x:b.x-a.face*30,y:FLOOR-b.y-(b.crouch?85:140),vx:(Math.random()-.5)*500,vy:(Math.random()-.8)*450,life:.25+Math.random()*.3,color:blocked?'#9fc6e9':a.id==='freddy'?'#ff8e5d':'#c6c0ff'});
 if(knockdown){b.downTime=1.7;b.downLanded=false;b.action='idle';b.actionTime=0;b.superTarget=null;b.move=0;b.walking=false;b.crouch=false;b.block=false;b.vy=0;b.airVx=0;if(a.id==='nancy'||(a.id==='jesse'&&a.superLevel===3))b.burn=2.1;if(a.id==='taryn')b.poison=2.1;}
 soundEffect(blocked?'block':impactKind||(superHit?specialImpact(a.id,a.superLevel):a.action==='kick'?'kick':'punch'));b.jumpPrep=0;b.pendingAirAttack=null;if(a===p&&!blocked){combo=comboTime>0?combo+1:1;comboTime=1.2;}if(b.hp<=0)endRound();else if(!blocked&&push>=25&&stageCooldown<=0&&((a.face===1&&b.x>=W-100)||(a.face===-1&&b.x<=100)))beginStageBreak(a,b);return true;
}
function beginStageBreak(attacker,victim){
 if(transition||phase!==1)return;
 transition={elapsed:0,attacker,victim,dir:attacker.face,switched:false};stageCooldown=8;held.clear();projectiles=[];
 for(const f of [p,e]){f.action='idle';f.actionTime=0;f.cooldown=0;f.superTarget=null;f.move=0;f.block=false;f.crouch=false;}
 spawnWallDebris(victim.x,attacker.face);shake=20;flash=.2;message('STAGE BREAK!');soundEffect('wallbreak');
 for(let i=0;i<35;i++)particles.push({x:victim.x,y:FLOOR-220+Math.random()*220,vx:-attacker.face*Math.random()*350,vy:-Math.random()*400,life:1.2,color:i%2?'#bc9a7a':'#61565c'});
}
function updateStageBreak(dt){const tr=transition;tr.elapsed+=dt;
 if(tr.elapsed<.55){tr.victim.x+=tr.dir*750*dt;tr.victim.y+=130*dt;tr.attacker.x+=tr.dir*180*dt;}
 if(tr.elapsed>=.6&&!tr.switched){tr.switched=true;arenaIndex=(arenaIndex+tr.dir+backgrounds.length)%backgrounds.length;tr.attacker.x=tr.dir===1?400:880;tr.victim.x=tr.dir===1?740:540;tr.victim.y=90;tr.attacker.y=0;for(const f of [p,e]){f.vy=0;f.airVx=0;}message(stageNames[arenaIndex]);}
 if(tr.switched)tr.victim.y=Math.max(0,tr.victim.y-dt*240);
 if(tr.elapsed>=1.65){for(const f of [p,e]){f.y=0;f.stun=0;f.ai=.5;f.face=f===tr.attacker?tr.dir:-tr.dir;}transition=null;message('');}
}
function isSnake(f){return f.id==='freddy'&&f.action==='super'&&f.superLevel===3&&f.actionTime>0&&f.actionTotal-f.actionTime>.18&&f.actionTotal-f.actionTime<1.65;}
function updateSuper(f,other,elapsed,dt){
 if(f.id==='nancy'){
  if(f.superLevel===1){if(elapsed>=.2&&!f.hit){f.hit=true;projectiles.push({type:'phone',x:f.x+f.face*65,y:FLOOR-155,baseY:FLOOR-155,face:f.face,owner:f,speed:650,life:1.65,age:0,damage:5,push:28});}return;}
  if(f.superLevel===2){if(elapsed>=.34&&!f.hit){f.hit=true;if(Math.abs(f.x-other.x)<235&&other.y<160)hit(f,other,15,70,true,'mid');}return;}
  if(elapsed>=.25&&!f.hit){f.hit=true;launchProp(f,'molotov',25,140);}
 }else if(f.id==='freddy'){
  if(f.superLevel===1){if(elapsed>=.3&&!f.hit){f.hit=true;if(Math.abs(f.x-other.x)<270&&other.y<170)hit(f,other,5,48,true,'mid');}return;}
  if(f.superLevel===3){if(isSnake(f)&&!f.hit){f.x=Math.max(90,Math.min(W-90,f.x+f.face*460*dt));if(Math.abs(f.x-other.x)<205&&other.y<220){f.hit=true;hit(f,other,25,140,true,'mid');flash=.22;shake=18;}}return;}
  if(elapsed>.08&&elapsed<.38&&Math.abs(other.x-f.x)>110)f.x=Math.max(80,Math.min(W-80,f.x+f.face*650*dt));
  const due=Math.min(6,Math.max(0,Math.floor((elapsed-.36)/.135)+1));
  while(f.superHits<due&&phase===1&&!transition){f.superHits++;if(Math.abs(f.x-other.x)<195&&Math.abs(f.y-other.y)<140){hit(f,other,f.superHits===6?5:2,f.superHits===6?110:3,true,'mid');}}
 }
 else if(f.id==='kristen'){
  if(f.superLevel===1){if(elapsed>=.2&&!f.hit){f.hit=true;launchProp(f,'bourbon',5,28);}return;}
  if(f.superLevel===2){const pose=flipPose(elapsed);if((pose.stage==='tuck'||pose.stage==='kick')&&!f.hit){const gap=(other.x-f.x)*f.face,stop=pose.stage==='tuck'?150:115;if(gap>stop)f.x=Math.max(80,Math.min(W-80,f.x+f.face*Math.min(gap-stop,(pose.stage==='tuck'?530:220)*dt)));}if(pose.stage==='kick'&&elapsed>=.66&&!f.hit&&Math.abs(f.x-other.x)<210&&other.y<210){f.hit=true;hit(f,other,15,80,true,'mid');}return;}
  if(f.superTarget===other&&elapsed>.14&&elapsed<1.0){const dest=f.x+f.face*105;other.x+=(dest-other.x)*Math.min(1,dt*7);other.y=Math.max(0,other.y-dt*400);other.vy=0;other.airVx=0;other.stun=.18;other.move=0;}
  if(elapsed>=1.02&&!f.hit){f.hit=true;if(Math.abs(f.x-other.x)<165){hit(f,other,25,145,true,'mid');flash=.25;}}
 }
 else if(f.id==='taryn'){
  if(f.superLevel===1){if(elapsed>=.2&&!f.hit){f.hit=true;launchProp(f,'knife',5,28);}return;}
  if(elapsed>.08&&elapsed<.55&&Math.abs(other.x-f.x)>105)f.x=Math.max(80,Math.min(W-80,f.x+f.face*650*dt));
  if(f.superLevel===3){if(elapsed>=.42&&!f.hit&&Math.abs(f.x-other.x)<205&&other.y<180){f.hit=true;hit(f,other,25,100,true,'mid');flash=.18;}return;}
  const due=Math.min(6,Math.max(0,Math.floor((elapsed-.36)/.135)+1));while(f.superHits<due&&phase===1&&!transition){f.superHits++;if(Math.abs(f.x-other.x)<195&&Math.abs(f.y-other.y)<140)hit(f,other,f.superHits===6?5:2,f.superHits===6?100:3,true,'mid');}
 }
 else if(f.id==='jesse'){
  if(f.superLevel===1){if(elapsed>=.22&&!f.hit){f.hit=true;launchProp(f,'bat',5,28);}return;}
  if(f.superLevel===2){if(elapsed>.12&&elapsed<.34){const step=Math.min(55-f.stepDistance,250*dt);f.x=Math.max(80,Math.min(W-80,f.x+f.face*step));f.stepDistance+=step;}if(elapsed>=.34&&!f.hit){f.hit=true;const gap=(other.x-f.x)*f.face;if(gap>0&&gap<145&&other.y<45&&other.downTime===0){if(other.block)hit(f,other,15,0,true,'mid');else beginGrapple(f,other);}}return;}
  if(elapsed>=.3&&!f.hit){f.hit=true;projectiles.push({type:'hellfire',owner:f,x:f.x+f.face*100,y:FLOOR-175,baseY:FLOOR-175,face:f.face,speed:580,life:1.8,age:0,damage:25,push:110,radius:95});soundEffect('fire');}
 }
 else if(f.id==='mark'){
  if(f.superLevel===2){if(elapsed>=.4&&!f.hit){f.hit=true;if((other.x-f.x)*f.face>0&&Math.abs(f.x-other.x)<260&&other.y<180)hit(f,other,15,65,true,'mid');}return;}
  if(f.superLevel===3){if(elapsed>=.42&&!f.hit){f.hit=true;f.superHits=1;projectiles.push({type:'powerblast',owner:f,x:f.x+f.face*145,y:FLOOR-220,baseY:FLOOR-220,face:f.face,speed:800,life:1.7,age:0,damage:25,push:110,radius:115,forceDown:true});soundEffect('blast');}return;}
  const total=1,due=Math.min(total,Math.max(0,Math.floor((elapsed-.25)/.11)+1));while(f.superHits<due&&phase===1&&!transition){f.superHits++;projectiles.push({type:'bullet',owner:f,x:f.x+f.face*(f.superHits%2?200:130),y:FLOOR-230,baseY:FLOOR-230,face:f.face,speed:950,life:1.5,age:0,damage:total===1?5:2.5,push:total===1?28:f.superHits===10?90:0,radius:45,forceDown:total===10&&f.superHits===10});soundEffect('gun');}
 }
 else if(f.id==='dan'){
  if(f.superLevel===1){if(elapsed>=.22&&!f.hit){f.hit=true;launchProp(f,'football',5,28);}return;}
  if(f.superLevel===2){if(elapsed>.12&&elapsed<.34){const step=Math.min(55-f.stepDistance,250*dt);f.x=Math.max(80,Math.min(W-80,f.x+f.face*step));f.stepDistance+=step;}if(elapsed>=.34&&!f.hit){f.hit=true;const gap=(other.x-f.x)*f.face;if(gap>0&&gap<145&&other.y<45&&other.downTime===0){if(other.block)hit(f,other,15,0,true,'mid');else beginGrapple(f,other);}}return;}
  if(elapsed>=.28&&!f.hit){f.hit=true;projectiles.push({type:'bike',owner:f,x:Math.max(260,Math.min(W-260,f.x+f.face*60)),y:FLOOR-130,baseY:FLOOR-130,face:f.face,speed:770,life:2,age:0,damage:25,push:140,radius:210});}
 }
 else if(f.id==='rick'){
  if(f.superLevel===1){if(elapsed>=.22&&!f.hit){f.hit=true;launchProp(f,'star',5,28);}return;}
  if(f.superLevel===2){if(elapsed>.12&&elapsed<.45&&(other.x-f.x)*f.face>145)f.x=Math.max(80,Math.min(W-80,f.x+f.face*280*dt));const due=Math.min(3,Math.max(0,Math.floor((elapsed-.4)/.22)+1));while(f.superHits<due&&phase===1&&!transition){f.superHits++;if((other.x-f.x)*f.face>0&&Math.abs(other.x-f.x)<255&&other.y<180)hit(f,other,5,f.superHits===3?70:2,true,'mid');}return;}
  if(elapsed>.12&&elapsed<.62&&!f.hit){const gap=(other.x-f.x)*f.face;if(gap>130)f.x=Math.max(80,Math.min(W-80,f.x+f.face*Math.min(gap-130,850*dt)));if(elapsed>=.25&&(other.x-f.x)*f.face>0&&Math.abs(other.x-f.x)<175&&other.y<190){f.hit=true;f.comboConnected=hit(f,other,5,0,true,'mid');}}
  if(f.comboConnected){const due=Math.min(10,Math.max(0,Math.floor((elapsed-.7)/.105)+1));while(f.superHits<due&&phase===1&&!transition){f.superHits++;if(Math.abs(other.x-f.x)<210&&other.y<190)hit(f,other,2,f.superHits===10?115:0,true,'mid',f.superHits===10);}}
 }
 else if(f.id==='will'||f.id==='alice'){
  if(f.superLevel===1){if(elapsed>=.22&&!f.hit){f.hit=true;launchProp(f,f.id==='will'?'book':'pearls',5,28);}return;}
  if(f.superLevel===2){
   if(elapsed>.12&&elapsed<.45&&(other.x-f.x)*f.face>145)f.x=Math.max(80,Math.min(W-80,f.x+f.face*280*dt));
   if(f.id==='will'){if(elapsed>=.42&&!f.hit){f.hit=true;if((other.x-f.x)*f.face>0&&Math.abs(other.x-f.x)<270&&other.y<180)hit(f,other,15,65,true,'mid');}}
   else{const due=Math.min(3,Math.max(0,Math.floor((elapsed-.4)/.22)+1));while(f.superHits<due&&phase===1&&!transition){f.superHits++;if((other.x-f.x)*f.face>0&&Math.abs(other.x-f.x)<255&&other.y<180)hit(f,other,5,f.superHits===3?70:2,true,'mid');}}
   return;
  }
  if(elapsed>=.48&&!f.hit){f.hit=true;const distance=(other.x-f.x)*f.face;if(distance>0&&distance<1000&&other.y<220){hit(f,other,25,110,true,'mid');flash=.14;}soundEffect('blast');}
 }
 else if(f.id==='joey'||f.id==='kincaid'){
  if(f.superLevel===2){if(elapsed>=.34&&!f.hit){f.hit=true;if(Math.abs(f.x-other.x)<(f.id==='joey'?225:310)&&other.y<180)hit(f,other,15,70,true,'mid');}return;}
  if(elapsed>=.25&&!f.hit){f.hit=true;const type=f.id==='joey'?(f.superLevel===1?'tv':'voice'):(f.superLevel===1?'rock':'car');
   projectiles.push({type,x:f.x+f.face*85,y:FLOOR-155,baseY:FLOOR-155,face:f.face,owner:f,speed:type==='car'?780:650,life:2,age:0,damage:f.superLevel===1?5:25,push:f.superLevel===1?28:140,radius:type==='car'?280:type==='voice'?85:55});soundEffect(type==='voice'?'blast':type==='car'?'crash':'swing');
  }
 }
}
function launchProp(f,type,damage,push){projectiles.push({type,x:f.x+f.face*65,y:FLOOR-155,baseY:FLOOR-155,face:f.face,owner:f,speed:650,life:2,age:0,damage,push});}
function endRound(){grapple=null;
 if(phase!==1)return;phase=2;phaseTime=4.5;projectiles=[];
 const draw=p.hp===e.hp,win=p.hp>e.hp?0:1;
 roundEnd={elapsed:0,winner:draw?null:win===0?p:e,loser:draw?null:win===0?e:p,landed:false,announced:false};
 for(const f of [p,e]){f.downTime=0;f.action='idle';f.actionTime=0;f.superTarget=null;f.move=0;f.crouch=false;f.block=false;f.flash=0;f.vy=0;f.airVx=0;f.jumpPrep=0;f.landTime=0;f.pendingAirAttack=null;}
 if(draw)message('DRAW');else{wins[win]++;message(clock<=0?'TIME UP':'K.O.');tone(55,.5);}updateHud();
}
function spawnWallDebris(x,dir){
 for(let i=0;i<70;i++)debris.push({x,y:90+Math.random()*440,vx:-dir*(100+Math.random()*510)+(Math.random()-.5)*200,vy:-100-Math.random()*450,w:5+Math.random()*22,h:4+Math.random()*18,angle:Math.random()*6,spin:(Math.random()-.5)*15,life:2.3+Math.random()*1.7,bounces:0,color:['#a98a6a','#6e5d54','#c0a288','#484751','#d0b19b'][i%5]});
 for(let i=0;i<18;i++)debris.push({dust:true,x,y:120+Math.random()*420,vx:-dir*(40+Math.random()*240),vy:-30-Math.random()*60,w:18+Math.random()*32,life:2+Math.random(),color:'#b29b89'});
}
function groundDust(x){for(let i=0;i<16;i++)debris.push({dust:true,x,y:FLOOR+4,vx:(Math.random()-.5)*230,vy:-25-Math.random()*55,w:9+Math.random()*13,life:.8+Math.random()*.5,color:'#b9ac9e'});}
function tickVisuals(dt){
 if(carImpact){carImpact.life-=dt;if(carImpact.life<=0)carImpact=null;}
 for(const f of [p,e])if(f){f.burn=Math.max(0,f.burn-dt);f.poison=Math.max(0,f.poison-dt);f.trailHold=Math.max(0,f.trailHold-dt);if(f.trailHold===0)f.trailHp=Math.max(f.hp,f.trailHp-dt*32);}
 for(let i=debris.length-1;i>=0;i--){const d=debris[i];d.life-=dt;d.x+=d.vx*dt;d.y+=d.vy*dt;
 if(d.dust){d.w+=dt*20;d.vx*=Math.pow(.4,dt);}else{d.vy+=850*dt;d.angle+=d.spin*dt;if(d.y>FLOOR+15){d.y=FLOOR+15;d.vy=-Math.abs(d.vy)*.3;d.vx*=.6;d.spin*=.6;d.bounces++;if(d.bounces>2)d.vy=0;}}
 if(d.life<=0)debris.splice(i,1);}
 if(roundEnd&&phase===2){roundEnd.elapsed+=dt;const r=roundEnd;for(const f of [p,e])f.y=Math.max(0,f.y-dt*300);if(r.winner?.id==='freddy'){const count=r.elapsed>=2.8?2:r.elapsed>=1.7?1:0;if(count>(r.slashes||0)){r.slashes=count;tone(260,.22,'sawtooth',.04);}}
 if(r.loser&&r.elapsed<.75){r.loser.x=Math.max(160,Math.min(W-160,r.loser.x-r.loser.face*dt*80));r.loser.y=Math.max(0,r.loser.y-dt*300);}
 if(r.loser&&r.elapsed>=.75&&!r.landed){r.landed=true;groundDust(r.loser.x);shake=8;tone(45,.22,'triangle');}
 if(r.winner&&r.elapsed>=1.45&&!r.announced){r.announced=true;message(r.winner.id.toUpperCase()+' WINS');tone(320,.3,'triangle');speakVictory(r.winner.id);}
 }if(p)updateHud();
}
function drawDebris(){for(const d of debris){ctx.save();ctx.globalAlpha=Math.min(1,d.life)*(d.dust?.14:1);ctx.translate(d.x,d.y);ctx.fillStyle=d.color;if(d.dust){ctx.beginPath();ctx.ellipse(0,0,d.w,d.w*.6,0,0,Math.PI*2);ctx.fill();}else{ctx.rotate(d.angle);ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillRect(-d.w/2,-d.h/2,d.w,d.h);ctx.fillStyle='#ffffff35';ctx.fillRect(-d.w/2,-d.h/2,d.w,2);}ctx.restore();}}
// Downward aerial strikes overlap the opponent's actual standing/crouching body.
function airAttackConnects(f,other){
 const forward=(other.x-f.x)*f.face,reach=f.action==='kick'?205:175;
 const bottom=f.y-100,top=f.y+150,targetTop=other.y+(other.crouch?155:300);
 return f.y>0&&forward>=-50&&forward<reach&&bottom<targetTop&&top>other.y+20;
}
function updateFighter(f,other,dt){
 if(grapple)return;
 if(f.downTime>0){f.downTime=Math.max(0,f.downTime-dt);f.y=Math.max(0,f.y-dt*550);f.move=0;f.walking=false;f.block=false;f.crouch=false;f.stun=0;f.cooldown=Math.max(0,f.cooldown-dt);if(f.downTime<=1.3&&!f.downLanded){f.downLanded=true;groundDust(f.x);tone(55,.1,'triangle');}if(f.downTime===0){f.ai=.3;f.cooldown=.15;f.poison=0;}return;}

 f.cooldown=Math.max(0,f.cooldown-dt);f.stun=Math.max(0,f.stun-dt);f.flash=Math.max(0,f.flash-dt);
 f.landTime=Math.max(0,f.landTime-dt);
 if(f.jumpPrep>0){if(f.stun>0){f.jumpPrep=0;f.pendingAirAttack=null;f.airVx=0;}else{f.jumpPrep=Math.max(0,f.jumpPrep-dt);f.walking=false;if(f.jumpPrep>0)return;f.vy=970;f.block=false;f.crouch=false;soundEffect('swing');}}
 if(f.actionTime===0)f.face=other.x>f.x?1:-1;
 if(f.y>0||f.vy>0){f.y+=f.vy*dt;f.vy-=1550*dt;f.x=Math.max(80,Math.min(W-80,f.x+f.airVx*dt));if(f.y<=0){f.y=0;f.vy=0;f.airVx=0;f.landTime=.14;soundEffect('land');}}
 if(f.y>0&&f.pendingAirAttack){const pending=f.pendingAirAttack;f.pendingAirAttack=null;attack(f,pending);}
 if(f.actionTime>0){f.actionTime=Math.max(0,f.actionTime-dt);const elapsed=f.actionTotal-f.actionTime;
  if(f.action==='super')updateSuper(f,other,elapsed,dt);
  else if(!f.hit&&elapsed>(f.action==='kick'?.17:.10)){
   const reach=f.action==='kick'?187:151;
   // Air attacks stay active briefly, allowing contact while travelling.
   if(f.attackLevel==='air'?elapsed<f.actionTotal-.05&&airAttackConnects(f,other):elapsed<.38&&Math.abs(f.x-other.x)<reach&&Math.abs(f.y-other.y)<95){
    f.hit=hit(f,other,1,f.action==='kick'?42:25,false,f.attackLevel);
   }
  }
  if(f.actionTime===0){if(f.action==='super'&&phase===1)message('');f.action='idle';f.superTarget=null;}
 }
 f.walking=false;
 if(f.y===0&&f.jumpPrep<=0&&f.landTime<=0&&f.stun===0&&f.actionTime===0&&!f.block&&!f.crouch){const oldX=f.x;f.x=Math.max(80,Math.min(W-80,f.x+f.move*dt));const distance=f.x-oldX;f.walking=Math.abs(distance)>.01;if(f.walking)f.walkPhase+=(distance*f.face)/(f.id==='freddy'?24:32);}

}
function update(dt){if(mode!=='fight')return;tickVisuals(dt);if(transition){updateStageBreak(dt);return;}stageCooldown=Math.max(0,stageCooldown-dt);if(phase!==1){phaseTime-=dt;if(phase===0){if(phaseTime<.7)message('FIGHT');if(phaseTime<=0){phase=1;message('');}}else if(phaseTime<=0){if(phase===2&&sound&&victoryVoicePlaying()&&roundEnd?.elapsed<12){phaseTime=.1;return;}if(wins.some(x=>x>=2)){finishMatch();}else{round++;nextRound();}}return;}
if(grapple){updateGrapple(dt);updateHud();return;}
clock=Math.max(0,clock-dt);if(clock===0){endRound();return;}p.crouch=held.has('down')&&p.y===0&&p.vy<=0&&p.action!=='super';p.block=held.has('block')&&p.y===0&&p.actionTime===0;p.move=(held.has('right')?1:0)-(held.has('left')?1:0);p.move*=p.id==='nancy'?260:230;
const ai=difficulty[$('#difficulty').value];e.ai-=dt;const dist=Math.abs(e.x-p.x);if(e.ai<=0){e.ai=ai.delay+Math.random()*.22;e.crouch=e.y===0&&p.actionTime>0&&p.attackLevel==='high'&&Math.random()<.25;e.block=p.actionTime>0&&dist<210&&Math.random()<ai.block;e.move=dist>135?e.face*ai.speed:dist<85?-e.face*ai.speed*.6:0;if(specialLevel(e.meter)>=e.specialGoal&&dist<((['nancy','joey','kincaid','taryn','kristen'].includes(e.id)&&specialLevel(e.meter)===1)?700:specialLevel(e.meter)===3?650:250)&&!e.block)attack(e,'super');else if(dist<180&&!e.block)attack(e,Math.random()>.5?'kick':'punch');if(dist>220&&Math.random()<.1)jump(e);if(e.y>40&&dist<230)attack(e,'kick');}updateFighter(p,e,dt);if(grapple){updateHud();return;}if(phase!==1)return;if(transition){updateHud();return;}updateFighter(e,p,dt);if(grapple){updateHud();return;}if(phase!==1)return;if(transition){updateHud();return;}if(!grapple&&!p.downTime&&!e.downTime&&!isSnake(p)&&!isSnake(e)&&Math.abs(p.x-e.x)<75&&Math.abs(p.y-e.y)<80){const center=(p.x+e.x)/2,sgn=p.x<e.x?1:-1;p.x=Math.max(80,Math.min(W-80,center-37.5*sgn));e.x=Math.max(80,Math.min(W-80,center+37.5*sgn));}
for(let i=projectiles.length-1;i>=0;i--){const q=projectiles[i];q.x+=q.face*q.speed*dt;if(q.type==='car')q.x=Math.max(350,Math.min(W-350,q.x));if(q.type==='bike')q.x=Math.max(260,Math.min(W-260,q.x));q.age+=dt;q.y=q.baseY+(['football','powerblast','knife'].includes(q.type)?0:Math.sin(q.age*8)*12);q.life-=dt;const target=q.owner===p?e:p;const targetCenter=FLOOR-target.y-(target.crouch?75:140);if((!['car','bike'].includes(q.type)||q.age>=.24)&&Math.abs(q.x-target.x)<=(q.radius||55)&&Math.abs(q.y-targetCenter)<(['car','bike','voice','hellfire','powerblast'].includes(q.type)?170:target.crouch?42:95)){if(q.type==='car')carImpact={...q,x:Math.max(350,Math.min(W-350,target.x-q.face*285)),life:.65};if(q.type==='bike')carImpact={...q,x:Math.max(260,Math.min(W-260,target.x-q.face*180)),life:.6};hit(q.owner,target,q.damage,q.push,true,'high',q.forceDown||false,projectileImpact(q.type));q.life=0;}if(transition||phase!==1)break;if(q.life<=0||q.x<0||q.x>W)projectiles.splice(i,1);}comboTime=Math.max(0,comboTime-dt);updateHud();}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function line(x,y,x2,y2,c,w=1){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function arena(){if(backgrounds[arenaIndex].complete&&backgrounds[arenaIndex].naturalWidth){paintDetailedArena();return;}let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#131720');g.addColorStop(.65,'#36201e');g.addColorStop(1,'#160f16');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
for(let y=40;y<510;y+=40){for(let x=-80+(y%80?0:65);x<W;x+=130){rect(x+2,y+2,125,35,`rgba(75,47,42,${.2+(x%3)*.06})`);line(x,y,x+128,y,'#100e12',2);}}
for(const x of [75,170,1100,1190]){let pipe=ctx.createLinearGradient(x,0,x+30,0);pipe.addColorStop(0,'#171920');pipe.addColorStop(.4,'#5a5350');pipe.addColorStop(.6,'#383538');pipe.addColorStop(1,'#13141b');ctx.fillStyle=pipe;ctx.fillRect(x,0,30,500);for(let y=60;y<490;y+=135){rect(x-5,y,40,12,'#2e2b30');line(x-5,y,x+35,y,'#655954',2);}}
for(const x of [365,790]){rect(x,130,180,370,'#18191f');let b=ctx.createLinearGradient(x,0,x+180,0);b.addColorStop(0,'#18171b');b.addColorStop(.5,'#4a3530');b.addColorStop(1,'#211b20');ctx.fillStyle=b;ctx.fillRect(x+5,145,170,345);rect(x-8,160,196,14,'#211c21');rect(x-8,470,196,18,'#211c21');ctx.fillStyle='#342a29';ctx.beginPath();ctx.ellipse(x+90,145,85,25,0,0,Math.PI*2);ctx.fill();rect(x+35,320,110,110,'#08080d');let fire=ctx.createRadialGradient(x+90,420,5,x+90,420,105);fire.addColorStop(0,'#ffb25b');fire.addColorStop(.3,'#d34c21');fire.addColorStop(1,'#a6271500');ctx.fillStyle=fire;ctx.fillRect(x+10,290,160,170);for(let i=0;i<7;i++){let xx=x+43+i*13;ctx.fillStyle=i%2?'#fa843d':'#bb3c20';ctx.beginPath();ctx.moveTo(xx,430);ctx.quadraticCurveTo(xx-18,390,xx+Math.sin(t*4+i)*15,355+Math.sin(t*3+i)*25);ctx.quadraticCurveTo(xx+27,400,xx+12,430);ctx.fill();}for(let i=0;i<7;i++)rect(x+35+i*17,320,5,110,'#191216');}
rect(0,500,W,12,'#0b0c13');let floor=ctx.createLinearGradient(0,500,0,H);floor.addColorStop(0,'#48353a');floor.addColorStop(1,'#17141e');ctx.fillStyle=floor;ctx.fillRect(0,512,W,128);for(let i=-7;i<16;i++)line(W/2+(i-4)*70,510,W/2+(i-4)*190,640,'#19151e',2);for(let y=530;y<H;y+=28)line(0,y,W,y,'#211923',2);
line(0,120,W,120,'#17191f',23);line(0,113,W,113,'#4c4645',3);for(const x of [275,645,1000]){line(x,0,x,70,'#181319',5);rect(x-20,68,40,8,'#141119');let glow=ctx.createRadialGradient(x,78,1,x,78,140);glow.addColorStop(0,'#ffe4b055');glow.addColorStop(1,'#f9a76400');ctx.fillStyle=glow;ctx.fillRect(x-140,0,280,230);rect(x-12,76,24,5,'#e2b77c');}
for(let i=0;i<22;i++){const x=(i*193+Math.sin(t+i)*15)%W,y=500-((t*22+i*37)%400);ctx.globalAlpha=.15+(i%4)*.08;rect(x,y,2,3,'#ffb066');}ctx.globalAlpha=1;let vign=ctx.createRadialGradient(640,330,150,640,330,750);vign.addColorStop(0,'#09081500');vign.addColorStop(1,'#080713bb');ctx.fillStyle=vign;ctx.fillRect(0,0,W,H);}
function paintDetailedArena(){
 const bg=backgrounds[arenaIndex],scale=Math.max(W/bg.naturalWidth,H/bg.naturalHeight),bw=bg.naturalWidth*scale,bh=bg.naturalHeight*scale;
 ctx.drawImage(bg,(W-bw)/2,(H-bh)/2,bw,bh);
 if(arenaIndex===12){ctx.fillStyle='rgba(3,10,30,.64)';ctx.fillRect(0,0,W,H);}
 animateArena(bg,bw,bh);
 const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,arenaIndex===11?'#08080899':'#08061399');shade.addColorStop(.28,'#08080800');shade.addColorStop(1,arenaIndex===11?'#08080833':'#08061333');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
 for(let i=0;i<18;i++){const x=(i*193+Math.sin(t*.4+i)*20)%W,y=520-((t*(arenaIndex?8:24)+i*37)%400);ctx.globalAlpha=.14+(i%4)*.07;rect(x,y,2,arenaIndex?2:4,arenaIndex===11?'#dddddd':arenaIndex?'#d4e3e8':'#ffb066');}ctx.globalAlpha=1;
 ctx.fillStyle='#ffffff9c';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText(stageNames[arenaIndex]+'  /  '+(arenaIndex+1)+' OF '+backgrounds.length,W/2,620);ctx.textAlign='left';
}

// Stage effects are drawn behind fighters, in the background image's coordinate space.
function arenaGlow(x,y,r,color,alpha){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+color+','+alpha+')');g.addColorStop(1,'rgba('+color+',0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function animateArena(bg,bw,bh){
 ctx.save();ctx.translate((W-bw)/2,(H-bh)/2);ctx.scale(bw/1280,bh/640);
 const pulse=.5+.3*Math.sin(t*1.1)+.2*Math.sin(t*2.37),flicker=(t%7.9>6.9&&t%7.9<7.45)? .13+.07*Math.sin(t*18):.8+.1*Math.sin(t*3.1);
 const haze=(y,alpha,color='145,164,183')=>{for(let i=0;i<5;i++){const x=((t*(6+i)+i*310)%1700)-210;ctx.save();ctx.translate(x,y+Math.sin(t*.4+i)*12);ctx.scale(2.8,.32);arenaGlow(0,0,100,color,alpha);ctx.restore();}};
 if(arenaIndex===12){
  // Occasional distant light flashes and moonlit drifting mist behind the fighters.
  const cycle=t%13,glint=cycle>10.6&&cycle<11.15?Math.pow(Math.sin((cycle-10.6)/.55*Math.PI),2):0;
  rect(0,0,1280,640,'rgba(160,192,255,'+(glint*.19)+')');
  arenaGlow(865,105,440,'126,167,238',.06+.035*pulse+glint*.13);
  arenaGlow(620,290,125,'255,208,139',glint*.12);haze(475,.065,'107,132,171');haze(60,.035,'120,146,188');
 }else if(arenaIndex===10){
  // Restrict refraction to the water, leaving the coping and patio still.
  ctx.save();ctx.beginPath();ctx.moveTo(0,503);ctx.lineTo(642,368);ctx.lineTo(1280,368);ctx.lineTo(1280,517);ctx.lineTo(0,512);ctx.closePath();ctx.clip();
  for(let y=366;y<520;y+=3){const dx=Math.sin(y*.17+t*2.2)*2.4+Math.sin(y*.08-t*1.5)*1.2;ctx.drawImage(bg,0,y/640*bg.naturalHeight,bg.naturalWidth,3/640*bg.naturalHeight,dx,y,1280,3.2);}
  for(let i=0;i<26;i++){const y=385+i*4.8,x=(i*157+t*(4+i%3))%1280;line(x,y,x+12+8*Math.sin(t+i),y,'rgba(173,237,244,'+(.1+.07*Math.sin(t*2+i))+')',1);}
  ctx.restore();haze(390,.035);arenaGlow(923,99,70,'255,206,138',.04+.025*pulse);
 }else if(arenaIndex===0){
  for(const [x,y,rx,ry] of [[300,310,48,66],[1128,312,48,65],[560,408,14,22]]){
   ctx.save();ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.clip();
   for(let yy=y-ry;yy<y+ry;yy+=3){const dx=Math.sin(yy*.1+t*5)*2;ctx.drawImage(bg,(x-rx)/1280*bg.naturalWidth,yy/640*bg.naturalHeight,rx*2/1280*bg.naturalWidth,3/640*bg.naturalHeight,x-rx+dx,yy,rx*2,3.2);}
   arenaGlow(x,y,ry,'255,133,31',.12+.06*Math.sin(t*6+x));ctx.restore();
   arenaGlow(x,y,ry*1.8,'255,111,25',.05+.03*Math.sin(t*5+x));
  }haze(420,.055,'170,159,150');
 }else if(arenaIndex===5){
  // One small light above the existing single mirror.
  rect(500,27,112,8,'#333b40');rect(506,30,100,3,'rgba(227,241,255,'+flicker+')');
  arenaGlow(556,35,250,'210,231,255',.16*flicker);arenaGlow(120,95,220,'119,176,240',.04+.04*pulse);
 }else if(arenaIndex===4){
  arenaGlow(1134,142,120,'255,24,54',.19*flicker);line(1113,144,1154,129,'rgba(255,126,145,'+flicker+')',3);
  arenaGlow(470,193,70,'255,35,126',.12*flicker);arenaGlow(1100,452,150,'255,24,54',.08*flicker);haze(340,.045);
 }
 if([3,4,8].includes(arenaIndex)){
  ctx.save();ctx.beginPath();
  if(arenaIndex===4){ctx.moveTo(478,0);ctx.lineTo(755,0);ctx.lineTo(743,150);ctx.lineTo(570,145);}
  else if(arenaIndex===3){ctx.moveTo(430,0);ctx.lineTo(1025,0);ctx.lineTo(1000,140);ctx.lineTo(690,145);}
  else{ctx.moveTo(335,0);ctx.lineTo(1130,0);ctx.lineTo(1100,160);ctx.lineTo(570,205);}
  ctx.closePath();ctx.clip();haze(70,.14,'115,135,174');haze(105,.13,'16,24,45');ctx.restore();
  const moon=arenaIndex===3?[810,65]:arenaIndex===4?[635,55]:[937,94];arenaGlow(...moon,135,'128,171,237',.025+.035*pulse);
  if(arenaIndex!==4)haze(arenaIndex===8?310:400,.055);
 }
 if(arenaIndex===7){arenaGlow(310,225,280,'255,189,107',.04+.04*pulse);haze(370,.025,'194,177,144');}
 if(arenaIndex===9){for(const [x,y] of [[201,187],[1017,230],[617,355],[764,355]])arenaGlow(x,y,65,'255,182,90',.035+.025*pulse);}
 if([1,2,6,11].includes(arenaIndex)){haze(390,.025,arenaIndex===11?'173,173,173':'140,165,189');arenaGlow(640,140,350,arenaIndex===11?'210,210,210':'161,198,231',.018+.018*pulse);}
 ctx.restore();
}

function drawFighter(f){
 if(grapple){drawGrappleFighter(f);return;}
 if(roundEnd?.loser===f){drawDirectionalFall(f,Math.min(1,roundEnd.elapsed/.75));return;}
 if(!roundEnd&&f.y>0&&f.actionTime>0&&f.attackLevel==='air'&&drawAirAttack(f))return;
 if(roundEnd?.winner===f&&roundEnd.elapsed>=1&&drawCustomVictory(f,roundEnd.elapsed-1))return;
 if(f.downTime>0&&!roundEnd){drawKnockdown(f);return;}
 if(!roundEnd&&f.actionTime===0&&(f.jumpPrep>0||f.landTime>0||f.y>0)&&drawJumpFighter(f))return;

 if(f.walking&&f.actionTime===0&&!f.crouch&&!f.block&&f.stun===0&&f.y===0&&!roundEnd&&walkFrames[f.id]?.length){drawWalker(f);return;}
 if(newRoster[f.id]){drawNewFighter(f);return;}
 const row=f.id==='freddy'?0:1,r=roundEnd;if(isSnake(f)&&snakeFrame&&!r){drawSnake(f);return;}
 let pose=f.stun>0?4:f.actionTime>0?({punch:2,kick:3,super:5}[f.action]||0):f.block?4:0;
 if(f.action==='super'&&f.actionTime>0){const elapsed=f.actionTotal-f.actionTime;pose=f.id==='nancy'?(elapsed>=1?2:5):f.superLevel===1?(elapsed<.22?4:2):(Math.floor(elapsed*15)%2?2:5);}
 const lowAttack=f.actionTime>0&&f.attackLevel==='low'&&(f.action==='punch'||f.action==='kick');
 let custom=-1;if(lowAttack)custom=f.action==='punch'?0:1;
 const defeated=r&&r.loser===f,fall=defeated?Math.min(1,r.elapsed/.75):0;
 if(defeated&&fall>=1)custom=2;else if(r&&r.winner===f&&r.elapsed>=1){custom=3;if(f.id==='freddy'&&victorySlashProgress(r.elapsed)!==null){custom=-1;pose=2;}}
 const artPose=custom>=0?poseFrames[row][custom]:null;
 const extra=!artPose&&(f.crouch||lowAttack)?movementFrames[row][0]:!artPose&&f.y>0&&f.action==='kick'&&f.actionTime>0?movementFrames[row][1]:null;
 const propIndex=f.id==='nancy'&&f.action==='super'&&f.actionTime>0&&f.superLevel<3?(f.superLevel===1?3:f.actionTotal-f.actionTime<.3?1:2):-1;const propPose=propIndex>=0?propFrames[propIndex]:null;const frame=propPose||artPose||extra||frames[row][pose];if(!frame)return;
 let height=propPose?300:artPose?[200,190,95,380][custom]:extra?(f.crouch||lowAttack?190:215):frame.h*300/frames[row][0].h;
 if(artPose&&custom===2)height=340*frame.h/frame.w;
 const width=frame.w/frame.h*height,anchor=propPose?(propIndex===1?.5:.32):artPose?[.32,.27,.5,.5][custom]:extra?.48:[.5,.5,.3,.25,.5,.28][pose];
 ctx.save();ctx.globalAlpha=.4;ctx.fillStyle='#070711';ctx.beginPath();ctx.ellipse(f.x,FLOOR+5,defeated?110:65,12,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.translate(f.x,FLOOR-f.y);ctx.scale(f.face,1);
 if(defeated&&fall<1){ctx.translate(-40*fall,-Math.sin(fall*Math.PI)*30);ctx.rotate(-fall*Math.PI/2);}
 else if(!r&&f.actionTime===0&&!f.block&&f.y===0&&!f.crouch)ctx.translate(0,Math.sin(t*5)*2);
 if(f.poison>0)ctx.filter='sepia(1) saturate(7) hue-rotate(55deg)';else if(f.flash>0&&!r)ctx.filter='brightness(1.8)';
 ctx.drawImage(propPose?propArt:artPose?poseArt[row]:extra?movementArt:fighterArt[row],frame.x,frame.y,frame.w,frame.h,-width*anchor,-height,width,height);ctx.restore();
}
// All lying frames have their head on the left in source artwork.
function fallDirection(f){return f.fallDir||-f.face;}
function drawDirectionalFall(f,u){
 const dir=fallDirection(f),row=f.id==='freddy'?0:1,art=newRoster[f.id];
 const img=art?art.img:poseArt[row],frame=art?art.frames[9]:poseFrames[row][2];
 if(!frame)return;
 const v=smooth(u),h=340*frame.h/frame.w,x=Math.max(175,Math.min(W-175,f.x+dir*35*v));
 shadow({...f,x});
 if(u<.85){
  const a=recoveryArt(f,'guard');if(a.frame){const height=300,width=height*a.frame.w/a.frame.h;
   ctx.save();ctx.globalAlpha=1-smooth((u-.6)/.25);
   ctx.translate(x,FLOOR-(150*(1-v)+h/2*v)-Math.sin(Math.PI*u)*35);
   ctx.rotate(dir*v*Math.PI/2);ctx.scale(f.face,1);
   ctx.drawImage(a.img,a.frame.x,a.frame.y,a.frame.w,a.frame.h,-width/2,-height/2,width,height);ctx.restore();
  }
 }
 if(u>.6){ctx.save();ctx.globalAlpha=smooth((u-.6)/.25);if(f.poison>0)ctx.filter='sepia(1) saturate(7) hue-rotate(55deg)';spriteDraw(img,frame,{...f,x,y:0,face:-dir},h);ctx.restore();}
}
function drawKnockdown(f){const elapsed=1.7-f.downTime;if(elapsed>=1.05){drawGetUp(f,(elapsed-1.05)/.65);return;}drawDirectionalFall(f,Math.min(1,elapsed/.4));}
function recoveryArt(f,pose){const art=newRoster[f.id];if(art)return{img:art.img,frame:art.frames[{ground:7,kneel:6,stand:0,guard:5}[pose]]};const row=f.id==='freddy'?0:1;if(pose==='ground')return{img:poseArt[row],frame:poseFrames[row][1]};if(pose==='kneel')return{img:movementArt,frame:movementFrames[row][0]};return{img:fighterArt[row],frame:frames[row][pose==='guard'?4:0]};}
function drawGetUp(f,u){shadow(f);const grounded={...f,x:Math.max(175,Math.min(W-175,f.x+fallDirection(f)*35))*(1-smooth(u))+f.x*smooth(u),y:0},pose=u<.28?'ground':'kneel',a=recoveryArt(f,pose);if(!a.frame)return;const blend=Math.max(0,Math.min(1,(u-.76)/.24));ctx.save();ctx.globalAlpha=1-blend;spriteDraw(a.img,a.frame,grounded,pose==='ground'?160:190,.5);ctx.restore();if(blend>0){const b=recoveryArt(f,'stand');ctx.save();ctx.globalAlpha=blend;ctx.translate(f.x,FLOOR);ctx.rotate(f.face*(1-blend)*.12);ctx.translate(-f.x,-FLOOR);spriteDraw(b.img,b.frame,grounded,300);ctx.restore();}}
function beginGrapple(a,b){grapple={attacker:a,victim:b,elapsed:0};for(const f of [a,b]){f.move=0;f.walking=false;f.vy=0;f.airVx=0;f.block=false;f.crouch=false;}b.action='idle';b.actionTime=0;b.stun=1;a.x=Math.max(180,Math.min(W-180,a.x));b.x=a.x+a.face*90;tone(100,.15,'triangle');}
function grapplePose(elapsed){if(elapsed<.18)return{stage:'grab',lift:0,turn:0};if(elapsed<.58){const u=(elapsed-.18)/.4,v=u*u*(3-2*u);return{stage:'lift',lift:180*v,turn:v};}if(elapsed<.7)return{stage:'hold',lift:180,turn:1};const u=Math.min(1,(elapsed-.7)/.25);return{stage:'slam',lift:180-285*u*u,turn:1};}
function updateGrapple(dt){const g=grapple;g.elapsed+=dt;const pose=grapplePose(g.elapsed);g.victim.x=Math.max(170,Math.min(W-170,g.attacker.x+g.attacker.face*(pose.stage==='slam'?145:85)));g.victim.y=Math.max(0,pose.lift);if(g.elapsed>=.95){grapple=null;g.victim.y=0;g.victim.stun=0;g.attacker.slammed=true;g.attacker.actionTime=.22;g.attacker.cooldown=.35;hit(g.attacker,g.victim,15,0,true,'mid',true);if(phase===1){g.victim.downTime=1.3;g.victim.downLanded=true;}else if(roundEnd?.loser===g.victim){roundEnd.elapsed=.8;roundEnd.landed=true;}groundDust(g.victim.x);shake=17;tone(45,.25,'square',.04);}}
function drawGrappleFighter(f){const g=grapple,pose=grapplePose(g.elapsed);shadow(f);if(f===g.attacker&&f.id==='jesse'){const low=pose.stage==='slam';spriteDraw(newRoster.jesse.img,newRoster.jesse.frames[low?6:11],{...f,y:0},low?190:275,.32);return;}if(f===g.attacker){const index=pose.stage==='grab'?0:pose.stage==='slam'?2:1,frame=tackleFrames[index];if(frame)spriteDraw(tackleArt,frame,{...f,y:0},[210,330,230][index],.45);return;}const a=recoveryArt(f,'guard');if(!a.frame)return;const h=300,w=h*a.frame.w/a.frame.h;ctx.save();ctx.translate(f.x,FLOOR-(150+pose.lift));ctx.rotate(-g.attacker.face*pose.turn*Math.PI/2);ctx.scale(f.face,1);ctx.drawImage(a.img,a.frame.x,a.frame.y,a.frame.w,a.frame.h,-w/2,-h/2,w,h);ctx.restore();}

function drawStatusEffect(f){if(!f.burn)return;ctx.save();ctx.globalAlpha=Math.min(1,f.burn);ctx.shadowColor='#ff6928';ctx.shadowBlur=20;const prone=f.downTime>0||roundEnd?.loser===f;for(let i=0;i<12;i++){const x=f.x+(i-5.5)*(prone?21:10),y=FLOOR-f.y-(prone?12:15),h=(prone?75:170)+Math.sin(t*18+i*2)*30;ctx.fillStyle=i%2?'#ffb52d':'#ff5425';ctx.beginPath();ctx.moveTo(x-10,y);ctx.quadraticCurveTo(x-22,y-h*.5,x+Math.sin(t*10+i)*15,y-h);ctx.quadraticCurveTo(x+22,y-h*.4,x+10,y);ctx.fill();}ctx.restore();}
function victorySlashProgress(elapsed){for(const start of [1.7,2.8])if(elapsed>=start&&elapsed<start+.45)return(elapsed-start)/.45;return null;}
function drawVictorySlash(){if(!roundEnd||roundEnd.winner?.id!=='freddy')return;const u=victorySlashProgress(roundEnd.elapsed);if(u===null)return;const f=roundEnd.winner;ctx.save();ctx.translate(f.x,FLOOR);ctx.scale(f.face,1);ctx.globalAlpha=Math.sin(Math.PI*u);ctx.shadowColor='#ff5248';ctx.shadowBlur=17;for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#fff2d5':'#ff7965';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(20+i*16,-330);ctx.quadraticCurveTo(130+i*18,-260,170+i*18,-130);ctx.stroke();}ctx.restore();}
function drawSnake(f){const frame=snakeFrame,elapsed=f.actionTotal-f.actionTime,bob=Math.sin(elapsed*12)*17;ctx.save();ctx.globalAlpha=.4;ctx.fillStyle='#070711';ctx.beginPath();ctx.ellipse(f.x-100*f.face,FLOOR+5,300,23,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.save();ctx.translate(f.x,FLOOR-12-bob);ctx.scale(f.face,1);ctx.rotate(Math.sin(elapsed*9)*.045);const height=450,width=height*frame.w/frame.h;ctx.shadowColor='#bb4938';ctx.shadowBlur=12;ctx.drawImage(snakeArt,frame.x,frame.y,frame.w,frame.h,-width*.82,-height,width,height);ctx.restore();}

function drawSkateboard(){ctx.save();ctx.lineCap='round';line(-12,0,100,0,'#b97645',28);line(-8,-6,96,-6,'#30323d',19);for(const x of [5,83]){line(x,10,x,22,'#b9c3cb',5);ctx.fillStyle='#e5d9b6';ctx.beginPath();ctx.arc(x,23,9,0,Math.PI*2);ctx.fill();}ctx.restore();}
function drawBurnedArm(f,x,y){ctx.save();const sx=f.x+f.face*28,sy=FLOOR-(f.slammed?125:205);ctx.lineCap='round';ctx.strokeStyle='#150e12';ctx.lineWidth=32;ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo((sx+x)/2,sy-30,x,y);ctx.stroke();ctx.strokeStyle='#86483b';ctx.lineWidth=23;ctx.stroke();ctx.strokeStyle='#bc7257';ctx.lineWidth=4;ctx.stroke();ctx.translate(x,y);ctx.scale(f.face,1);ctx.fillStyle='#713c32';ctx.strokeStyle='#1c1012';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,30,23,0,0,Math.PI*2);ctx.fill();ctx.stroke();for(let i=0;i<4;i++){const yy=-18+i*11;line(13,yy,34,yy+5,'#25151b',12);line(13,yy,34,yy+5,'#ac6250',7);ctx.fillStyle='#e8f4ff';ctx.strokeStyle='#384552';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(32,yy+1);ctx.lineTo(84,yy+21);ctx.lineTo(35,yy+10);ctx.closePath();ctx.fill();ctx.stroke();}ctx.restore();}
function drawFireStream(x,y,length,age){ctx.save();ctx.translate(x,y);ctx.shadowColor='#ff771b';ctx.shadowBlur=22;for(let i=0;i<18;i++){const u=i/17,xx=u*length,yy=Math.sin(age*35+i*2)*14*(1+u),r=13+u*38;ctx.globalAlpha=.85-u*.25;ctx.fillStyle=i%3?'#ff7625':'#ffbf38';ctx.beginPath();ctx.ellipse(xx,yy,r*1.5,r,Math.sin(age*15+i)*.3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=.8;ctx.strokeStyle='#fff4ae';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(length*.5,Math.sin(age*30)*20,length*.82,0);ctx.stroke();ctx.restore();}

function drawSupers(){
 if(!p||mode==='menu')return;
 for(const f of [p,e]){if(f.action!=='super'||f.actionTime<=0)continue;const elapsed=f.actionTotal-f.actionTime;ctx.save();
 if(f.id==='jesse'){
  if(f.superLevel===2&&!grapple&&elapsed>.14&&elapsed<.6)drawBurnedArm(f,f.x+f.face*(90+70*Math.sin(Math.min(1,(elapsed-.14)/.46)*Math.PI)),FLOOR-180);
  if(f.superLevel===3&&elapsed>.18&&elapsed<1.1){ctx.translate(f.x,FLOOR);ctx.scale(f.face,1);drawFireStream(120,-205,170,elapsed);}
 }else if(f.id==='mark'){
  ctx.translate(f.x,FLOOR);ctx.scale(f.face,1);
  if(f.superLevel===2){/* Skateboard stays in both hands in the dedicated swing poses. */}
  else if(f.superLevel===3&&elapsed>=.25&&elapsed<.85){const power=Math.sin(Math.min(1,(elapsed-.25)/.6)*Math.PI);ctx.shadowColor='#ff8a18';ctx.shadowBlur=25;for(const x of [130,200]){ctx.fillStyle='#ffe768';ctx.beginPath();ctx.ellipse(x,-240,12+power*20,10+power*15,0,0,Math.PI*2);ctx.fill();if(elapsed>=.42){line(x,-240,260,-220,'#ff8a19',20);line(x,-240,260,-220,'#fff0a8',8);}}}
  else if(f.superLevel===1&&elapsed>=.25&&elapsed<(f.superLevel===1?.38:1.4)){const pulse=(elapsed-.25)%.11;if(pulse<.055){const mx=Math.floor((elapsed-.25)/.11)%2?130:200,y=-240;ctx.translate(mx-125,0);ctx.fillStyle='#fff4aa';ctx.shadowColor='#ffb237';ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(125,y);ctx.lineTo(158,y-18);ctx.lineTo(150,y);ctx.lineTo(168,y+10);ctx.lineTo(140,y+12);ctx.closePath();ctx.fill();}}
 }else if(['will','alice','rick'].includes(f.id)){
  ctx.translate(f.x,FLOOR-f.y);ctx.scale(f.face,1);
  if(f.superLevel===2&&elapsed>.25&&elapsed<1.12){
   const u=Math.min(1,(elapsed-.25)/.3),hx=f.id==='will'?230:187,hy=f.id==='will'?-230:-232;
   if(f.id==='will'){ctx.translate(hx,hy);ctx.rotate(-1.1+u*2.1);ctx.shadowColor='#76ff76';ctx.shadowBlur=20;line(0,8,95,-65,'#3a261c',9);line(0,8,95,-65,'#96ff83',4);ctx.fillStyle='#d6ffbb';ctx.beginPath();ctx.arc(95,-65,9+Math.sin(t*30)*2,0,Math.PI*2);ctx.fill();}
   else{ctx.translate(hx,hy);const a=elapsed*29;line(-12,0,35,0,'#d0a16b',9);line(35,0,35+Math.cos(a)*33,Math.sin(a)*33,'#d7deea',3);line(35+Math.cos(a)*33,Math.sin(a)*33,35+Math.cos(a)*105,Math.sin(a)*105,'#9c5a30',10);for(let k=0;k<3;k++){ctx.globalAlpha=.22-k*.05;ctx.strokeStyle='#c6dcff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(35,0,100-k*8,a-.9,a);ctx.stroke();}}
  }
  if(f.id!=='rick'&&f.superLevel===3&&elapsed>.18&&elapsed<1.18){const green=f.id==='will',color=green?'#65ff70':'#60c7ff',starts=green?[[215,-222],[200,-207]]:[[152,-256]];ctx.shadowColor=color;ctx.shadowBlur=25;for(const [sx,sy] of starts){ctx.globalAlpha=Math.min(1,(elapsed-.18)/.2);ctx.fillStyle=color;ctx.beginPath();ctx.arc(sx,sy,12+Math.sin(t*35)*3,0,Math.PI*2);ctx.fill();if(elapsed>=.44){ctx.globalAlpha=.5;line(sx,sy,1000,sy,color,28+Math.sin(t*40)*5);ctx.globalAlpha=1;line(sx,sy,1000,sy,color,12);line(sx,sy,1000,sy,'#efffff',4);}}}
 }else if(f.id==='kristen'&&f.superLevel===3){
  const target=f.superTarget;ctx.strokeStyle='#c3b3ff';ctx.shadowColor='#9b65ff';ctx.shadowBlur=18;
  const cx=f.x+f.face*100,cy=FLOOR-125;
  for(let i=0;i<5;i++){ctx.globalAlpha=.25+i*.1;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(cx,cy,30+i*9,45+i*15,t*4+i*.3,0,Math.PI*2);ctx.stroke();}
  if(target&&elapsed<1.02){for(let i=0;i<8;i++){let u=(t*2+i/8)%1;const x=target.x+(cx-target.x)*u;ctx.globalAlpha=u*.8;ctx.fillStyle='#ddd1ff';ctx.beginPath();ctx.arc(x,cy+Math.sin(u*6+i)*35,3+u*4,0,Math.PI*2);ctx.fill();}}
  }else if(f.id==='freddy'&&f.superLevel===1&&elapsed>.17&&elapsed<.65){
  const u=Math.min(1,(elapsed-.17)/.48);ctx.translate(f.x,FLOOR);ctx.scale(f.face,1);ctx.globalAlpha=Math.sin(Math.PI*u);ctx.shadowColor='#ff7960';ctx.shadowBlur=20;
  // One continuous four-blade sweep, visibly different from the repeated barrage.
  for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#fff0ce':'#ff9a70';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(10+i*13,-300);ctx.quadraticCurveTo(170+i*13,-330,285+i*10,-80);ctx.stroke();}
 }else if((f.id==='freddy'||f.id==='taryn')&&f.superLevel===2&&elapsed>.25&&elapsed<1.25){ctx.translate(f.x+f.face*110,FLOOR-150);ctx.scale(f.face,1);ctx.rotate(Math.sin(elapsed*45)*.7);ctx.shadowColor='#ff5747';ctx.shadowBlur=18;
  for(let i=0;i<4;i++){ctx.strokeStyle=i%2?'#ffe7cc':'#ff6c55';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-70,-80+i*29);ctx.quadraticCurveTo(35,-45+i*22,80,45+i*20);ctx.stroke();}
 }ctx.restore();}
}
// Keep one fixed full-screen background; jump framing applies only to fighters and effects.
function draw(dt){arena();ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake=Math.max(0,shake-dt*40);}if(p&&mode!=='menu'){drawFighter(e);drawFighter(p);}else if(ready){const a=fighter('freddy',880);a.face=-1;drawFighter(a);}
drawSupers();if(grapple?.attacker.id==='jesse'){const pose=grapplePose(grapple.elapsed);drawBurnedArm(grapple.attacker,grapple.victim.x-grapple.attacker.face*10,FLOOR-(150+pose.lift));}if(p&&mode!=='menu')for(const f of [p,e])drawStatusEffect(f);drawVictorySlash();drawDebris();for(const q of projectiles)drawProjectile(q);if(carImpact)drawProjectile(carImpact);

for(let i=particles.length-1;i>=0;i--){const a=particles[i];if(mode==='fight'){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=650*dt;a.life-=dt;}ctx.globalAlpha=Math.max(0,a.life*2);rect(a.x,a.y,5,5,a.color);if(a.life<=0)particles.splice(i,1);}ctx.globalAlpha=1;ctx.restore();if(flash>0){ctx.fillStyle=`rgba(233,196,255,${flash})`;ctx.fillRect(0,0,W,H);flash=Math.max(0,flash-dt);}if(transition){const u=transition.elapsed;ctx.fillStyle='rgba(7,5,12,'+Math.max(0,1-Math.abs(u-.6)/.22)+')';ctx.fillRect(0,0,W,H);if(u<.55){const x=transition.dir>0?W-20:20;for(let i=0;i<10;i++)line(x,80+i*55,x-transition.dir*(40+i%3*45),100+i*55,'#f4cf9e',2);}}if(comboTime>0&&combo>1&&mode==='fight'){ctx.font='italic bold 32px Arial';ctx.fillStyle='#ffd6aa';ctx.fillText(combo+' HIT COMBO',60,170);} }
function loop(now){const dt=Math.min(.035,(now-last)/1000||.016);last=now;if(mode!=='pause')t+=dt;update(dt);draw(dt);requestAnimationFrame(loop)}

const newFighterBoxes={jesse:[[55,9,290,341],[432,65,714,336],[828,46,1024,328],[44,383,377,693],[417,354,762,699],[796,376,1037,695],[24,802,367,1024],[412,812,760,1026],[739,721,1071,925],[33,1308,406,1411],[442,1031,689,1412],[745,1099,1072,1402]],mark:[[53,18,310,333],[458,67,694,331],[844,83,1057,330],[19,391,358,687],[400,370,769,687],[806,385,1067,682],[67,778,333,998],[395,791,745,999],[741,698,1079,920],[13,1264,417,1362],[430,1014,703,1369],[758,1062,1075,1366]],rick:[[79,13,304,363],[425,13,661,361],[798,14,986,359],[37,409,368,736],[414,404,759,743],[783,409,1027,737],[52,847,324,1055],[379,843,734,1038],[717,761,1074,982],[18,1326,423,1408],[435,1038,663,1431],[707,1120,1071,1407]],dan:[[57,19,301,359],[429,10,663,357],[784,10,988,355],[30,387,375,728],[414,387,768,728],[786,389,1040,727],[39,802,324,1030],[343,831,742,1031],[712,741,1073,955],[21,1269,433,1379],[446,1041,649,1430],[672,1198,1064,1394]],"will": [[37, 12, 328, 322], [408, 41, 706, 314], [785, 43, 1053, 314], [20, 385, 400, 690], [421, 375, 754, 699], [767, 383, 1052, 688], [13, 796, 357, 1012], [371, 819, 750, 1005], [722, 716, 1079, 931], [18, 1280, 401, 1397], [402, 1029, 687, 1398], [717, 1093, 1067, 1391]], "alice": [[89, 2, 310, 338], [431, 47, 667, 334], [831, 43, 1034, 333], [51, 355, 378, 687], [439, 345, 778, 693], [817, 359, 1051, 687], [52, 750, 376, 984], [422, 775, 798, 982], [787, 693, 1077, 941], [17, 1305, 430, 1384], [455, 997, 691, 1388], [792, 1036, 1047, 1385]]};
const newRoster={jesse:{img:new Image(),frames:[]},mark:{img:new Image(),frames:[]},dan:{img:new Image(),frames:[]},rick:{img:new Image(),frames:[]},will:{img:new Image(),frames:[]},alice:{img:new Image(),frames:[]},taryn:{img:new Image(),frames:[]},kristen:{img:new Image(),frames:[]},joey:{img:new Image(),frames:[]},kincaid:{img:new Image(),frames:[]}};
const walkArt={freddy:new Image(),nancy:new Image(),joey:new Image(),kincaid:new Image()},walkFrames={freddy:[],nancy:[],joey:[],kincaid:[]};
const tackleArt=new Image(),tackleFrames=[];
const bikeArt=new Image();let bikeFrame=null;
const slapArt=new Image();let slapFrame=null;
const flipArt=new Image(),flipFrames=[];
const newProps=new Image(),newPropFrames=[];let loadedNewArt=0;
function atlas(img,cols,rows){const out=[],w=Math.floor(img.width/cols),h=Math.floor(img.height/rows);for(let i=0;i<cols*rows;i++)out.push(alphaBounds(img,(i%cols)*w,Math.floor(i/cols)*h,w,h));return out;}
function spriteDraw(img,frame,f,height,anchor=.5){const width=height*frame.w/frame.h;ctx.save();ctx.translate(f.x,FLOOR-f.y);ctx.scale(f.face,1);if(f.poison>0)ctx.filter='sepia(1) saturate(7) hue-rotate(55deg)';else if(f.flash>0&&!roundEnd)ctx.filter='brightness(1.8)';ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h,-width*anchor,-height,width,height);ctx.restore();}
function shadow(f){ctx.save();ctx.fillStyle='#07071166';ctx.beginPath();ctx.ellipse(f.x,FLOOR+5,65,12,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function walkIndex(f){return ((Math.floor(f.walkPhase)%4)+4)%4;}
function drawWalker(f){shadow(f);const fs=walkFrames[f.id],frame=fs[walkIndex(f)],scale=300/Math.max(...fs.map(x=>x.h));spriteDraw(walkArt[f.id],frame,f,f.id==='freddy'?frame.h*scale:300);}

const victoryLines={freddy:'Welcome to my nightmare. Ha, ha, ha!',nancy:"It's only a dream.",alice:'No more nightmares.',taryn:"I'm beautiful and I'm bad.",kristen:'You have bags under your eyes.',kincaid:"You wasn't strong enough.",rick:"How you're gonna fight me?",will:'I am the Wizard Master.',joey:'I have better things to dream about.',dan:'I have a present for yah.',jesse:'There is no Jesse.'};
const victoryRecordings=Object.fromEntries(['mark','taryn','dan','joey','will','rick','kristen','nancy','freddy','alice','jesse','kincaid'].map(id=>[id,'audio/'+id+'-victory.mp3']));
const victoryBuffers={};let recordingSource=null,recordingPending=false;
let voiceGeneration=0;
function loadVictoryRecording(id){
 if(!victoryRecordings[id]||!audio||typeof fetch!=='function')return Promise.resolve(null);
 return victoryBuffers[id]??=(fetch(victoryRecordings[id]).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.arrayBuffer();}).then(data=>audio.decodeAudioData(data)).catch(()=>{delete victoryBuffers[id];return null;}));
}
function victoryVoicePlaying(){return recordingPending||!!recordingSource||!!window.speechSynthesis?.speaking;}
function speakVictory(id){
 cancelVictoryVoice();if(!sound)return;
 if(!victoryRecordings[id]){speakSyntheticVictory(id);return;}
 unlockSound();const generation=voiceGeneration;recordingPending=true;
 loadVictoryRecording(id).then(buffer=>{
  if(generation!==voiceGeneration||!sound)return;
  recordingPending=false;
  if(!buffer){speakSyntheticVictory(id);return;}
  try{const src=audio.createBufferSource();src.buffer=buffer;src.connect(audio.destination);recordingSource=src;
   src.onended=()=>{if(recordingSource===src){recordingSource=null;src.disconnect();}};src.start();
  }catch{recordingSource=null;speakSyntheticVictory(id);}
 });
}
function cancelVictoryVoice(){voiceGeneration++;recordingPending=false;if(recordingSource){const src=recordingSource;recordingSource=null;try{src.stop();src.disconnect();}catch{}}try{window.speechSynthesis?.cancel();}catch{}}
function unlockSound(){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();for(const id of Object.keys(victoryRecordings))loadVictoryRecording(id);window.speechSynthesis?.getVoices();}catch{}}
function selectVictoryVoice(voices,female){const english=voices.filter(v=>/^en(?:-|_)/i.test(v.lang));const names=female?/female|samantha|victoria|zira|susan|karen|moira|tessa|serena|ava|allison/i:/\bmale\b|david|daniel|alex\b|fred\b|tom\b|james|george|guy\b|lee\b/i;return english.find(v=>names.test(v.name))||english.find(v=>v.default)||english[0]||voices[0];}
function speakSyntheticVictory(id){const text= victoryLines[id];if(!text)return;$('#status').textContent=text;if(!sound)return;try{const synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance;if(!synth||!Utterance){$('#status').textContent=text+' · Voice unavailable in this browser';return;}cancelVictoryVoice();const generation=voiceGeneration,evil=id==='freddy'||id==='jesse',female=['nancy','alice','taryn','kristen'].includes(id),u=new Utterance(text),voice=selectVictoryVoice(synth.getVoices(),female);if(voice)u.voice=voice;u.lang='en-US';u.pitch=evil?.55:female?1.12:.78;u.rate=evil?.84:id==='will'?.91:1;u.volume=1;u.onend=()=>{if(evil&&sound&&generation===voiceGeneration)soundEffect('laugh');};u.onerror=()=>{if(generation===voiceGeneration)$('#status').textContent=text;};synth.speak(u);}catch{}}
const impactSounds={freddy:['rip','rip','bite'],nancy:['thud','bing','fire'],joey:['crash','punch','blast'],kincaid:['thud','bing','crash'],taryn:['rip','rip','rip'],kristen:['glass','kick','punch'],will:['thud','bing','blast'],alice:['clatter','bing','blast'],dan:['thud','slam','crash'],rick:['rip','bing','punch'],jesse:['bing','slam','fire'],mark:['gun','bing','blast']};
function specialImpact(id,level){return impactSounds[id]?.[level-1]||'thud';}
function projectileImpact(type){return ({knife:'rip',star:'rip',bat:'bing',phone:'thud',tv:'crash',rock:'thud',car:'crash',bike:'crash',voice:'blast',bourbon:'glass',molotov:'fire',hellfire:'fire',powerblast:'blast',football:'thud',book:'thud',pearls:'clatter',bullet:'gun'})[type]||'thud';}
// Layered impact Foley: short body transients, ringing weapon harmonics,
// tearing noise and bass-heavy blast tails. No generic arcade beep on hits.
function soundEffect(kind){if(!sound)return;try{unlockSound();if(!audio)return;
 const config={punch:[.16,135,3000,.24],kick:[.12,180,2200,.14],thud:[.20,95,1500,.18],slam:[.38,65,1700,.25],bing:[.38,0,5500,.12],rip:[.26,0,6500,.15],slash:[.17,0,4200,.07],bite:[.3,65,2100,.19],glass:[.38,0,7600,.13],clatter:[.24,0,5000,.10],gun:[.27,90,6500,.19],wallbreak:[1.1,48,6800,.28],crash:[.65,55,4200,.22],charge:[.32,220,3000,.05],block:[.09,240,2300,.09],swing:[.12,0,2700,.035],land:[.15,70,900,.07],fire:[.85,45,1700,.16],blast:[.8,50,4500,.26],laugh:[.75,95,700,.04]}[kind]||[.15,100,1800,.1];
 const [dur,low,cut,vol]=config,now=audio.currentTime,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*dur),audio.sampleRate),data=buffer.getChannelData(0);
 let smoothNoise=0;for(let i=0;i<data.length;i++){const sec=i/audio.sampleRate,u=i/data.length,noise=Math.random()*2-1;smoothNoise=.85*smoothNoise+.15*noise;
 let env=Math.exp(-u*7),sample=noise;
 if(['punch','kick','thud','slam','land','bite'].includes(kind)){env=Math.exp(-u*10);sample=.7*smoothNoise+.3*noise;}
 if(kind==='bing'){sample=.18*noise+Math.sin(sec*2*Math.PI*780)*.5+Math.sin(sec*2*Math.PI*1275)*.25+Math.sin(sec*2*Math.PI*2310)*.12;env=Math.exp(-u*6);}
 if(kind==='rip'||kind==='slash'){env=Math.sin(Math.PI*u)*Math.exp(-u*2);sample=noise*(.4+.6*Math.abs(Math.sin(sec*190)));}
 if(kind==='glass'||kind==='clatter'){env=Math.exp(-u*5);sample=noise*Math.pow(Math.max(0,Math.sin(sec*160)),4)+Math.sin(sec*2*Math.PI*3300)*.14;}
 if(['blast','crash','gun'].includes(kind)){env=Math.exp(-u*5);sample=noise*(.45+.55*Math.exp(-u*20))+.7*smoothNoise;}
 if(kind==='wallbreak'){const cracks=Math.pow(Math.max(0,Math.sin(sec*97)),12);sample=.7*smoothNoise+noise*(.3+cracks);env=Math.exp(-u*3.5);}
 if(kind==='fire'){env=Math.sin(Math.PI*Math.min(1,u*3))*Math.pow(1-u,.7);sample=smoothNoise*2+noise*.15;}
 if(kind==='laugh')env=Math.pow(1-u,1.8)*Math.max(0,Math.sin(u*28));
 data[i]=Math.max(-1,Math.min(1,sample*env));}
 const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();src.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(cut,now);gain.gain.setValueAtTime(vol,now);gain.gain.exponentialRampToValueAtTime(.001,now+dur);src.connect(filter).connect(gain).connect(audio.destination);src.start();src.stop(now+dur);
 if(low){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(low,now);o.frequency.exponentialRampToValueAtTime(['blast','slam','crash','wallbreak'].includes(kind)?25:55,now+dur);g.gain.setValueAtTime(vol*.8,now);g.gain.exponentialRampToValueAtTime(.001,now+dur);o.connect(g).connect(audio.destination);o.start();o.stop(now+dur);}
 }catch{}}

const jumpGroups=[['freddy','nancy','joey','kincaid'],['taryn','kristen','will','alice'],['dan','rick','jesse','mark']],jumpSheets=[],jumpPoses={};
const jumpBoxes=[[[38, 62, 264, 349], [386, 17, 655, 286], [750, 56, 1037, 357], [37, 392, 264, 732], [437, 366, 672, 642], [777, 389, 1070, 735], [36, 776, 285, 1063], [435, 716, 685, 984], [787, 745, 1066, 1069], [37, 1103, 289, 1425], [447, 1040, 713, 1333], [773, 1101, 1074, 1423]], [[42, 63, 277, 380], [422, 30, 666, 325], [782, 71, 1048, 387], [47, 412, 273, 707], [460, 380, 659, 654], [784, 395, 1057, 719], [9, 780, 280, 1052], [366, 717, 699, 996], [729, 733, 1073, 1050], [29, 1090, 283, 1417], [400, 1032, 690, 1336], [766, 1058, 1074, 1416]], [[59, 65, 291, 366], [455, 23, 682, 310], [778, 22, 1057, 375], [54, 422, 286, 725], [458, 371, 697, 650], [800, 389, 1069, 733], [28, 777, 315, 1063], [396, 714, 710, 985], [773, 745, 1073, 1082], [47, 1114, 330, 1421], [435, 1054, 673, 1348], [783, 1090, 1065, 1429]]];
for(let g=0;g<3;g++){const img=new Image();jumpSheets.push(img);img.onload=()=>{for(let row=0;row<4;row++){const fs=jumpBoxes[g].slice(row*3,row*3+3).map(([x,y,x2,y2])=>({x,y,w:x2-x,h:y2-y}));jumpPoses[jumpGroups[g][row]]={img,frames:fs};}loadedNewArt++;finishArtwork();};img.onerror=()=>{$('#loading').textContent='Jump artwork could not load. Please refresh.';};img.src='jump-'+['a','b','c'][g]+'-v18.png';}
const polishArt=new Image(),polishFrames=[],polishBoxes=[[341, 7, 531, 285], [687, 3, 878, 285], [1032, 7, 1224, 285], [333, 287, 539, 571], [673, 287, 879, 571], [1025, 287, 1230, 571], [366, 564, 507, 842], [366, 564, 507, 842], [1048, 564, 1205, 842], [348, 859, 513, 1022], [691, 766, 840, 1016], [1048, 843, 1247, 1022]];
polishArt.onload=()=>{polishFrames.push(...polishBoxes.map(([x,y,x2,y2])=>({x,y,w:x2-x,h:y2-y})));loadedNewArt++;finishArtwork();};polishArt.onerror=()=>{$('#loading').textContent='Animation artwork could not load. Please refresh.';};polishArt.src='victories-v18.png';
function smooth(u){u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);}
function drawAirAttack(f){
 const art=newRoster[f.id],row=f.id==='freddy'?0:1,kick=f.action==='kick';
 const frame=art?art.frames[kick?8:3]:kick?movementFrames[row][1]:frames[row][2];
 const stand=art?art.frames[0]:frames[row][0];if(!frame||!stand)return false;
 const img=art?art.img:kick?movementArt:fighterArt[row];
 const scale=300/stand.h,h=frame.h*scale,w=frame.w*scale;
 shadow(f);ctx.save();ctx.translate(f.x,FLOOR-f.y-100);ctx.scale(f.face,1);
 // Rotate the attack toward the opponent below instead of striking straight across.
 ctx.rotate(kick?.55:.85);
 if(f.flash>0)ctx.filter='brightness(1.8)';
 ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h,-w*.32,-h*.5,w,h);ctx.restore();return true;
}
function drawJumpFighter(f){const art=jumpPoses[f.id];if(!art?.frames.length)return false;const index=f.jumpPrep>0||f.landTime>0?0:f.vy>80?1:2,frame=art.frames[index],scale=300/art.frames[2].h;shadow(f);spriteDraw(art.img,frame,f,frame.h*scale);return true;}
function backflipMotion(time){if(time<.22)return{stage:'crouch',u:time/.22,lift:0,rotation:0,x:0};if(time<1.32){const u=(time-.22)/1.1;return{stage:u<.14?'launch':u>.87?'extend':'tuck',u,lift:170*4*u*(1-u),rotation:-Math.PI*2*smooth((u-.14)/.73),x:-45*smooth(u)};}if(time<1.5)return{stage:'land',u:(time-1.32)/.18,lift:0,rotation:-Math.PI*2,x:-45};return{stage:'stand',u:1,lift:0,rotation:-Math.PI*2,x:-45};}
function drawBackflipVictory(f,time){const m=backflipMotion(time),art=jumpPoses.kristen;if(!art)return false;shadow(f);const x=f.x+f.face*m.x;if(m.stage==='stand'){spriteDraw(newRoster.kristen.img,newRoster.kristen.frames[0],{...f,x,y:0},300);return true;}if(m.stage==='crouch'||m.stage==='land'){const frame=art.frames[0];spriteDraw(art.img,frame,{...f,x,y:0},frame.h*300/art.frames[2].h);return true;}const tuck=m.stage==='tuck',frame=tuck?flipFrames[0]:art.frames[m.stage==='launch'?1:2],img=tuck?flipArt:art.img,h=tuck?175:265,w=h*frame.w/frame.h;ctx.save();ctx.translate(x,FLOOR-135-m.lift);ctx.scale(f.face,1);ctx.rotate(m.rotation);ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h,-w/2,-h/2,w,h);ctx.restore();return true;}
// Keep the full body fixed; animate only the forearm/hair region over the same anchor.
function drawPolishedVictory(f,time){const index={nancy:1,dan:4,taryn:6}[f.id],frame=polishFrames[index];if(!frame)return;shadow(f);const h=f.id==='taryn'?292:300,scale=h/frame.h,w=frame.w*scale;ctx.save();ctx.translate(f.x,FLOOR);ctx.scale(f.face,1);const draw=()=>ctx.drawImage(polishArt,frame.x,frame.y,frame.w,frame.h,-w/2,-h,w,h);if(f.id==='taryn'){draw();ctx.restore();return;}
 const toLocal=([x,y])=>[(x-frame.x)*scale-w/2,(y-frame.y)*scale-h];
 const regions=f.id==='nancy'?[[[790,5],[808,5],[830,30],[852,61],[851,82],[831,94],[809,82],[801,52],[785,25]]]:[[[771,334],[790,334],[790,386],[768,391],[758,380]],[[790,337],[812,344],[813,386],[790,387]]];
 const path=(points)=>{points.forEach((p,i)=>{const [x,y]=toLocal(p);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();};
 ctx.save();ctx.beginPath();ctx.rect(-w/2-2,-h-2,w+4,h+4);for(const poly of regions)path(poly);ctx.clip('evenodd');draw();ctx.restore();
 for(let i=0;i<regions.length;i++){ctx.save();if(f.id==='nancy'){const [px,py]=toLocal([817,85]),u=Math.min(1,time/1.65);ctx.translate(px,py);ctx.rotate(-.12*Math.sin(u*Math.PI));ctx.translate(-px,-py);}else ctx.translate(0,Math.sin(time*7)*(i===0?2.5:-2.5));ctx.beginPath();path(regions[i]);ctx.clip();draw();ctx.restore();}ctx.restore();}
const celebrationArt=new Image(),celebrationFrames=[];
const celebrationBoxes=[[145, 13, 339, 290], [492, 13, 687, 290], [854, 13, 1043, 291], [1193, 14, 1419, 293], [93, 293, 335, 569], [450, 293, 693, 565], [814, 291, 1033, 571], [1182, 294, 1405, 567], [87, 565, 304, 822], [474, 478, 697, 820], [825, 585, 1056, 822], [1189, 561, 1438, 826], [93, 813, 287, 1024], [441, 808, 682, 1024], [776, 822, 1159, 1023], [1206, 855, 1496, 1022]];
celebrationArt.onload=()=>{celebrationFrames.push(...celebrationBoxes.map(([x,y,x2,y2])=>({x,y,w:x2-x,h:y2-y})));loadedNewArt++;finishArtwork();};
celebrationArt.onerror=()=>{$('#loading').textContent='Victory artwork could not load. Please refresh.';};celebrationArt.src='celebrations-v17.png';
function drawCelebrationPose(f,a,b,u,height=300){const fa=celebrationFrames[a],fb=celebrationFrames[b];if(!fa||!fb)return;ctx.save();ctx.globalAlpha=1-u;spriteDraw(celebrationArt,fa,f,height);if(u>0){ctx.globalAlpha=u;spriteDraw(celebrationArt,fb,f,height);}ctx.restore();}
function victoryMotion(id,time){if(id==='rick'){const angle=time<.65?smooth(time/.65)*.68:time<1.5?.68:time<2.2?(1-smooth((time-1.5)/.7))*.68:0;return{lift:0,rotation:angle,stage:angle>0?'bow':'stand'};}if(id==='kristen')return backflipMotion(time);return{lift:0,rotation:0};}
function drawRickBow(f,time){const art=newRoster.rick,frame=art.frames[1];if(!frame)return;shadow(f);const h=300,scale=h/frame.h,w=frame.w*scale,split=Math.round(frame.h*.58),torso=split*scale,legs=h-torso,angle=victoryMotion('rick',time).rotation;ctx.save();ctx.translate(f.x,FLOOR);ctx.scale(f.face,1);ctx.drawImage(art.img,frame.x,frame.y+split,frame.w,frame.h-split,-w/2,-legs,w,legs);ctx.translate(0,-legs);ctx.rotate(angle);ctx.drawImage(art.img,frame.x,frame.y,frame.w,split+3,-w/2,-torso,w,torso+3*scale);ctx.restore();}
function drawCustomVictory(f,time){
 if(f.id==='rick'){drawRickBow(f,time);return true;}
 if(f.id==='kristen'&&flipFrames.length)return drawBackflipVictory(f,time);
 if(['nancy','dan','taryn'].includes(f.id)&&polishFrames.length){drawPolishedVictory(f,time);return true;}
 const map={nancy:[0,1,2],kincaid:[3,4,5],dan:[6,7,8],mark:[9,9,9],taryn:[12,13,13]},seq=map[f.id];if(!seq||!celebrationFrames.length)return false;shadow(f);
 const pace=f.id==='nancy'?.7:f.id==='kincaid'?.3:f.id==='dan'?.23:.55;
 const progress=f.id==='dan'?Math.min(5,time/pace):Math.min(2,time/pace),step=Math.floor(progress),a=f.id==='dan'?seq[step%3]:seq[Math.min(2,step)],b=f.id==='dan'?seq[Math.min(2,(step+1)%3)]:seq[Math.min(2,step+1)];
 drawCelebrationPose(f,a,b,progress-step,f.id==='mark'?365:f.id==='taryn'?230:310);
 return true;
}

function drawNewFighter(f){
 const art=newRoster[f.id],fs=art.frames;if(!fs.length)return;let i=0,height=300,anchor=.5;const r=roundEnd,elapsed=f.actionTotal-f.actionTime;
 if(f.stun>0||f.block)i=5;
 else if(f.actionTime>0){i=f.action==='punch'?3:f.action==='kick'?4:3;if(f.attackLevel==='low'&&f.action!=='super'){i=f.action==='punch'?6:7;height=190;}else if(f.y>0&&f.action==='kick'){i=8;height=240;}if(f.action==='super'&&f.superLevel===2)i=11;anchor=[3,4,7,8,11].includes(i)?.32:.5;}
 else if(f.crouch){i=6;height=190;anchor=.32;}
 else if(f.walking&&f.y===0)i=[1,0,2,0][walkIndex(f)];
 if(r?.loser===f){const fall=Math.min(1,r.elapsed/.75);if(fall>=1){i=9;height=340*fs[i].h/fs[i].w;}else{ctx.save();ctx.translate(f.x,FLOOR);ctx.rotate(-f.face*fall*Math.PI/2);ctx.translate(-f.x,-FLOOR);spriteDraw(art.img,fs[5],f,300);ctx.restore();return;}}
 else if(r?.winner===f&&r.elapsed>=1){i=10;height=340;anchor=.5;}
 shadow(f);
 if(!r&&f.id==='mark'&&f.action==='super'&&f.superLevel===2&&f.actionTime>0&&celebrationFrames.length){const u=Math.max(0,Math.min(1,(elapsed-.22)/.22));drawCelebrationPose(f,10,11,u,300);return;}
 if(!r&&f.id==='jesse'&&f.action==='super'&&f.superLevel===2&&f.actionTime>0&&celebrationFrames.length){spriteDraw(newRoster.jesse.img,newRoster.jesse.frames[f.slammed?6:11],f,f.slammed?190:275,.32);return;}
 if(!r&&f.id==='dan'&&f.slammed&&f.action==='super'&&f.actionTime>0&&tackleFrames[2]){spriteDraw(tackleArt,tackleFrames[2],f,230,.45);return;}
 if(!r&&f.action==='super'&&f.actionTime>0&&f.id==='kristen'&&f.superLevel===2&&flipFrames.length){drawForwardFlip(f,elapsed);return;}
 if(!r&&f.action==='super'&&f.actionTime>0&&((f.id==='taryn'&&f.superLevel===3)||(f.id==='kristen'&&f.superLevel===3))){i=f.id==='kristen'&&elapsed>=1?3:11;anchor=.32;}
 if(!r&&f.id==='taryn'&&f.action==='super'&&f.superLevel===2&&f.actionTime>0){i=Math.floor(elapsed*16)%2?3:5;anchor=.32;}
 if(!r&&['will','alice'].includes(f.id)&&f.action==='super'&&f.actionTime>0){i=f.superLevel===3?11:f.superLevel===2?(elapsed<.25?5:3):3;anchor=i===5?.5:.32;}
 if(!r&&f.action==='super'&&f.actionTime>0&&f.id==='dan'){i=f.superLevel===2?11:3;anchor=.32;}
 if(!r&&f.action==='super'&&f.actionTime>0&&f.id==='rick'){i=f.superLevel===3?(elapsed<.62?8:(Math.floor(elapsed*25)%2?3:11)):3;anchor=.32;}
 if(!r&&f.id==='rick'&&f.action==='super'&&f.superLevel===3&&f.actionTime>0&&elapsed<.62){spriteDraw(art.img,fs[8],{...f,y:45+Math.sin(Math.min(1,elapsed/.62)*Math.PI)*35},220,.32);return;}
 if(!r&&['jesse','mark'].includes(f.id)&&f.action==='super'&&f.actionTime>0){i=f.id==='mark'?(f.superLevel===2?3:11):(f.superLevel===3?11:3);anchor=.32;}
 if(f.id==='joey'&&f.action==='super'&&f.superLevel===2&&f.actionTime>0&&slapFrame){spriteDraw(slapArt,slapFrame,f,300,.32);}
 else if(f.id==='joey'&&f.action==='super'&&f.superLevel===3&&f.actionTime>0&&newPropFrames[3])spriteDraw(newProps,newPropFrames[3],f,300);
 else {if(!r&&!f.crouch&&![7,8].includes(i))height=f.walking&&f.actionTime===0?300:fs[i].h*300/fs[0].h;spriteDraw(art.img,fs[i],f,height,anchor);}
 if(!r&&f.id==='taryn'&&f.action==='super'&&f.actionTime>0&&f.superLevel===2){for(const dy of [0,50])drawProjectile({type:'knife',x:f.x+f.face*(110+Math.sin(elapsed*30+dy)*25),y:FLOOR-170+dy,face:f.face,age:0});}
}
function flipPose(elapsed){if(elapsed<.12)return{stage:'launch',rotation:0,lift:0};if(elapsed<.62){const u=(elapsed-.12)/.5;return{stage:'tuck',rotation:u*Math.PI*2,lift:Math.sin(u*Math.PI)*65};}if(elapsed<1.06)return{stage:'kick',rotation:0,lift:0};return{stage:'land',rotation:0,lift:0};}
function drawForwardFlip(f,elapsed){const pose=flipPose(elapsed);if(pose.stage==='launch'||pose.stage==='land'){spriteDraw(newRoster.kristen.img,newRoster.kristen.frames[0],f,300);return;}ctx.save();ctx.translate(f.x,FLOOR-155-pose.lift);ctx.scale(f.face,1);const frame=flipFrames[pose.stage==='tuck'?0:1];if(pose.stage==='tuck'){ctx.rotate(pose.rotation);const h=165,w=h*frame.w/frame.h;ctx.drawImage(flipArt,frame.x,frame.y,frame.w,frame.h,-w/2,-h/2,w,h);}else{const w=330,h=w*frame.h/frame.w;ctx.drawImage(flipArt,frame.x,frame.y,frame.w,frame.h,-w*.38,-h*.5,w,h);if(elapsed>=.66&&elapsed<.85){ctx.globalAlpha=.65;for(let i=0;i<3;i++)line(100,-15+i*15,190,-15+i*15,'#d9ecff',3);}}ctx.restore();}
function drawProjectile(q){ctx.save();ctx.translate(q.type==='car'?Math.max(350,Math.min(W-350,q.x)):q.x,q.y);ctx.scale(q.face,1);
 if(q.type==='bat'){ctx.rotate(q.age*8);ctx.lineCap='round';line(-58,0,38,0,'#965824',15);line(-58,0,-20,0,'#d7a568',7);line(25,-3,50,-3,'#ebc589',17);line(-62,-7,-62,7,'#684023',5);}
 else if(q.type==='bullet'){ctx.shadowColor='#ffd97b';ctx.shadowBlur=12;line(-28,0,16,0,'#ffb85a',5);line(-12,0,16,0,'#fff4bc',2);}
 else if(q.type==='powerblast'){ctx.shadowColor='#ff891a';ctx.shadowBlur=32;for(const [color,rx,ry] of [['#ff6618',135,72],['#ffae20',110,55],['#fff175',85,34],['#fffce1',55,16]]){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(-20,0,rx,ry,0,0,Math.PI*2);ctx.fill();}for(let k=0;k<5;k++)line(-180-k*13,-40+k*20,-80,-20+k*10,k%2?'#ffd236':'#ff8a18',5);}
 else if(q.type==='hellfire'){drawFireStream(-140,0,270,q.age);}
 else if(q.type==='bike'){if(bikeFrame){const width=510,height=width*bikeFrame.h/bikeFrame.w;ctx.drawImage(bikeArt,bikeFrame.x,bikeFrame.y,bikeFrame.w,bikeFrame.h,-width/2,120-height,width,height);}ctx.shadowBlur=12;ctx.shadowColor='#ff741c';for(let i=0;i<7;i++){ctx.globalAlpha=.7;ctx.fillStyle=i%2?'#ffd35c':'#ff6a20';ctx.beginPath();ctx.ellipse(-160-i*16,30+Math.sin(q.age*30+i)*23,18,5,0,0,Math.PI*2);ctx.fill();}}
 else if(q.type==='football'){ctx.fillStyle='#8e4827';ctx.beginPath();ctx.ellipse(0,0,43,23,0,0,Math.PI*2);ctx.fill();line(-22,-16,-22,16,'#fff1dc',5);line(22,-16,22,16,'#fff1dc',5);line(-13,-4,13,-4,'#fff7e8',3);for(let x=-10;x<=10;x+=5)line(x,-9,x,1,'#fff7e8',2);}
 else if(q.type==='star'){ctx.rotate(q.age*22);ctx.fillStyle='#d5e4ef';ctx.strokeStyle='#607488';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?10:37;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#263443';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();}
 else if(q.type==='book'){
  ctx.rotate(q.age*5);rect(-35,-26,70,52,'#321c2e');rect(-29,-20,58,40,'#f0dbaa');rect(-35,-29,70,8,'#803638');rect(-35,22,70,8,'#803638');rect(-35,-29,9,59,'#a95042');ctx.strokeStyle='#d9b56c';ctx.lineWidth=2;ctx.strokeRect(-20,-15,44,30);ctx.font='bold 14px Georgia';ctx.fillStyle='#3c2130';ctx.fillText('D&D',-16,5);
 }else if(q.type==='pearls'){
  ctx.rotate(q.age*6);ctx.strokeStyle='#d8deeb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,38,25,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<18;i++){const a=i*Math.PI*2/18,x=Math.cos(a)*38,y=Math.sin(a)*25;ctx.fillStyle='#fff9f1';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b3c6df';ctx.beginPath();ctx.arc(x+2,y+2,2,0,Math.PI*2);ctx.fill();}
 }else if(['knife','bourbon','molotov'].includes(q.type)){
  if(q.type==='knife'){rect(-42,-6,30,12,'#241c22');rect(-16,-11,5,22,'#d6c6a1');ctx.fillStyle='#e9f4ff';ctx.beginPath();ctx.moveTo(-11,-7);ctx.lineTo(48,0);ctx.lineTo(-11,7);ctx.fill();}
  else{ctx.rotate(q.age*5);rect(-12,-23,24,52,'#653619');rect(-6,-39,12,18,'#874b24');rect(-7,-44,14,7,'#e4cf96');rect(-10,-3,20,19,'#dcb77c');line(-8,-20,-8,23,'#e6a759',3);if(q.type==='molotov'){line(0,-45,8,-57,'#ddd2b0',4);ctx.fillStyle='#ffb83e';ctx.beginPath();ctx.moveTo(1,-48);ctx.quadraticCurveTo(-15,-66,6,-84-Math.sin(t*30)*8);ctx.quadraticCurveTo(24,-61,1,-48);ctx.fill();}}
 }else if(q.type==='voice'){ctx.shadowColor='#8eeaff';ctx.shadowBlur=16;for(let i=0;i<4;i++){ctx.strokeStyle=['#efffff','#a9ecff','#6cd7ff','#50a4ff'][i];ctx.lineWidth=7-i;ctx.beginPath();ctx.ellipse(-i*28,0,35+i*8,55+i*25,0,-Math.PI*.48,Math.PI*.48);ctx.stroke();}}
 else{const idx={tv:0,rock:1,car:2}[q.type],frame=idx===undefined?propFrames[0]:newPropFrames[idx],img=idx===undefined?propArt:newProps;if(q.type!=='car')ctx.rotate(q.age*(q.type==='tv'?3:8));if(frame){const width=q.type==='car'?680:q.type==='tv'?115:q.type==='rock'?85:65,height=width*frame.h/frame.w;ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h,-width/2,-height/2,width,height);}}
 ctx.restore();}
for(const [id,art] of Object.entries(newRoster)){art.img.onload=()=>{const boxes=id==='joey'?[[54,17,290,366],[429,12,669,364],[788,12,1048,364],[15,380,366,714],[421,378,732,713],[810,399,1053,708],[50,801,338,1043],[386,841,741,1032],[728,723,1081,951],[30,1296,394,1388],[448,1041,668,1433],[733,1093,1086,1434]]:[[47,29,313,383],[432,23,693,380],[787,28,1069,382],[21,438,412,753],[441,418,769,754],[802,428,1067,753],[30,846,364,1085],[387,873,791,1076],[783,774,1086,1011],[20,1332,437,1446],[480,1077,684,1448],[728,1147,1086,1448]];art.frames=(newFighterBoxes[id]?newFighterBoxes[id]:id==='taryn'?[[57, 9, 274, 342], [442, 34, 657, 339], [818, 17, 1003, 339], [41, 375, 316, 704], [398, 371, 718, 703], [812, 388, 1036, 701], [40, 790, 318, 996], [380, 789, 742, 997], [734, 732, 1084, 942], [8, 1283, 409, 1371], [446, 1014, 682, 1410], [712, 1119, 1080, 1392]]:id==='kristen'?[[83, 16, 298, 342], [436, 18, 646, 339], [800, 18, 949, 339], [54, 383, 319, 709], [442, 379, 719, 704], [795, 384, 1004, 708], [63, 801, 327, 1026], [385, 828, 738, 1023], [770, 746, 1063, 934], [13, 1333, 401, 1415], [441, 1046, 668, 1421], [760, 1105, 1043, 1425]]:boxes).map(([x,y,x2,y2])=>({x,y,w:x2-x,h:y2-y}));const f=art.frames[0],c=document.createElement('canvas');c.width=f.w;c.height=f.h;c.getContext('2d').drawImage(art.img,f.x,f.y,f.w,f.h,0,0,f.w,f.h);portraits[id]=c.toDataURL();$('.portrait.'+id).style.backgroundImage='url('+portraits[id]+')';loadedNewArt++;finishArtwork();};art.img.onerror=()=>{$('#loading').textContent='New fighter art could not load. Please refresh.';};art.img.src=id+'.png?v=9';}
for(const [id,img] of Object.entries(walkArt)){img.onload=()=>{walkFrames[id]=atlas(img,2,2);loadedNewArt++;finishArtwork();};img.onerror=()=>{$('#loading').textContent='Walking artwork could not load. Please refresh.';};img.src=id+'-walk.png?v=10';}
newProps.onload=()=>{newPropFrames.push(...[[159,84,673,433],[902,31,1410,433],[29,619,1046,930],[1091,468,1384,974]].map(([x,y,x2,y2])=>({x,y,w:x2-x,h:y2-y})));loadedNewArt++;finishArtwork();};newProps.onerror=()=>{$('#loading').textContent='Special artwork could not load. Please refresh.';};newProps.src='new-specials.png';
slapArt.onload=()=>{slapFrame=alphaBounds(slapArt,0,0,slapArt.width,slapArt.height);loadedNewArt++;finishArtwork();};slapArt.onerror=()=>{$('#loading').textContent='Slap artwork could not load. Please refresh.';};slapArt.src='joey-slap.png';
flipArt.onload=()=>{flipFrames.push(...atlas(flipArt,2,1));loadedNewArt++;finishArtwork();};flipArt.onerror=()=>{$('#loading').textContent='Flip artwork could not load. Please refresh.';};flipArt.src='kristen-flip.png';
bikeArt.onload=()=>{bikeFrame=alphaBounds(bikeArt,0,0,bikeArt.width,bikeArt.height);loadedNewArt++;finishArtwork();};bikeArt.onerror=()=>{$('#loading').textContent='Motorcycle art could not load. Please refresh.';};bikeArt.src='burning-motorcycle.png';
tackleArt.onload=()=>{tackleFrames.push(...[[80,226,735,702],[844,16,1413,703],[1539,247,2153,702]].map(([x,y,x2,y2])=>({x,y,w:x2-x,h:y2-y})));loadedNewArt++;finishArtwork();};tackleArt.onerror=()=>{$('#loading').textContent='Tackle art could not load. Please refresh.';};tackleArt.src='dan-tackle.png';
function finishArtwork(){if(loadedFighters===2&&loadedPoses===2&&loadedSpecialArt===2&&loadedNewArt===24){$('.poster-fighter').style.backgroundImage='url('+portraits[selected]+')';ready=true;$('#loading').textContent='READY TO PLAY';$('#start').disabled=false;}}
function alphaBounds(img,sx,sy,ww,hh){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);const data=cx.getImageData(sx,sy,ww,hh).data;let minX=ww,minY=hh,maxX=0,maxY=0;for(let y=0;y<hh;y++)for(let x=0;x<ww;x++)if(data[(y*ww+x)*4+3]>60){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}return{x:sx+minX,y:sy+minY,w:maxX-minX+1,h:maxY-minY+1};}
propArt.onload=()=>{for(let i=0;i<4;i++){const w=Math.floor(propArt.width/2),h=Math.floor(propArt.height/2);propFrames[i]=alphaBounds(propArt,i%2*w,Math.floor(i/2)*h,i===3?Math.floor(w*.7291667):w,h);}loadedSpecialArt++;finishArtwork();};propArt.src='nancy-specials.png';
snakeArt.onload=()=>{snakeFrame=alphaBounds(snakeArt,0,0,snakeArt.width,snakeArt.height);loadedSpecialArt++;finishArtwork();};snakeArt.src='freddy-serpent.png';
for(const img of [propArt,snakeArt])img.onerror=()=>{$('#loading').textContent='Special-move art could not load. Refresh to try again.';};
for(let r=0;r<2;r++){const img=poseArt[r];img.onload=()=>{const temp=document.createElement('canvas');temp.width=img.width;temp.height=img.height;const c=temp.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);for(let pose=0;pose<4;pose++){const boxes=r===0?[[0,0,.5,.41015625],[.5,0,.5,.41015625],[0,.41015625,.546875,.58984375],[.546875,.41015625,.453125,.58984375]]:[[0,0,.5,.4296875],[.5,0,.5,.40625],[0,.4296875,.60546875,.5703125],[.60546875,.40625,.39453125,.59375]],box=boxes[pose],sx=Math.floor(box[0]*img.width),sy=Math.floor(box[1]*img.height),ww=Math.floor(box[2]*img.width),hh=Math.floor(box[3]*img.height),data=c.getImageData(sx,sy,ww,hh).data;let minX=ww,minY=hh,maxX=0,maxY=0;for(let y=0;y<hh;y++)for(let x=0;x<ww;x++)if(data[(y*ww+x)*4+3]>60){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}poseFrames[r][pose]={x:sx+minX,y:sy+minY,w:maxX-minX+1,h:maxY-minY+1};}loadedPoses++;finishArtwork();};img.onerror=()=>{$('#loading').textContent='Pose artwork could not load. Refresh to try again.';};img.src=r===0?'freddy-poses.png':'nancy-poses.png';}
movementArt.onload=()=>{const temp=document.createElement('canvas');temp.width=movementArt.width;temp.height=movementArt.height;const c=temp.getContext('2d',{willReadFrequently:true});c.drawImage(movementArt,0,0);for(let r=0;r<2;r++)for(let col=0;col<2;col++){const sx=Math.floor((col?.42:0)*temp.width),sy=Math.floor(r*temp.height/2),ww=Math.floor((col?.58:.42)*temp.width),hh=Math.floor(temp.height/2),data=c.getImageData(sx,sy,ww,hh).data;let minX=ww,minY=hh,maxX=0,maxY=0;for(let y=0;y<hh;y++)for(let x=0;x<ww;x++)if(data[(y*ww+x)*4+3]>60){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}movementFrames[r][col]={x:sx+minX,y:sy+minY,w:maxX-minX+1,h:maxY-minY+1};}};movementArt.src='movement.png';
for(let r=0;r<2;r++){
 const img=fighterArt[r];img.onload=()=>{
 const temp=document.createElement('canvas');temp.width=img.width;temp.height=img.height;const c=temp.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);const cw=img.width/3,ch=img.height/2;
 for(let pose=0;pose<6;pose++){const sx=r===0&&pose===4?570:Math.floor((pose%3)*cw),sy=Math.floor(Math.floor(pose/3)*ch),ww=r===0&&pose===3?570:r===0&&pose===4?454:Math.floor(cw),hh=Math.floor(ch),data=c.getImageData(sx,sy,ww,hh).data;let minX=ww,minY=hh,maxX=0,maxY=0;
 for(let y=0;y<hh;y++)for(let x=0;x<ww;x++)if(data[(y*ww+x)*4+3]>60){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}
 frames[r][pose]={x:sx+minX,y:sy+minY,w:maxX-minX+1,h:maxY-minY+1};}
 const id=r===0?'freddy':'nancy',f=frames[r][0],portrait=document.createElement('canvas');portrait.width=f.w;portrait.height=f.h;portrait.getContext('2d').drawImage(img,f.x,f.y,f.w,f.h,0,0,f.w,f.h);portraits[id]=portrait.toDataURL();$('.portrait.'+id).style.backgroundImage='url('+portraits[id]+')';
 loadedFighters++;finishArtwork();
 };img.onerror=()=>{$('#loading').textContent='Artwork could not load. Refresh to try again.';};img.src=r===0?'freddy-clean.png':'nancy-clean.png';}
for(const b of document.querySelectorAll('[data-fighter]'))b.onclick=()=>{selected=b.dataset.fighter;$('#arenaChoice').value=({freddy:0,nancy:1,joey:2,kincaid:3,taryn:4,kristen:5,will:6,alice:7,dan:8,rick:9,jesse:10,mark:11})[selected];document.querySelectorAll('.choice').forEach(c=>c.classList.toggle('selected',c===b));if(portraits[selected])$('.poster-fighter').style.backgroundImage='url('+portraits[selected]+')';};
for(const b of document.querySelectorAll('.attacks [data-hold],.attacks [data-action]')){b.addEventListener('pointerdown',ev=>{ev.preventDefault();b.setPointerCapture(ev.pointerId);b.classList.add('held');if(b.dataset.hold)held.add(b.dataset.hold);if(b.dataset.action)action(b.dataset.action)});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{b.classList.remove('held');if(b.dataset.hold)held.delete(b.dataset.hold)});b.addEventListener('contextmenu',ev=>ev.preventDefault());}
const pad=$('.movement');let padPointer=null,padJumpZone=false;
function clearPad(){for(const dir of ['left','right','down'])held.delete(dir);pad.querySelectorAll('button').forEach(b=>b.classList.remove('held'));padJumpZone=false;}
function padInput(ev){const box=pad.getBoundingClientRect(),x=(ev.clientX-box.left)/box.width,y=(ev.clientY-box.top)/box.height;const wasJump=padJumpZone;
 for(const dir of ['left','right','down'])held.delete(dir);pad.querySelectorAll('button').forEach(b=>b.classList.remove('held'));
 if(x<0||x>1||y<0||y>1){padJumpZone=false;return;}
 let dir=x<.34?-1:x>.66?1:0;
 if(y<.34){padJumpZone=true;if(!wasJump)jump(p,dir);pad.querySelector('[data-action="jump"]').classList.add('held');}
 else{padJumpZone=false;if(y>.66){held.add('down');pad.querySelector('[data-hold="down"]').classList.add('held');}else if(dir){const name=dir<0?'left':'right';held.add(name);pad.querySelector('[data-hold="'+name+'"]').classList.add('held');}}
}
pad.addEventListener('pointerdown',ev=>{ev.preventDefault();if(padPointer!==null)return;padPointer=ev.pointerId;pad.setPointerCapture(ev.pointerId);padInput(ev);});pad.addEventListener('pointermove',ev=>{if(ev.pointerId===padPointer){ev.preventDefault();padInput(ev);}});for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,ev=>{if(ev.pointerId===padPointer){padPointer=null;clearPad();}});pad.addEventListener('contextmenu',ev=>ev.preventDefault());
const keyHold={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyL:'block',ShiftLeft:'block',KeyS:'down',ArrowDown:'down'},keyAction={KeyW:'jump',ArrowUp:'jump',KeyJ:'punch',KeyK:'kick',Space:'super'};
window.addEventListener('keydown',ev=>{if(ev.target.tagName==='SELECT')return;if(keyHold[ev.code]||keyAction[ev.code]){ev.preventDefault();if(keyHold[ev.code])held.add(keyHold[ev.code]);else if(!ev.repeat)action(keyAction[ev.code]);}if(ev.code==='Escape'||ev.code==='KeyP')pause();});window.addEventListener('keyup',ev=>{if(keyHold[ev.code])held.delete(keyHold[ev.code])});window.addEventListener('blur',()=>{held.clear();if(mode==='fight')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='fight')pause()});
$('#start').onclick=start;$('#pause').onclick=pause;$('#resume').onclick=pause;$('#restart').onclick=beginMatch;$('#rematch').onclick=continueMatch;$('#playMode').onchange=syncModeOptions;syncModeOptions();$('#quit').onclick=menu;$('#change').onclick=menu;$('.brand').onclick=ev=>{ev.preventDefault();menu()};$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'SOUND ON':'SOUND OFF';if(sound)unlockSound();else cancelVictoryVoice();tone(300,.1,'sine')};$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#app').requestFullscreen();}catch{$('#status').textContent='TURN YOUR PHONE SIDEWAYS FOR A WIDER VIEW';}};
$('#start').disabled=true;requestAnimationFrame(loop);
