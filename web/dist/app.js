const $=s=>document.querySelector(s),app=$('#app'),positions=['Past','Present','Future'];
const topicPrompts={love:'What should I understand about my relationships right now?',career:'What should I focus on in my career right now?',self:'What part of myself needs my attention right now?',general:'What should I know about my current situation?'};
const major=['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World'],ranks=['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'],files=['01','02','03','04','05','06','07','08','09','10','11','12','13','14'],suits={Cups:['connection','feeling','compassion'],Wands:['energy','possibility','courage'],Swords:['clarity','choice','perspective'],Pentacles:['grounding','resource','stability']};
const cards=[...major.map((name,i)=>({id:`major-${i}`,name,image:`assets/tarot/${String(i).padStart(2,'0')}-${name.replaceAll(' ','').replace(' of ','Of')}.png`,keywords:['change','awareness','possibility']})),...Object.entries(suits).flatMap(([suit,keywords])=>ranks.map((name,i)=>({id:`${suit.toLowerCase()}-${i+1}`,name:`${name} of ${suit}`,image:`assets/tarot/${suit}${files[i]}.png`,keywords})))];
cards.find(c=>c.name==='The High Priestess').image='assets/tarot/02-TheHighPriestess.png';cards.find(c=>c.name==='Wheel of Fortune').image='assets/tarot/10-WheelOfFortune.png';cards.find(c=>c.name==='The Hanged Man').image='assets/tarot/12-TheHangedMan.png';
const uid=()=>crypto.randomUUID(),find=id=>cards.find(c=>c.id===id),fmt=v=>new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)),esc=v=>String(v||'').replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x])),topic=q=>/(love|relationship|partner|dating|breakup|friend)/.test(q.toLowerCase())?'love':/(job|career|work|interview|promotion|study)/.test(q.toLowerCase())?'career':/(myself|growth|change|confidence|happy)/.test(q.toLowerCase())?'self':'general';
function load(){try{let v=JSON.parse(localStorage.getItem('between_journal_v2')||'null');if(Array.isArray(v))return v.map(e=>({...e,topic:e.topic||'other'}));let old=JSON.parse(localStorage.getItem('between_journal_v1')||'[]');let m=Array.isArray(old)?old.map(e=>({id:e.id||uid(),createdAt:e.createdAt||e.date||new Date().toISOString(),question:e.question||'',topic:e.topic||'other',cards:e.cards||[],interpretations:e.interpretations||null,overallMessage:e.overallMessage||null,timeline:(e.notes||e.next||e.mood)?[{id:uid(),createdAt:e.date||new Date().toISOString(),reflectionNotes:e.notes||'',nextStep:e.next||'',mood:e.mood||'',kind:'initial'}]:[]})):[];localStorage.setItem('between_journal_v2',JSON.stringify(m));return m}catch{return[]}}
let state={page:'home',question:'',topic:'other',topicChoice:null,deck:[],picked:[],reading:null,drawStage:null,pickBusy:false,reflect:{cardId:null,mood:'',customMood:'',customMoodOpen:false,notes:'',next:''},journal:load(),journalSort:'newest',journalFilter:'all',journalFilterOpen:false,detail:null,journalCard:null,journalAnimate:false,composer:false};
let journalOutsideHandler=null;
const save=()=>{try{localStorage.setItem('between_journal_v2',JSON.stringify(state.journal));return true}catch{toast('Your browser could not save this reading. Keep this tab open to continue.');return false}};
function meaning(x){let k=x.card.keywords.join(', ');return x.isReversed?`${x.card.name} reversed may point to a theme held back, turned inward, or ready to be reconsidered. Around ${k}, notice where pressure or hesitation deserves a gentler look.`:`${x.card.name} invites attention to ${k}. It may offer a useful lens for noticing what is already present, rather than a fixed answer about what happens next.`}
function interpretations(list,top,labels=positions){
  const contexts={Past:'Consider experiences or patterns that may have shaped your situation.',Present:'Notice what is happening now and what deserves your attention.',Future:'Explore a possibility that could develop, and how your choices might influence it.','The Present':'This can describe the part of your situation asking for attention now.','The Hidden Influence':'This may name an influence that is easy to overlook.','The Guidance':'Use this as a direction to explore, not an instruction you must follow.'};
  return list.map((x,i)=>({position:labels[i],text:`${contexts[labels[i]]||contexts.Present} In a ${top} question, ${meaning(x)}`}));
}
function overall(list,top){return `Read ${list[0].card.name} as past context, ${list[1].card.name} as a lens on the present, and ${list[2].card.name} as one possible direction. For your ${top} question, consider how earlier experiences influence what you can choose now. The future remains open to your choices.`}
function entryCards(e){return e.cards.map(x=>({card:find(x.id),isReversed:x.reverse}))}
function entryInterpretations(e){
  const labels=e.spread||(e.interpretations?.length===3&&e.interpretations.every(x=>x?.position)?e.interpretations.map(x=>x.position):['The Present','The Hidden Influence','The Guidance']);
  const fallback=interpretations(entryCards(e),e.topic,labels);
  return fallback.map((value,i)=>{const saved=e.interpretations?.[i];return typeof saved==='string'?{position:labels[i],text:saved}:saved||value});
}
function active(){const id=state.page==='journal'&&state.detail?state.detail:state.reading?.entryId;return state.journal.find(e=>e.id===id)}
const flowTimers=new Set(),flowAnimations=new Set();
let flowRun=0;
function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false}
function motionTime(ms){return reducedMotion()?1:ms}
function later(ms,callback){const run=flowRun;const id=setTimeout(()=>{flowTimers.delete(id);if(run===flowRun)callback()},motionTime(ms));flowTimers.add(id);return id}
function cancelFlow(){flowRun++;flowTimers.forEach(clearTimeout);flowTimers.clear();flowAnimations.forEach(animation=>animation.cancel());flowAnimations.clear();document.querySelectorAll('.flying-card').forEach(node=>node.remove());state.pickBusy=false}
function animate(node,frames,options){if(!node?.animate||reducedMotion())return;const animation=node.animate(frames,options);flowAnimations.add(animation);animation.onfinish=()=>flowAnimations.delete(animation);return animation}
function go(page){
  if(state.page==='reading'&&page!=='reading'){
    cancelFlow();
    if(state.picked.length===3&&!state.reading)recordReading();
    state.drawStage=state.reading?'interpreting':state.deck.length?'choosing':null;
  }
  state.page=page;state.detail=null;state.journalCard=null;state.journalAnimate=false;state.composer=false;render();
}
function shuffle(){
  cancelFlow();state.deck=makeDeck();state.picked=[];state.reading=null;state.drawStage='shuffling';render();
  later(2300,()=>{state.drawStage='choosing';render()});
}
function beginReading(){
  state.topic=state.topicChoice||'other';state.reflect={cardId:null,mood:'',customMood:'',customMoodOpen:false,notes:'',next:''};state.page='reading';state.detail=null;shuffle();
}
function toast(t){let n=document.createElement('div');n.className='toast';n.textContent=t;document.body.append(n);setTimeout(()=>n.remove(),3200)}
function home(){return `<section class="hero"><div class="hero-intro"><h1>Between the cards and you, clarity begins.</h1></div><aside class="oracle"><p>“Clarity begins with the questions we dare to ask.”</p><small>TODAY'S PROMPT</small></aside><section class="question-panel"><label class="field-label" for="question">What's on your mind?</label><textarea id="question" placeholder="Ask about love, career, or anything on your mind...">${esc(state.question)}</textarea><div class="quick topic-quick" role="group" aria-label="Choose a reading topic">${[['love','Love'],['career','Career'],['self','Self'],['general','General']].map(([value,label])=>`<button class="chip ${state.topicChoice===value?'selected':''}" type="button" data-topic="${value}" aria-pressed="${state.topicChoice===value}">${label}</button>`).join('')}</div><button class="primary" id="start" ${state.question.trim()?'':'disabled'}>Begin a reading</button></section></section>`}
function makeDeck(){
  const deck=cards.map(card=>({card,isReversed:Math.random()<.5}));
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
  return deck;
}
function recordReading(){
  if(state.reading?.entryId)return state.journal.find(entry=>entry.id===state.reading.entryId);
  if(state.picked.length!==3)return null;
  const entry={id:uid(),createdAt:new Date().toISOString(),question:state.question,topic:state.topic,spread:[...positions],cards:state.picked.map(x=>({id:x.card.id,reverse:x.isReversed})),interpretations:interpretations(state.picked,state.topic),overallMessage:overall(state.picked,state.topic),timeline:[]};
  state.journal.unshift(entry);state.reading={active:0,entryId:entry.id};save();return entry;
}
function cardBack(){return '<img src="assets/tarot/CardBacks.png" alt="" draggable="false">'}
function draw(){
  if(state.reading)return result();
  if(!state.question)return '<section class="empty"><p>Begin with a question before choosing cards.</p><button class="primary" data-nav="home">Go to Home</button></section>';
  const stage=state.drawStage||'choosing';
  return `<section class="draw-stage ${stage}" aria-label="Choose your tarot cards">
    <header class="draw-title">${stage==='shuffling'?'<p class="eyebrow">A moment to pause</p>':''}<h1>${stage==='shuffling'?'Take a breath.':'Let one card find you.'}</h1><p class="draw-question">${esc(state.question)}</p></header>
    <div class="draw-slots">${positions.map((name,index)=>`<div class="draw-slot ${state.picked[index]?'filled':''}" data-slot="${index}"><div class="slot-target">${state.picked[index]?cardBack():'<span class="slot-star" aria-hidden="true">✧</span>'}</div><span class="slot-label">${name}</span></div>`).join('')}</div>
    <div class="shuffle-pile" aria-hidden="true">${['left','middle','right'].map((side,packet)=>`<div class="shuffle-packet packet-${side}">${Array.from({length:6},(_,i)=>`<div class="shuffle-sheet" style="--layer:${i};--packet:${packet}">${cardBack()}</div>`).join('')}</div>`).join('')}</div>
    <div class="hand-zone" ${stage!=='choosing'?'inert':''}><div class="hand-status"><p class="hand-instruction" id="draw-progress" role="status" aria-live="polite">${state.picked.length} of 3 selected · Choose your ${positions[state.picked.length]?.toLowerCase()||'final'} card</p><button type="button" class="shuffle-link" id="shuffle-again">Shuffle again</button></div>
      <div class="card-hand" id="scroll-deck" aria-label="78-card deck. Scroll, drag, or use the arrow keys to browse.">${state.deck.map((x,index)=>`<button type="button" class="hand-card ${state.picked.includes(x)?'selected':''}" data-card="${index}" aria-label="Choose card ${index+1}" ${state.picked.includes(x)?'disabled':''}><span class="hand-card-surface">${cardBack()}</span></button>`).join('')}</div>
    </div>
    <p class="shuffle-caption" role="status">Shuffling your cards<span aria-hidden="true">…</span></p>
  </section>`;
}
function chooseCard(button){
  const item=state.deck[Number(button.dataset.card)];
  if(state.drawStage!=='choosing'||state.pickBusy||state.picked.length>=3||!item||state.picked.includes(item))return;
  const index=state.picked.length,start=button.querySelector('.hand-card-surface').getBoundingClientRect();state.pickBusy=true;state.picked.push(item);
  button.classList.add('selected');button.disabled=true;
  const slot=$(`[data-slot="${index}"] .slot-target`),end=slot.getBoundingClientRect();
  const flying=document.createElement('div');flying.className='flying-card';flying.innerHTML=cardBack();flying.setAttribute('aria-hidden','true');
  Object.assign(flying.style,{left:`${end.left}px`,top:`${end.top}px`,width:`${end.width}px`,height:`${end.height}px`});document.body.append(flying);
  animate(flying,[{transform:`translate(${start.left-end.left}px,${start.top-end.top}px) scale(${start.width/(end.width||1)},${start.height/(end.height||1)})`,opacity:1},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:600,easing:'cubic-bezier(.2,.75,.25,1)',fill:'both'});
  $('#shuffle-again').disabled=true;
  later(620,()=>{
    flying.remove();slot.innerHTML=cardBack();slot.parentElement.classList.add('filled');state.pickBusy=false;
    if(state.picked.length===3){
      recordReading();state.drawStage='settling';$('.draw-stage').classList.replace('choosing','settling');$('.hand-zone').inert=true;
      later(460,completeDraw);
    }else{
      $('#shuffle-again').disabled=false;$('#draw-progress').textContent=`${state.picked.length} of 3 selected · Choose your ${positions[state.picked.length].toLowerCase()} card`;
    }
  });
}
function completeDraw(){
  if(state.picked.length!==3||state.page!=='reading')return;
  const previous=Array.from(document.querySelectorAll('.slot-target'),node=>node.getBoundingClientRect());
  recordReading();state.drawStage='interpreting';render();
  const stage=$('.result-stage');if(!stage)return;stage.classList.add('is-entering');
  document.querySelectorAll('.reading-card-rotator').forEach(node=>node.classList.remove('is-revealed'));
  document.querySelectorAll('.reading-card-art').forEach((node,index)=>{
    const from=previous[index],to=node.getBoundingClientRect();
    if(from)animate(node,[{transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/(to.width||1)},${from.height/(to.height||1)})`},{transform:'none'}],{duration:950,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both'});
    later(960+index*150,()=>node.querySelector('.reading-card-rotator')?.classList.add('is-revealed'));
  });
  later(1900,()=>stage.classList.add('show-interpretation'));
  later(2450,()=>stage.classList.add('show-reflection'));
  later(3100,()=>stage.classList.remove('is-entering','show-interpretation','show-reflection'));
}
function result(){
  const entry=active(),list=entry?entryCards(entry):state.picked,ints=entry?entryInterpretations(entry):interpretations(list,state.topic),a=state.reading.active||0,x=list[a];
  return `<section><div class="section-head"><div><h1 class="page-title">Your reading.</h1><p class="question-echo">${esc(entry?.question||state.question)}</p></div><span class="topic">${entry?.topic||state.topic}</span></div><div class="results result-stage"><div class="reading-column"><div class="spread">${list.map((c,i)=>`<article class="face-card reading-card ${a===i?'active':''}"><button data-active="${i}" aria-label="Read ${ints[i].position}: ${c.card.name}" aria-pressed="${a===i}"><span class="reading-card-art"><span class="reading-card-rotator is-revealed"><span class="reading-card-back">${cardBack()}</span><span class="reading-card-front"><img class="${c.isReversed?'is-reversed':''}" src="${c.card.image}" alt="${c.card.name}, ${c.isReversed?'reversed':'upright'}"></span></span></span><span class="card-caption">${ints[i].position}<strong>${c.card.name}</strong>${c.isReversed?'Reversed':'Upright'}</span></button></article>`).join('')}</div>${reflectionCard()}</div><aside class="interpretation"><p class="eyebrow">${ints[a].position}</p><h2>${x.card.name}</h2><div class="keywords">${x.card.keywords.map(k=>`<span class="chip">${k}</span>`).join('')}</div><p>${ints[a].text}</p><div class="overall"><p class="eyebrow">Overall reflection</p><p>${entry?.overallMessage||overall(list,entry?.topic||state.topic)}</p></div></aside></div></section>`;
}
function reflectionCard(){const customMood=state.reflect.customMoodOpen?state.reflect.customMood.trim():'',canSave=state.reflect.mood||customMood||state.reflect.notes.trim()||state.reflect.next.trim();return `<section class="inline-reflection" id="inline-reflection"><div><p class="eyebrow">Your reflection</p></div><fieldset><legend>How do you feel?</legend><div class="moods">${['Calm','Hopeful','Uncertain','Anxious'].map(m=>`<button type="button" class="chip ${state.reflect.mood===m?'selected':''}" data-mood="${m}" aria-pressed="${state.reflect.mood===m}">${m}</button>`).join('')}<button type="button" class="chip ${state.reflect.customMoodOpen?'selected':''}" id="custom-mood-toggle" aria-pressed="${state.reflect.customMoodOpen}" aria-controls="custom-mood-field">Other</button></div><div class="custom-mood-field" id="custom-mood-field" ${state.reflect.customMoodOpen?'':'hidden'}><label for="custom-mood">Describe your feeling</label><input id="custom-mood" value="${esc(state.reflect.customMood)}" placeholder="Curious, relieved, or conflicted…"></div></fieldset><label for="notes">Reflection notes</label><textarea id="notes" placeholder="This card reminds me of a pattern I keep returning to…">${esc(state.reflect.notes)}</textarea><label for="next">One small step I can take</label><input id="next" value="${esc(state.reflect.next)}" placeholder="Have one honest conversation this week…"><div class="reflection-actions"><button class="primary" id="save-reflection" ${canSave?'':'disabled'}>Save reflection</button><button class="secondary" id="skip-reflection">Skip</button></div></section>`}
function list(){
  const topicOptions=[['all','All topics'],['love','Love'],['career','Career'],['self','Self'],['general','General'],['other','Other']];
  const visible=state.journal.filter(e=>state.journalFilter==='all'||e.topic===state.journalFilter).slice().sort((a,b)=>{const delta=new Date(a.createdAt)-new Date(b.createdAt);return state.journalSort==='oldest'?delta:-delta});
  const rows=visible.length?`<div class="journal-stream">${visible.map(e=>`<article class="journal-row"><button class="journal-row-main" data-entry="${e.id}" aria-label="Open reading: ${esc(e.question)}"><div class="journal-meta"><time>${fmt(e.createdAt)}</time><span class="topic">${esc(e.topic)}</span></div><div class="journal-question"><h2>${esc(e.question)}</h2></div><div class="journal-cards">${entryCards(e).map(c=>`<img class="${c.isReversed?'is-reversed':''}" src="${c.card.image}" alt="${c.card.name}">`).join('')}</div></button><div class="journal-row-actions"><span class="entry-status">${e.timeline.length?`${e.timeline.length} reflection${e.timeline.length===1?'':'s'}`:'No notes yet'}</span><button class="journal-delete" type="button" data-delete-entry="${e.id}" aria-label="Delete this reading" title="Delete this reading"><span aria-hidden="true">×</span><span>Delete this reading</span></button></div></article>`).join('')}</div>`:`<div class="empty journal-filter-empty"><p>No readings match this topic.</p><button class="secondary" id="clear-journal-filter">Show all topics</button></div>`;
  const newest=state.journalSort==='newest',sortLabel=newest?'Newest first':'Oldest first',nextSort=newest?'oldest':'newest';
  const activeTopic=topicOptions.find(([value])=>value===state.journalFilter)?.[1]||'All topics';
  return `<section class="journal-list"><div class="section-head"><div><h1 class="page-title">Journal.</h1><p class="question-echo">Every revealed reading is saved here, ready to revisit.</p></div><button class="primary" data-nav="home">New reading</button></div>${state.journal.length?`<div class="journal-tools" aria-label="Journal controls"><button class="journal-sort-button" id="journal-sort" type="button" aria-label="Sort by time: ${sortLabel}. Activate for ${nextSort} first." title="${sortLabel}"><span aria-hidden="true">${newest?'↓':'↑'}</span></button><div class="journal-filter-menu"><button class="journal-filter-button ${state.journalFilter==='all'?'':'active'}" id="journal-filter-toggle" type="button" aria-expanded="${state.journalFilterOpen}" aria-controls="journal-topic-menu" aria-label="Filter by topic, current selection: ${activeTopic}">Topic<span class="journal-filter-chevron" aria-hidden="true"></span></button><div class="journal-topic-menu" id="journal-topic-menu" role="menu" ${state.journalFilterOpen?'':'hidden'}>${topicOptions.map(([value,label])=>`<button type="button" role="menuitemradio" aria-checked="${state.journalFilter===value}" class="${state.journalFilter===value?'selected':''}" data-journal-topic="${value}">${label}</button>`).join('')}</div></div></div>${rows}`:`<div class="empty"><p>Your revealed readings will appear here.</p><button class="primary" data-nav="home">Begin a reading</button></div>`}</section>`
}
function detail(e){
  if(!e){state.detail=null;return list()}
  const cs=entryCards(e),ints=entryInterpretations(e),has=e.timeline.length,selected=Number.isInteger(state.journalCard)?state.journalCard:null,entering=state.journalAnimate;
  state.journalAnimate=false;
  return `<section class="journal-detail"><button class="secondary back-button icon-button" id="back-journal" aria-label="Back to journal" title="Back to journal">←</button><header class="archive-heading"><h1 class="page-title">${esc(e.question)}</h1><div class="archive-actions"><button class="secondary delete" id="delete-entry">Delete reading</button><span class="topic">${esc(e.topic)}</span></div></header><article class="reading-frame ${entering?'detail-entering':''}"><div class="frame-heading"><h2>Drawn ${fmt(e.createdAt)}</h2><span class="frame-mark">✦</span></div><section class="frame-overall"><p class="eyebrow">Overall reflection</p><p>${e.overallMessage||overall(cs,e.topic)}</p></section><div class="archive-reading-grid"><div class="archive-card-column"><div class="archive-cards ${entering?'is-entering':''}">${cs.map((c,i)=>`<button class="archive-card ${c.isReversed?'reversed':''} ${selected===i?'active':''}" data-archive-card="${i}" aria-controls="archive-meaning-${i}" aria-pressed="${selected===i}" style="--card-index:${i}"><img src="${c.card.image}" alt="${c.card.name}, ${c.isReversed?'reversed':'upright'}"><p class="eyebrow">${ints[i].position}</p><h3>${c.card.name}</h3><span>${c.isReversed?'Reversed':'Upright'}</span></button>`).join('')}</div></div><section class="archive-card-details" aria-live="polite"><p class="archive-card-prompt" ${selected===null?'':'hidden'}>Select a card to revisit its interpretation.</p>${cs.map((c,i)=>`<article class="archive-card-meaning" id="archive-meaning-${i}" ${selected===i?'':'hidden'}><div><p class="eyebrow">${ints[i].position}</p><h3>${c.card.name}</h3><span>${c.isReversed?'Reversed':'Upright'}</span></div><p>${ints[i].text}</p></article>`).join('')}</section></div></article><section class="timeline-section"><div class="timeline-heading"><div><p class="eyebrow">Your reflections</p><h2>What changed after the reading?</h2></div><button class="primary" id="open-composer">${has?'Continue reflection':'Add a reflection'}</button></div>${state.composer?composer():''}<div class="timeline">${has?e.timeline.slice().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).map((x,i)=>event(x,i)).join(''):`<div class="timeline-empty"><span></span><p>No reflections yet. Return whenever you want to record what unfolded.</p></div>`}</div></section></section>`
}
function event(x,i){return `<article class="timeline-event"><div class="timeline-rail"><span>${i+1}</span></div><div class="timeline-content"><div class="timeline-event-header"><time class="timeline-event-title">${fmt(x.createdAt)}</time>${x.mood?`<span class="mood-tag">${x.mood}</span>`:''}</div><div class="timeline-fields"><section><p class="eyebrow">Reflection notes</p><p>${esc(x.reflectionNotes).replaceAll('\n','<br>')}</p></section><section><p class="eyebrow">Next step</p><p>${esc(x.nextStep).replaceAll('\n','<br>')}</p></section></div></div></article>`}function composer(){return `<form class="reflection-composer" id="timeline-form"><p class="eyebrow">New entry · ${fmt(new Date().toISOString())}</p><h3>Add what you notice now.</h3><label for="timeline-notes">Reflection notes</label><textarea id="timeline-notes" required placeholder="What has changed since this reading?"></textarea><label for="timeline-next">Next step</label><input id="timeline-next" placeholder="Optional"><div><button class="primary" type="submit">Add to timeline</button><button class="secondary" type="button" id="close-composer">Cancel</button></div></form>`}
function journal(){return state.detail?detail(state.journal.find(e=>e.id===state.detail)):list()}
function render(){
  app.classList.toggle('draw-mode',state.page==='reading'&&!state.reading&&!!state.question);
  app.innerHTML=state.page==='home'?home():state.page==='reading'?(state.reading?result():draw()):journal();
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===state.page));bind();
}
function bindDrawHand(){
  const hand=$('#scroll-deck');if(!hand||state.drawStage!=='choosing')return;
  let pointer=null,dragged=false,suppressClick=false;
  hand.addEventListener('wheel',e=>{
    const delta=Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
    if(e.deltaMode===1)hand.scrollLeft+=delta*16;else if(e.deltaMode===2)hand.scrollLeft+=delta*hand.clientWidth;else hand.scrollLeft+=delta;
    e.preventDefault();
  },{passive:false});
  hand.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.button===0){pointer={id:e.pointerId,x:e.clientX,left:hand.scrollLeft};dragged=false;suppressClick=false}});
  hand.addEventListener('pointermove',e=>{
    if(!pointer)return;
    if(Math.abs(e.clientX-pointer.x)>6){dragged=true;suppressClick=true;hand.classList.add('dragging');if(!hand.hasPointerCapture?.(e.pointerId))hand.setPointerCapture?.(e.pointerId)}
    if(dragged){e.preventDefault();hand.scrollLeft=pointer.left-(e.clientX-pointer.x)}
  });
  const release=()=>{pointer=null;dragged=false;hand.classList.remove('dragging')};
  hand.addEventListener('pointerup',release);hand.addEventListener('pointercancel',release);hand.addEventListener('lostpointercapture',release);
  hand.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false}},true);
  hand.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const available=Array.from(hand.querySelectorAll('button:not(:disabled)')),index=available.indexOf(document.activeElement);
    const next=e.key==='Home'?0:e.key==='End'?available.length-1:Math.max(0,Math.min(available.length-1,index+(e.key==='ArrowRight'?1:-1)));
    available[next]?.focus({preventScroll:true});available[next]?.scrollIntoView?.({block:'nearest',inline:'center',behavior:reducedMotion()?'instant':'smooth'});
  });
  document.querySelectorAll('[data-card]').forEach(button=>button.onclick=()=>chooseCard(button));
  $('#shuffle-again')?.addEventListener('click',shuffle);
}
function bind(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>go(b.dataset.nav));
  const q=$('#question');
  if(q){
    q.oninput=e=>{state.question=e.target.value;$('#start').disabled=!state.question.trim()};
    document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{
      const value=b.dataset.topic,deselect=state.topicChoice===value;
      if(deselect){state.topicChoice=null;if(state.question===topicPrompts[value])state.question=''}
      else{state.topicChoice=value;state.question=topicPrompts[value]}
      q.value=state.question;$('#start').disabled=!state.question.trim();
      document.querySelectorAll('[data-topic]').forEach(option=>{const selected=option.dataset.topic===state.topicChoice;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',selected)});
    });
    $('#start').onclick=()=>{if(state.question.trim())beginReading()};
  }
  bindDrawHand();
  document.querySelectorAll('[data-active]').forEach(b=>b.onclick=()=>{cancelFlow();state.reading.active=+b.dataset.active;render()});
  const updateSave=()=>{const button=$('#save-reflection'),customMood=state.reflect.customMoodOpen?state.reflect.customMood.trim():'';if(button)button.disabled=!(state.reflect.mood||customMood||state.reflect.notes.trim()||state.reflect.next.trim())};
  $('#notes')?.addEventListener('input',e=>{state.reflect.notes=e.target.value;updateSave()});
  $('#next')?.addEventListener('input',e=>{state.reflect.next=e.target.value;updateSave()});
  document.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{state.reflect.mood=state.reflect.mood===b.dataset.mood?'':b.dataset.mood;state.reflect.customMoodOpen=false;document.querySelector('#custom-mood-field')?.setAttribute('hidden','');$('#custom-mood-toggle')?.classList.remove('selected');$('#custom-mood-toggle')?.setAttribute('aria-pressed','false');document.querySelectorAll('[data-mood]').forEach(option=>{const selected=option.dataset.mood===state.reflect.mood;option.classList.toggle('selected',selected);option.setAttribute('aria-pressed',selected)});updateSave()});
  $('#custom-mood-toggle')?.addEventListener('click',()=>{state.reflect.customMoodOpen=!state.reflect.customMoodOpen;state.reflect.mood='';document.querySelectorAll('[data-mood]').forEach(option=>{option.classList.remove('selected');option.setAttribute('aria-pressed','false')});const field=$('#custom-mood-field'),toggle=$('#custom-mood-toggle');field.hidden=!state.reflect.customMoodOpen;toggle.classList.toggle('selected',state.reflect.customMoodOpen);toggle.setAttribute('aria-pressed',state.reflect.customMoodOpen);if(state.reflect.customMoodOpen)$('#custom-mood')?.focus();updateSave()});
  $('#custom-mood')?.addEventListener('input',e=>{state.reflect.customMood=e.target.value;updateSave()});
  $('#save-reflection')?.addEventListener('click',()=>{
    const notes=$('#notes').value.trim(),next=$('#next').value.trim(),customMood=state.reflect.customMoodOpen?state.reflect.customMood.trim():'',mood=state.reflect.mood||customMood,e=active();
    if(!mood&&!notes&&!next){toast('Choose a feeling, add a note, or add a next step first');return}
    e.timeline.push({id:uid(),createdAt:new Date().toISOString(),reflectionNotes:notes,nextStep:next,mood,kind:'initial'});save();state.page='journal';state.detail=e.id;state.journalCard=null;state.journalAnimate=true;state.composer=false;render();toast('Reflection added to your timeline');
  });
  $('#skip-reflection')?.addEventListener('click',()=>{state.page='journal';state.detail=state.reading.entryId;state.journalCard=null;state.journalAnimate=true;state.composer=false;render()});
  document.querySelectorAll('[data-entry]').forEach(b=>b.onclick=()=>{state.detail=b.dataset.entry;state.journalCard=null;state.journalAnimate=true;render()});
  $('#journal-sort')?.addEventListener('click',()=>{state.journalSort=state.journalSort==='newest'?'oldest':'newest';state.journalFilterOpen=false;render()});
  $('#journal-filter-toggle')?.addEventListener('click',()=>{state.journalFilterOpen=!state.journalFilterOpen;render();if(state.journalFilterOpen)document.querySelector(`[data-journal-topic="${state.journalFilter}"]`)?.focus()});
  document.querySelectorAll('[data-journal-topic]').forEach(button=>button.addEventListener('click',()=>{state.journalFilter=button.dataset.journalTopic;state.journalFilterOpen=false;render()}));
  const filterMenu=$('.journal-filter-menu');
  if(journalOutsideHandler)document.removeEventListener('pointerdown',journalOutsideHandler);
  journalOutsideHandler=event=>{if(state.journalFilterOpen&&filterMenu&&!filterMenu.contains(event.target)){state.journalFilterOpen=false;render()}};
  document.addEventListener('pointerdown',journalOutsideHandler);
  filterMenu?.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();state.journalFilterOpen=false;render();$('#journal-filter-toggle')?.focus()}});
  $('#clear-journal-filter')?.addEventListener('click',()=>{state.journalFilter='all';state.journalFilterOpen=false;render()});
  document.querySelectorAll('[data-delete-entry]').forEach(button=>button.onclick=()=>{state.journal=state.journal.filter(entry=>entry.id!==button.dataset.deleteEntry);save();render();toast('Reading deleted')});
  $('#back-journal')?.addEventListener('click',()=>{state.detail=null;state.journalCard=null;state.composer=false;render()});
  document.querySelectorAll('[data-archive-card]').forEach(button=>button.onclick=()=>{
    state.journalCard=+button.dataset.archiveCard;
    document.querySelectorAll('[data-archive-card]').forEach(card=>{const active=+card.dataset.archiveCard===state.journalCard;card.classList.toggle('active',active);card.setAttribute('aria-pressed',active)});
    document.querySelector('.archive-card-prompt')?.setAttribute('hidden','');
    document.querySelectorAll('.archive-card-meaning').forEach((panel,index)=>panel.hidden=index!==state.journalCard);
  });
  $('#open-composer')?.addEventListener('click',()=>{state.composer=true;render();$('#timeline-notes').focus()});
  $('#close-composer')?.addEventListener('click',()=>{state.composer=false;render()});
  $('#timeline-form')?.addEventListener('submit',e=>{
    e.preventDefault();const notes=$('#timeline-notes').value.trim(),next=$('#timeline-next').value.trim();if(!notes&&!next)return;
    state.journal.find(x=>x.id===state.detail).timeline.push({id:uid(),createdAt:new Date().toISOString(),reflectionNotes:notes,nextStep:next,kind:'followup'});save();state.composer=false;render();toast('Added to your timeline');
  });
  $('#delete-entry')?.addEventListener('click',()=>{state.journal=state.journal.filter(e=>e.id!==state.detail);save();state.detail=null;state.journalCard=null;state.composer=false;render();toast('Reading deleted')});
}
render();
