'use strict';
const characterEndings = {
 nancy: ['A NEW PURPOSE', 'With the nightmare behind her, Nancy becomes a counselor for troubled teens at Westin Hills Psychiatric Hospital. Her smile offers hope to those who need it most.'],
 kristen: ['A DREAM WORTH CHASING', 'Kristen attends Springwood College to pursue gymnastics. Smiling and looking toward the future, she finally has dreams of her own to chase.'],
 alice: ['HAPPILY EVER AFTER', 'Alice marries Dan. In her wedding dress, beside him in his black tuxedo, she begins a new chapter filled with love and hope.'],
 dan: ['THE NEXT BIG PLAY', 'Dan earns a football scholarship to Springwood University. With a football in his hands and a smile on his face, he is ready for his next big challenge.'],
 rick: ['THE NEXT GENERATION', 'Rick opens a dojo in Springwood to teach kids karate. He helps the next generation build confidence, discipline, and the courage to stand up for themselves.'],
 will: ['A DIFFERENT KIND OF MAGIC', 'Will goes to medical school and becomes a doctor. Wearing his white coat and seated in his wheelchair, he is ready to help others build a healthier future.'],
 jesse: ['EVERYBODY IS WELCOME', 'Free from the nightmare, Jesse opens a nightclub where everybody is welcome. He looks at his two normal hands and smiles. His life is finally his own.'],
 taryn: ['HER MOMENT TO SHINE', 'Taryn enters a beauty pageant and wins. Wearing her crown with a radiant smile, she celebrates a future full of possibilities.'],
 joey: ['LIVE ON MTV', 'Joey becomes an MTV VJ. Smiling from an eighties television set, he brings music, energy, and his own voice to the world.'],
 kincaid: ['BUILT WITH HIS OWN HANDS', 'Kincaid opens a mechanic shop in Springwood. Proudly smiling in his garage, he puts his strength and skill into building a future of his own.'],
 mark: ['A NEW CHAPTER', 'Mark opens a comic book shop and signs with Marvel Comics. His imagination now creates heroes on the page, and a new adventure is just beginning.'],
 freddy: ['THE NIGHTMARE NEVER ENDS', 'You are all my children now.']
};
const endingScreen = document.createElement('section');
endingScreen.id='endingScreen';endingScreen.hidden=true;
endingScreen.setAttribute('role','dialog');endingScreen.setAttribute('aria-modal','true');
endingScreen.setAttribute('aria-labelledby','endingName');
endingScreen.innerHTML='<div class="ending-card"><div class="ending-art"><img id="endingImage" alt=""><span class="ending-badge">TOURNAMENT COMPLETE</span></div><div class="ending-copy"><span id="endingChapter"></span><h2 id="endingName"></h2><p id="endingStory"></p><button id="endingContinue" class="primary">CONTINUE →</button><small>Enter / Space / Punch to continue</small></div></div>';
document.querySelector('#app').append(endingScreen);
function showCharacterEnding(id){
 const data=characterEndings[id];if(!data)return;
 held.clear();cancelVictoryVoice();
 $('#endMenu').hidden=true;$('#hud').hidden=true;
 endingScreen.dataset.character=id;
 $('#endingChapter').textContent=data[0];$('#endingName').textContent=id.toUpperCase();
 $('#endingStory').textContent=data[1];
 const img=$('#endingImage');img.hidden=false;img.alt=id.toUpperCase()+' — '+data[0];
 img.onerror=()=>{img.hidden=true;};img.src='endings/'+id+'.png';
 endingScreen.hidden=false;endingScreen.scrollTop=0;$('#endingContinue').focus({preventScroll:true});
}
function hideCharacterEnding(){endingScreen.hidden=true;held.clear();}
function finishCharacterEnding(){
 if(endingScreen.hidden)return;
 hideCharacterEnding();$('#endMenu').hidden=false;$('#rematch').focus({preventScroll:true});
}
$('#endingContinue').onclick=finishCharacterEnding;
window.addEventListener('keydown',ev=>{
 if(endingScreen.hidden)return;
 if(['Enter','Space','KeyJ','Escape'].includes(ev.code)){ev.preventDefault();ev.stopImmediatePropagation();if(!ev.repeat)finishCharacterEnding();}
 else if(ev.code==='Tab'){ev.preventDefault();$('#endingContinue').focus();}
 else {ev.stopImmediatePropagation();}
},true);
