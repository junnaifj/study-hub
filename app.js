'use strict';
(() => {
  const TRACKS = ['english', 'cantonese', 'japanese', 'korean'];
  const LABELS = { english: 'English', cantonese: 'Cantonese', japanese: 'Japanese', korean: 'Korean' };
  const SLOTS = { morning: 'Morning practice', evening: 'Evening practice', weekend_test: 'Saturday test' };
  const KEY = 'studyhub.v1';
  const $ = s => document.querySelector(s);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const day = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const addDays = (date, n) => new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s + 'T12:00:00Z')) && new Date(s + 'T12:00:00Z').toISOString().slice(0,10) === s;
  const timestamp = () => new Date(Date.now() + 8 * 3600000).toISOString().replace(/\.\d{3}Z$/, '+08:00');
  const normalise = s => String(s).normalize('NFKC').toLocaleLowerCase('en-GB').replace(/[\p{P}\p{Z}\p{S}\s]/gu, '');
  const safeURL = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const own = (o,k) => Object.hasOwn(o,k);
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const integer = x => Number.isInteger(x) && x >= 0;
  const string = x => typeof x === 'string';
  const strings = x => Array.isArray(x) && x.every(string);
  const dictionary = () => Object.create(null);
  function validateLesson(x) {
    assert(isObject(x) && x.schema === 'studyhub.today.v1', 'Expected schema studyhub.today.v1.');
    assert(validDate(x.date) && own(SLOTS,x.slot), 'The lesson needs a valid date and slot.');
    assert(Array.isArray(x.tracks) && x.tracks.length && x.tracks.every(t => TRACKS.includes(t)) && new Set(x.tracks).size === x.tracks.length, 'Invalid lesson tracks.');
    assert(finite(x.minutes) && x.minutes >= 0 && integer(x.new_cards_limit), 'Invalid minutes or new_cards_limit.');
    assert(string(x.note) && Array.isArray(x.tasks), 'The lesson needs note and tasks fields.');
    const ids = new Set(), qids = new Set();
    x.tasks.forEach(t => {
      assert(isObject(t) && string(t.id) && t.id && !ids.has(t.id), 'Task IDs must be unique non-empty strings.'); ids.add(t.id);
      assert(['link','cards','reading','speaking','quiz'].includes(t.type), 'Unknown task type.');
      if(t.type === 'link') assert(string(t.title) && safeURL(t.url) && finite(t.minutes) && t.minutes >= 0, 'Invalid link task. Use an http or https URL.');
      if(t.type === 'cards') assert(TRACKS.includes(t.deck) && strings(t.tags), 'Invalid cards task.');
      if(t.type === 'reading') assert(string(t.title) && string(t.lang) && Array.isArray(t.lines) && t.lines.every(l => isObject(l) && string(l.text) && (l.gloss === undefined || string(l.gloss)) && (l.translation === undefined || string(l.translation))), 'Invalid reading task.');
      if(t.type === 'speaking') assert(string(t.prompt) && (t.seconds === undefined || (integer(t.seconds) && t.seconds > 0 && t.seconds <= 86400)), 'Invalid speaking task.');
      if(t.type === 'quiz') {
        assert(Array.isArray(t.questions), 'Quiz questions must be an array.');
        t.questions.forEach(q => {
          assert(isObject(q) && string(q.id) && q.id && !qids.has(q.id) && string(q.q) && string(q.explain), 'Invalid or duplicate question ID.'); qids.add(q.id);
          assert(['mc','typed','tone'].includes(q.type), 'Unknown question type.');
          if(q.type === 'mc') assert(strings(q.options) && q.options.length >= 2 && integer(q.answer) && q.answer < q.options.length, 'Invalid multiple-choice answer.');
          if(q.type === 'typed') assert(strings(q.answer) && q.answer.length > 0 && q.answer.every(a=>normalise(a).length), 'Typed answers must be a non-empty array of strings.');
          if(q.type === 'tone') assert(Number.isInteger(q.answer) && q.answer >= 1 && q.answer <= 6, 'Tone answers must be 1–6.');
        });
      }
    });
    return x;
  }
  function validateDeck(x, track) {
    assert(isObject(x) && x.schema === 'studyhub.deck.v1' && x.track === track && Array.isArray(x.cards), `Invalid ${track} deck.`);
    const ids = new Set();
    x.cards.forEach(c => { assert(isObject(c) && string(c.id) && c.id && !ids.has(c.id) && ['front','back','gloss','lang'].every(k=>string(c[k])) && strings(c.tags), `Invalid card in ${track}.`); ids.add(c.id); });
    return x;
  }
  function validateProgress(x) {
    assert(isObject(x) && x.schema === 'studyhub.progress.v1', 'Expected schema studyhub.progress.v1.');
    assert(string(x.exported_at) && Number.isFinite(Date.parse(x.exported_at)) && integer(x.streak_days) && isObject(x.cards) && Array.isArray(x.sessions), 'Invalid progress file.');
    for(const c of Object.values(x.cards)) assert(isObject(c) && integer(c.reps) && integer(c.lapses) && finite(c.ease) && c.ease >= 1.3 && integer(c.interval_days) && c.interval_days <= 60 && validDate(c.due) && validDate(c.last_seen) && ['again','hard','good','easy'].includes(c.last_rating), 'Invalid card progress.');
    x.sessions.forEach(s => {
      assert(isObject(s) && validDate(s.date) && own(SLOTS,s.slot) && Array.isArray(s.tracks) && s.tracks.length && s.tracks.every(t=>TRACKS.includes(t)) && finite(s.minutes) && s.minutes >= 0 && strings(s.tasks_done) && string(s.speaking_self_note) && string(s.notes), 'Invalid session record.');
      assert(isObject(s.quiz) && integer(s.quiz.score) && integer(s.quiz.total) && s.quiz.score <= s.quiz.total && strings(s.quiz.wrong) && s.quiz.wrong.length <= s.quiz.total, 'Invalid quiz record.');
    });
    return x;
  }
  function schedule(previous, rating, today = day()) {
    const c = previous || {reps:0,lapses:0,ease:2.5,interval_days:0};
    let interval = c.interval_days, ease = c.ease, reps = c.reps + 1, lapses = c.lapses;
    const good = interval === 0 ? 1 : interval <= 1 ? 3 : interval * ease;
    if(rating === 'again') { interval = 0; ease -= .2; lapses++; reps = 0; }
    if(rating === 'hard') { interval = Math.max(1,interval*1.2); ease -= .15; }
    if(rating === 'good') interval = good;
    if(rating === 'easy') { interval = good*1.3; ease += .15; }
    interval = Math.min(60,Math.max(0,Math.round(interval)));
    return {reps,lapses,ease:Math.round(Math.max(1.3,ease)*100)/100,interval_days:interval,due:addDays(today,interval),last_rating:rating,last_seen:today};
  }
  function checkAnswer(q, raw) {
    if(q.type !== 'typed') return {correct:Number(raw) === q.answer,toneOnly:false};
    const answer = normalise(raw);
    if(q.answer.some(a=>normalise(a) === answer)) return {correct:true,toneOnly:false};
    const letters = s => normalise(s).replace(/[1-6]/g,'');
    const toneOnly = q.answer.some(a => /^[a-z1-6]+$/.test(normalise(a)) && /[1-6]/.test(a) && letters(a) === letters(raw));
    return {correct:false,toneOnly};
  }
  function streak(sessions, today = day()) {
    const dates = new Set(sessions.map(s=>s.date)); let cursor = dates.has(today) ? today : addDays(today,-1), n=0;
    while(dates.has(cursor)){n++;cursor=addDays(cursor,-1);} return n;
  }
  window.StudyHubCore = {schedule, checkAnswer, validateLesson, validateDeck, validateProgress, streak, day, normalise};
  const icons = {
    today:'<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h3m-3 3h6"/>',
    cards:'<rect x="6" y="5" width="14" height="16" rx="2"/><path d="M16 5V3H4a1 1 0 0 0-1 1v14h3m5-7h4m-4 4h4"/>',
    quiz:'<path d="M8 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-2M9 3h6v4H9zM8 12l2 2 5-5m-7 9h8"/>',
    progress:'<path d="M5 20V12m7 8V5m7 15V9M3 21h18"/>',
    settings:'<path d="m10 3-1 3-3 1-2-1-2 4 2 2v3l-1 2 3 3 3-1 3 1 1 2 4-1v-3l2-2 3-1-1-4-3-1-1-2V5l-4-2-2 2z" transform="translate(1 -1) scale(.95)"/><circle cx="12" cy="12" r="3"/>',
    link:'<path d="m9 15 6-6m-6-1 2-2a4 4 0 0 1 6 6l-2 2m0 2-2 2a4 4 0 0 1-6-6l2-2"/>',
    reading:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15"/>',
    speaking:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-3 0h6"/>',
    arrow:'<path d="m9 5 7 7-7 7"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sound:'<path d="M4 9h4l5-4v14l-5-4H4zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.today}</svg>`;
  const chips = tracks => tracks.map(t=>`<span class="chip ${t}">${LABELS[t]}</span>`).join('');
  function tones(text) { return esc(text).replace(/([a-zA-Z]+)([1-6])\b/g, (_,s,n)=>`${s}<sup class="tone tone-${n}">${n}</sup>`); }
  let db, storageFailure=false, loadErrors=[], lesson, goals, decks={}, route='today', filterTrack='all', filterTag='all', cardTask=null, queue=[], flipped=false, quizTask=null, quizIndex=0;
  let timerHandle=null, timerTask=null, timerRemaining=0, timerEnd=0, recording=null, recordingTask=null, stream=null, audioURL=null;
  const recordings = new Map();
  let toastHandle, pendingImport, lastSummary='', lastActive=Date.now(), booting=true;
  function blank() { return {schema:'studyhub.progress.v1',exported_at:timestamp(),streak_days:0,cards:dictionary(),sessions:[],_ui:{drafts:dictionary(),introduced:dictionary()}}; }
  function readDB(){
    try { const raw=localStorage.getItem(KEY); if(!raw)return blank(); const parsed=JSON.parse(raw); validateProgress(parsed); parsed.cards=Object.assign(dictionary(),parsed.cards); parsed._ui ||= {drafts:dictionary(),introduced:dictionary()}; return parsed; }
    catch { storageFailure=true; return blank(); }
  }
  db=readDB();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(db));}catch{storageFailure=true;toast('Progress could not be saved. Download a backup before closing.');}}
  function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastHandle);toastHandle=setTimeout(()=>$('#toast').hidden=true,5500);}
  const sessionKey = () => `${lesson.date}|${lesson.slot}`;
  function draft(){
    const key=sessionKey();
    if(!own(db._ui.drafts,key)) db._ui.drafts[key]={done:[],seconds:0,answers:dictionary(),speaking:dictionary(),notes:'',ratings:[],new:[]};
    const d=db._ui.drafts[key];
    d.answers=Object.assign(dictionary(),d.answers);d.speaking=Object.assign(dictionary(),d.speaking);
    return d;
  }
  function allCards(){return TRACKS.flatMap(t=>(decks[t]?.cards || []).map(c=>({...c,track:t})));}
  function heading(title,sub,extra=''){return `<div class="eyebrow">YOUR STUDY SPACE</div><div class="page-heading"><h1>${title}</h1>${extra}</div><p class="subtitle">${sub}</p>`;}
  function exportProgress(){return {schema:'studyhub.progress.v1',exported_at:timestamp(),streak_days:streak(db.sessions),cards:db.cards,sessions:db.sessions};}
  function download(data,name){const a=document.createElement('a');const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  function syncSavedSession(){
    if(!lesson)return;const index=db.sessions.findIndex(s=>s.date===lesson.date&&s.slot===lesson.slot);
    if(index>=0)db.sessions[index]=sessionRecord();
  }
  function quizQuestions(taskId=null){return lesson.tasks.filter(t=>t.type==='quiz'&&(!taskId||t.id===taskId)).flatMap(t=>t.questions);}
  function quizResult(){const qs=quizQuestions(),d=draft(),answers=d.answers;if(d.importedQuiz && Object.keys(answers).length < qs.length)return d.importedQuiz;return {score:qs.filter(q=>answers[q.id]?.correct).length,total:qs.length,wrong:qs.filter(q=>answers[q.id]&&!answers[q.id].correct).map(q=>q.id)};}
  function sessionRecord(){const d=draft();return {date:lesson.date,slot:lesson.slot,tracks:[...lesson.tracks],minutes:Math.round(d.seconds/60),tasks_done:lesson.tasks.filter(t=>d.done.includes(t.id)).map(t=>t.id),quiz:quizResult(),speaking_self_note:lesson.tasks.filter(t=>t.type==='speaking').map(t=>d.speaking[t.id]||'').filter(Boolean).join(' | '),notes:d.notes};}
  function summary(){
    const s=sessionRecord(),d=draft(),skipped=lesson.tasks.filter(t=>!s.tasks_done.includes(t.id)).map(t=>t.id),counts={again:0,hard:0,good:0,easy:0};d.ratings.forEach(r=>counts[r.rating]++);
    const hard=[...new Set(d.ratings.filter(r=>['again','hard'].includes(r.rating)).map(r=>r.id))];
    return `STUDYHUB ${s.date} ${s.slot} | ${s.minutes} min | tasks ${s.tasks_done.join(',')||'none'} done, ${skipped.join(',')||'none'} skipped\nquiz ${s.quiz.score}/${s.quiz.total} wrong: ${s.quiz.wrong.join(', ')||'none'}\ncards: ${d.ratings.length} reviewed (again ${counts.again}, hard ${counts.hard}, good ${counts.good}, easy ${counts.easy}), new ${d.new.length}\nhard cards: ${hard.join(', ')||'none'}\nnote: ${[s.speaking_self_note,s.notes].filter(Boolean).join(' | ')}`;
  }
  function update(){syncSavedSession();save();}
  async function fetchJSON(path){const r=await fetch(`${path}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${path}: ${r.status}`);return r.json();}
  async function load(){
    booting=true;
    const results=await Promise.allSettled([fetchJSON('data/today.json'),fetchJSON('data/goals.json'),...TRACKS.map(t=>fetchJSON(`data/decks/${t}.json`))]);
    loadErrors=[];
    try{assert(results[0].status==='fulfilled','The published lesson could not be loaded.');lesson=validateLesson(results[0].value);}catch(e){loadErrors.push(e.message);lesson=null;}
    goals=null;
    if(results[1].status==='fulfilled'){
      const g=results[1].value;
      if(isObject(g)&&g.schema==='studyhub.goals.v1'&&validDate(g.end)&&Array.isArray(g.goals)&&g.goals.every(x=>TRACKS.includes(x.track)&&string(x.label)&&finite(x.target)&&x.target>0&&finite(x.done)&&x.done>=0))goals=g;
      else loadErrors.push('Goals have an invalid format.');
    }else loadErrors.push('Goals could not be loaded.');
    decks={};const cardIds=new Set();
    TRACKS.forEach((t,i)=>{try{assert(results[i+2].status==='fulfilled',`${LABELS[t]} cards could not be loaded.`);const deck=validateDeck(results[i+2].value,t);deck.cards.forEach(c=>{assert(!cardIds.has(c.id),'Card IDs must be unique across decks.');cardIds.add(c.id);});decks[t]=deck;}catch(e){loadErrors.push(e.message);}});
    if(db._ui.importedLesson){try{lesson=validateLesson(db._ui.importedLesson);}catch{delete db._ui.importedLesson;}}
    booting=false;queue=[];render();
  }
  function render(){
    if(booting)return;
    document.querySelectorAll('.nav-item').forEach(a=>{const active=a.dataset.route===route;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(!lesson){$('#main').innerHTML=heading('A fresh start.','Your lesson is not available yet.')+`<div class="card empty"><h2>Bring your lesson along</h2><p>Import a today.json from Tone Police, or reload the published lesson.</p><button class="button primary" data-import="lesson">Import lesson</button></div>`;return;}
    const banner=(storageFailure?'<div class="notice">Browser storage is unavailable or an existing record could not be read. Keep a downloaded backup of your progress.</div>':'')+loadErrors.map(e=>`<div class="notice">${esc(e)}</div>`).join('');
    $('#main').innerHTML=banner+({today:renderToday,cards:renderCards,quiz:renderQuiz,progress:renderProgress}[route]||renderToday)();
  }
  function taskTitle(t){return t.title || ({cards:`${LABELS[t.deck]} flashcards`,speaking:'Find your voice',quiz:lesson.slot==='weekend_test'?'Your weekly test':'A little knowledge check'}[t.type]);}
  function taskDetail(t){return {link:`${t.minutes} min · Watch or listen`,cards:`${(t.tags||[]).join(' · ')||'Daily review'} · Spaced practice`,reading:`${t.lines?.length||0} lines · Read at your pace`,speaking:`${t.seconds||60} sec · Speak, then reflect`,quiz:`${t.questions?.length||0} questions · Check your understanding`}[t.type];}
  function renderToday(){
    const d=draft(),done=lesson.tasks.filter(t=>d.done.includes(t.id)).length,total=lesson.tasks.length,pct=total?done/total*100:0;
    const dateLabel=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',timeZone:'Asia/Hong_Kong'}).format(new Date(lesson.date+'T12:00:00Z'));
    const heroTitle=lesson.slot==='morning'?'A little practice, a brighter day.':lesson.slot==='evening'?'A quiet moment to practise.':'See how far you’ve come.';
    return heading('Today','Small steps. More confidence.',`<span class="date-pill">${icon('today')}${dateLabel}</span>`)+
      (db._ui.importedLesson?'<div class="notice">Using your imported lesson. To switch back, choose Reload published lesson in Settings.</div>':'')+
      (lesson.date!==day()?`<div class="notice">This lesson is dated ${esc(lesson.date)}. Today is ${day()} in Hong Kong. Import or reload a newer lesson when available.</div>`:'')+
      `<section class="card hero"><div class="hero-top"><div><div class="eyebrow">${SLOTS[lesson.slot]}</div><h2>${heroTitle}</h2></div><img class="owl-note" src="assets/owl.svg" alt="Fine-line owl"></div><p class="note">${esc(lesson.note)}</p><div class="chips">${chips(lesson.tracks)}</div><div class="session-meta">${icon('clock')}<span>About ${lesson.minutes} minutes</span><span class="dot"></span><span>${total} small steps</span></div><div style="margin-top:23px" class="progress-track" role="progressbar" aria-label="Tasks completed" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total||1}"><div class="progress-fill" style="width:${pct}%"></div></div><div class="progress-caption"><span>${done===total&&total?'All steps complete. Nicely done.':'One thing at a time.'}</span><span>${done} of ${total} complete</span></div></section>
      <div class="section-heading"><h2>Your practice</h2><span class="muted">A little of everything</span></div>
      <section class="card task-list" aria-label="Daily task checklist">${lesson.tasks.map(t=>`<div class="task-row ${d.done.includes(t.id)?'completed':''}"><label class="check-hit"><input class="task-check" type="checkbox" data-task-check="${esc(t.id)}" aria-label="Mark ${esc(taskTitle(t))} complete" ${d.done.includes(t.id)?'checked':''}></label><span class="task-symbol ${t.type}">${icon(t.type)}</span><div class="task-main"><div class="task-title">${esc(taskTitle(t))}</div><div class="task-detail">${esc(taskDetail(t))}</div></div><button class="task-open" data-open-task="${esc(t.id)}" aria-label="Open ${esc(taskTitle(t))}">${icon('arrow')}</button></div>`).join('')}</section>
      ${lesson.tasks.filter(t=>['reading','speaking','link'].includes(t.type)).map(renderTask).join('')}
      <div class="field session-notes"><label for="session-note">Anything else for Tone Police? <span class="muted">Optional</span></label><textarea id="session-note" placeholder="One thing you noticed today…">${esc(d.notes)}</textarea></div>
      <div class="finish-wrap"><button id="finish-session" class="button primary full">Finish session ${icon('check')}</button><p class="finish-foot">Save your progress. Make tomorrow a little easier.</p></div>`;
  }
  function renderTask(t){
    const id=esc(t.id);
    if(t.type==='link')return `<section class="card detail-section" id="task-${id}"><div class="eyebrow">WATCH · LISTEN · READ</div><a class="link-resource" href="${esc(safeURL(t.url))}" target="_blank" rel="noopener noreferrer"><h3>${esc(t.title)} ↗</h3><p class="muted" style="font-size:12px;margin-top:6px">${t.minutes} minutes · Opens in a new tab</p></a>${doneCheckbox(t)}</section>`;
    if(t.type==='reading')return `<section class="card detail-section" id="task-${id}"><div class="row"><span class="eyebrow">READING</span><button class="button quiet" data-gloss="${id}" aria-expanded="false">Show gloss</button></div><h2 style="margin-top:15px">${esc(t.title)}</h2><div>${t.lines.map(l=>`<div class="passage-line"><p class="passage-text" lang="${esc(t.lang)}">${esc(l.text)}</p><div class="reading-gloss" hidden>${l.gloss?`<p class="gloss">${tones(l.gloss)}</p>`:''}${l.translation?`<p class="translation">${esc(l.translation)}</p>`:''}</div></div>`).join('')}</div>${doneCheckbox(t)}</section>`;
    if(t.type==='speaking')return `<section class="card detail-section" id="task-${id}"><div class="eyebrow">YOUR VOICE, A LITTLE STRONGER</div><h2 style="margin:12px 0">Speaking practice</h2><p>${esc(t.prompt)}</p><div class="timer" id="timer-${id}" role="timer">${formatTimer(timerTask===t.id?timerRemaining:t.seconds||60)}</div><div class="button-row"><button class="button secondary" data-timer="${id}">${timerTask===t.id&&timerHandle?'Pause timer':'Start timer'}</button><button class="button quiet" data-reset-timer="${id}">Reset</button></div>${window.MediaRecorder&&navigator.mediaDevices?.getUserMedia?`<button class="button quiet full" data-record="${id}" ${recordingTask&&recordingTask!==t.id?'disabled':''}>${recordingTask===t.id?'Stop recording':'Record your practice'}</button>`:'<p class="fine">Recording is unavailable in this browser. You can still practise with the timer.</p>'}${recordings.has(t.id)?`<audio controls src="${esc(recordings.get(t.id).url)}"></audio><a class="button quiet full" href="${esc(recordings.get(t.id).url)}" download="speaking-${lesson.date}.${recordings.get(t.id).ext}">Download recording</a>`:''}<p class="fine" style="margin:10px 0 18px">Audio stays on this device. Download it to keep a copy after closing this page.</p><div class="field"><label for="speaking-${id}">One line of self-feedback</label><textarea id="speaking-${id}" data-speaking-note="${id}" placeholder="What felt good? What would you change?">${esc(draft().speaking[t.id]||'')}</textarea></div>${doneCheckbox(t)}</section>`;
    return '';
  }
  function doneCheckbox(t){return `<label class="inline-checkbox" style="margin-top:16px"><input type="checkbox" data-task-check="${esc(t.id)}" ${draft().done.includes(t.id)?'checked':''}>Mark this task complete</label>`;}
  function buildQueue(){
    const today=day(),cards=allCards().filter(c=>(filterTrack==='all'||c.track===filterTrack)&&(filterTag==='all'||c.tags.includes(filterTag)));
    const task=lesson.tasks.find(t=>t.id===cardTask);
    const filtered=task?cards.filter(c=>c.track===task.deck&&(!task.tags.length||task.tags.some(tag=>c.tags.includes(tag)))):cards;
    const due=filtered.filter(c=>own(db.cards,c.id)&&db.cards[c.id].due<=today).sort((a,b)=>db.cards[a.id].due.localeCompare(db.cards[b.id].due));
    const introduced=db._ui.introduced[today]||[];
    const remaining=Math.max(0,lesson.new_cards_limit-introduced.length);
    const fresh=filtered.filter(c=>!own(db.cards,c.id)).slice(0,remaining);
    queue=[...due,...fresh];flipped=false;
  }
  function renderCards(){
    if(!queue.length)buildQueue();const c=queue[0],tags=[...new Set(allCards().filter(c=>filterTrack==='all'||c.track===filterTrack).flatMap(c=>c.tags))].sort();
    return heading('A little recall.','Make it familiar, one card at a time.')+`<div class="filters"><div class="field"><label for="filter-track">Language</label><select id="filter-track"><option value="all">All languages</option>${TRACKS.map(t=>`<option value="${t}" ${filterTrack===t?'selected':''}>${LABELS[t]}</option>`).join('')}</select></div><div class="field"><label for="filter-tag">Topic</label><select id="filter-tag"><option value="all">All topics</option>${tags.map(t=>`<option ${filterTag===t?'selected':''} value="${esc(t)}">${esc(t)}</option>`).join('')}</select></div></div>${cardTask?`<div class="notice">Practising your lesson’s card task. <button class="button quiet" id="all-cards">Show all cards</button></div>`:''}`+
      (c?`<div class="card-toolbar"><span>${own(db.cards,c.id)?'Due for review':'A new little discovery'}</span><span>${queue.length} remaining</span></div><button class="flashcard" id="flip-card" aria-label="${flipped?'Card answer. Flip to front':'Card front. Flip to answer'}"><span class="chip ${c.track}">${LABELS[c.track]}</span><span class="flash-text ${flipped?'back-text':''}" lang="${esc(c.lang)}">${flipped?tones(c.back):esc(c.front)}</span>${flipped?`<span class="gloss">${tones(c.gloss)}</span>`:''}<span class="flash-hint">${flipped?'How well did you remember?':'Tap to reveal · Space to flip'}</span></button><div class="row"><span class="fine">${c.tags.map(esc).join(' · ')}</span>${voiceFor(c.lang)?`<button class="button quiet" id="speak-card">${icon('sound')} Play</button>`:''}</div><div class="rating-grid">${['again','hard','good','easy'].map((r,i)=>`<button class="rating" data-rating="${r}" ${!flipped?'disabled':''}>${r[0].toUpperCase()+r.slice(1)}<small>${r==='again'?'This session':schedule(db.cards[c.id],r).interval_days+' day'+(schedule(db.cards[c.id],r).interval_days===1?'':'s')} · ${i+1}</small></button>`).join('')}</div><p class="fine" style="text-align:center">Space to flip · 1–4 to rate after revealing</p>`:
      `<div class="card empty"><img src="assets/owl.svg" width="58" height="66" alt=""><h2>A little space to let it settle.</h2><p>No more cards are due in this selection. New cards are limited to ${lesson.new_cards_limit} a day across all languages.</p>${cardTask?'<button id="complete-cards" class="button primary">Complete card task</button>':''}</div>`);
  }
  function rate(rating){
    if(!flipped||!queue.length)return;const c=queue.shift(),today=day(),wasNew=!own(db.cards,c.id),d=draft();
    db.cards[c.id]=schedule(db.cards[c.id],rating,today);
    d.ratings.push({id:c.id,rating});
    if(wasNew){db._ui.introduced[today]||=[];if(!db._ui.introduced[today].includes(c.id))db._ui.introduced[today].push(c.id);if(!d.new.includes(c.id))d.new.push(c.id);}
    if(rating==='again')queue.push(c);
    // Trim unintroduced cards if another view has already consumed today's allowance.
    let allowance=Math.max(0,lesson.new_cards_limit-(db._ui.introduced[today]||[]).length);
    queue=queue.filter(item=>own(db.cards,item.id)||allowance-->0);
    flipped=false;update();render();
  }
  function voiceFor(lang){
    if(!('speechSynthesis' in window))return null;const voices=speechSynthesis.getVoices();const norm=s=>s.toLowerCase().replace('_','-');
    const choices=['yue-hk','zh-hk'].includes(norm(lang))?['yue-hk','zh-hk']: [norm(lang)];
    return voices.find(v=>choices.includes(norm(v.lang)))||null;
  }
  function renderQuiz(){
    const tasks=lesson.tasks.filter(t=>t.type==='quiz');if(!quizTask||!tasks.some(t=>t.id===quizTask))quizTask=tasks[0]?.id;
    const qs=quizQuestions(quizTask),answers=draft().answers;
    const selector=tasks.length>1?`<div class="field" style="margin-bottom:20px"><label for="quiz-task">Quiz</label><select id="quiz-task">${tasks.map((t,i)=>`<option value="${esc(t.id)}" ${quizTask===t.id?'selected':''}>${esc(t.title||`Quiz ${i+1}`)}</option>`).join('')}</select></div>`:'';
    const completed=qs.length&&qs.every(q=>own(answers,q.id));
    if(!qs.length)return heading('A little check-in.','A chance to see what has stayed with you.')+selector+'<div class="card empty"><h2>No quiz in this lesson</h2><p>Your next lesson may bring a new challenge.</p></div>';
    if(completed){const correct=qs.filter(q=>answers[q.id].correct).length;return heading('Look how far you’ve come.','Every answer is something to build on.')+selector+`<section class="card"><div class="eyebrow">YOUR RESULT</div><div class="quiz-score">${correct}<span class="muted" style="font-size:25px"> / ${qs.length}</span></div><p>${correct===qs.length?'Everything clicked today.':'A few things to revisit. That’s how learning happens.'}</p>${qs.filter(q=>!answers[q.id].correct).map(q=>`<div class="feedback wrong"><strong>${esc(q.q)}</strong>${esc(q.explain)}<p class="fine">Question ${esc(q.id)}</p></div>`).join('')}<button class="button primary full" id="quiz-done" style="margin-top:22px">Back to today</button></section>`;}
    if(quizIndex>=qs.length||own(answers,qs[quizIndex]?.id))quizIndex=qs.findIndex(q=>!own(answers,q.id));
    const q=qs[quizIndex];
    return heading('A little check-in.','Take your time. You know more than you think.')+selector+`<section class="card" id="quiz-card"><div class="quiz-progress">Question ${quizIndex+1} of ${qs.length}</div><div class="progress-track"><div class="progress-fill" style="width:${quizIndex/qs.length*100}%"></div></div><h2 class="question">${esc(q.q)}</h2><form id="quiz-form">${q.type==='typed'?'<label class="field-label" for="typed-answer">Your answer</label><input id="typed-answer" name="answer" type="text" autocomplete="off" required placeholder="Type your answer…">':`<div class="answer-list" role="group" aria-label="Answer options">${(q.type==='tone'?[1,2,3,4,5,6]:q.options).map((value,i)=>`<button class="answer-option" type="button" data-answer="${q.type==='tone'?value:i}" aria-pressed="false">${q.type==='tone'?'Tone '+value:esc(value)}</button>`).join('')}</div><input id="selected-answer" name="answer" type="hidden">`}<button class="button primary full" id="check-answer" style="margin-top:24px" type="submit">Check answer</button></form><div id="quiz-feedback" aria-live="polite"></div></section>`;
  }
  function submitAnswer(event){
    event.preventDefault();const qs=quizQuestions(quizTask),q=qs[quizIndex];if(!q||own(draft().answers,q.id))return;
    const raw=new FormData(event.target).get('answer');if(raw===null||!String(raw).trim()){toast('Choose or enter an answer first.');return;}
    const result=checkAnswer(q,raw);draft().answers[q.id]=result;
    event.target.querySelectorAll('button,input').forEach(el=>el.disabled=true);
    $('#quiz-feedback').innerHTML=`<div class="feedback ${result.correct?'':'wrong'}"><strong>${result.correct?'That’s right.':result.toneOnly?'Letters right, tone wrong.':'Something to revisit.'}</strong>${esc(q.explain)}${!result.correct?`<p style="margin-top:8px">Answer: ${tones(q.type==='mc'?q.options[q.answer]:q.type==='tone'?'Tone '+q.answer:q.answer.join(' / '))}</p>`:''}</div><button class="button secondary full" id="next-question" style="margin-top:16px">${qs.every(item=>own(draft().answers,item.id))?'See results':'Next question'}</button>`;
    if(qs.every(item=>own(draft().answers,item.id))&&!draft().done.includes(quizTask))draft().done.push(quizTask);
    update();
  }
  function renderProgress(){
    const today=day(),weekStart=addDays(today,-((new Date(today+'T12:00:00Z').getUTCDay()+6)%7)),week=db.sessions.filter(s=>s.date>=weekStart&&s.date<=today);
    const mins=week.reduce((n,s)=>n+s.minutes,0),learned=allCards().filter(c=>own(db.cards,c.id)&&db.cards[c.id].reps>0);
    const quizzes=db.sessions.filter(s=>s.quiz.total>0).slice().sort((a,b)=>`${a.date}${a.slot==='morning'?'0':a.slot==='evening'?'1':'2'}`.localeCompare(`${b.date}${b.slot==='morning'?'0':b.slot==='evening'?'1':'2'}`)).slice(-7);
    return heading('It all adds up.','Quiet progress is still progress.')+`<div class="stats"><section class="card stat"><div class="eyebrow">YOUR STREAK</div><div class="stat-value">${streak(db.sessions)} <span style="font-size:15px;letter-spacing:0">days</span></div><p class="fine">The owl is watching. Keep showing up.</p></section><section class="card stat"><div class="eyebrow">THIS WEEK</div><div class="stat-value">${Math.round(mins)} <span style="font-size:15px;letter-spacing:0">min</span></div><p class="fine">Time you made for yourself.</p></section></div><div class="section-heading"><h2>A little in each language</h2></div><section class="card">${TRACKS.map(t=>{const m=week.filter(s=>s.tracks.includes(t)).reduce((n,s)=>n+s.minutes/s.tracks.length,0);return `<div class="track-stat row"><span class="chip ${t}">${LABELS[t]}</span><span style="font-size:12px">${Number(m.toFixed(1))} min <span class="muted">· ${learned.filter(c=>c.track===t).length} cards learned</span></span></div>`;}).join('')}<p class="fine" style="margin-top:16px">Mixed-language session minutes are shared equally between their languages. Cards learned have at least one successful review.</p></section><div class="section-heading"><h2>Your recent quizzes</h2><span class="muted">Last seven</span></div><section class="card">${quizzes.length?`<div class="mini-bars" role="img" aria-label="Last seven quiz scores: ${quizzes.map(s=>`${s.date}, ${s.quiz.score} out of ${s.quiz.total}`).join('; ')}">${quizzes.map(s=>`<div class="bar-col"><span>${s.quiz.score}/${s.quiz.total}</span><div class="bar" style="height:${s.quiz.score/s.quiz.total*100}px"></div><span>${s.date.slice(5)}</span></div>`).join('')}</div>`:'<p class="muted">Your first finished quiz will appear here.</p>'}</section><div class="section-heading"><h2>Your four-week intentions</h2></div><section class="card">${goals?`<p class="fine">Working towards ${esc(goals.end)} · Updated by Tone Police</p>${goals.goals.map(g=>`<div class="goal"><div class="row"><div><span class="chip ${g.track}">${LABELS[g.track]}</span><h3 style="margin-top:8px">${esc(g.label)}</h3></div><span class="muted">${g.done}/${g.target}</span></div><div class="progress-track" role="progressbar" aria-label="${esc(g.label)}" aria-valuemin="0" aria-valuemax="${g.target}" aria-valuenow="${Math.min(g.done,g.target)}"><div class="progress-fill" style="width:${Math.min(100,g.done/g.target*100)}%"></div></div></div>`).join('')}`:'<p class="muted">Your goals will appear when goals.json is available.</p>'}</section><p class="fine">Statistics include finished sessions. Finish a session on Today to include it here.</p>`;
  }
  function formatTimer(n){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  function stopTimer(){clearInterval(timerHandle);timerHandle=null;}
  function toggleTimer(id){
    if(timerTask===id&&timerHandle){timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));stopTimer();render();return;}
    if(timerTask!==id){stopTimer();timerTask=id;timerRemaining=lesson.tasks.find(t=>t.id===id).seconds||60;}
    if(timerRemaining<=0)timerRemaining=lesson.tasks.find(t=>t.id===id).seconds||60;
    timerEnd=Date.now()+timerRemaining*1000;
    timerHandle=setInterval(()=>{timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));const el=document.getElementById('timer-'+id);if(el)el.textContent=formatTimer(timerRemaining);if(!timerRemaining){stopTimer();toast('Time’s up. Take a breath and reflect.');if(route==='today')render();}},250);render();
  }
  async function toggleRecording(id){
    if(recordingTask&&!recording){toast('Waiting for microphone permission…');return;}
    if(recording){if(recordingTask===id&&recording.state!=='inactive')recording.stop();return;}
    if(!window.isSecureContext){toast('Recording needs HTTPS or a localhost preview.');return;}
    recordingTask=id;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const chunks=[];recording=new MediaRecorder(stream);const captured=recording;
      captured.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      captured.onstop=()=>{const blob=new Blob(chunks,{type:captured.mimeType}),ext=captured.mimeType.includes('mp4')?'m4a':captured.mimeType.includes('ogg')?'ogg':'webm';if(recordings.has(id))URL.revokeObjectURL(recordings.get(id).url);recordings.set(id,{url:URL.createObjectURL(blob),ext});stream?.getTracks().forEach(t=>t.stop());stream=null;recording=null;recordingTask=null;render();};
      captured.onerror=()=>{stream?.getTracks().forEach(t=>t.stop());recording=null;recordingTask=null;toast('Recording stopped unexpectedly. Please try again.');render();};
      captured.start();render();
    }catch{stream?.getTracks().forEach(t=>t.stop());recording=null;recordingTask=null;toast('Microphone access was unavailable. You can still use the timer and self-feedback.');render();}
  }
  function navigate(next){route=['today','cards','quiz','progress'].includes(next)?next:'today';if(location.hash!=='#'+route)location.hash=route;else render();window.scrollTo({top:0});}
  function finish(){
    tick();syncSavedSession();const s=sessionRecord(),i=db.sessions.findIndex(x=>x.date===s.date&&x.slot===s.slot);if(i>=0)db.sessions[i]=s;else db.sessions.push(s);db.streak_days=streak(db.sessions);save();lastSummary=summary();$('#finish-content').innerHTML=`<p class="muted">${s.tasks_done.length} of ${lesson.tasks.length} tasks · ${s.minutes} minutes · Quiz ${s.quiz.score}/${s.quiz.total}</p><pre class="summary">${esc(lastSummary)}</pre>`;$('#finish-dialog').showModal();
  }
  async function importFile(file){
    try{
      assert(file.size<=5*1024*1024,'Please choose a JSON file smaller than 5 MB.');const x=JSON.parse(await file.text());
      if(pendingImport==='lesson'){
        validateLesson(x);assert(!recordingTask,'Stop your recording before importing another lesson.');
        stopTimer();timerTask=null;db._ui.importedLesson=x;lesson=x;cardTask=null;quizTask=null;quizIndex=0;queue=[];route='today';location.hash='#today';save();render();toast('Lesson imported. Ready when you are.');
      }else{
        validateProgress(x);if(!confirm('Replace this browser’s progress with the imported file? Download a backup first if you want to keep the current records.'))return;
        db=blank();db.cards=Object.assign(dictionary(),x.cards);db.sessions=structuredClone(x.sessions);db.streak_days=streak(db.sessions);
        // Imported SM-2 records do not identify introduction dates. Conservatively count
        // cards last seen today towards the daily allowance to avoid over-introducing.
        db._ui.introduced[day()]=Object.keys(db.cards).filter(id=>db.cards[id].last_seen===day());
        // Restore task completion and notes for an existing current lesson session.
        if(lesson){const saved=db.sessions.findLast(s=>s.date===lesson.date&&s.slot===lesson.slot);if(saved){const d=draft();d.done=saved.tasks_done.filter(id=>lesson.tasks.some(t=>t.id===id));d.seconds=saved.minutes*60;d.notes=saved.notes;const speak=lesson.tasks.find(t=>t.type==='speaking');if(speak)d.speaking[speak.id]=saved.speaking_self_note;d.importedQuiz=saved.quiz;}}
        save();queue=[];render();toast('Progress restored on this device.');
      }
    }catch(e){toast('Could not import: '+e.message);}finally{$('#file-input').value='';}
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button)return;
    if(button.classList.contains('close-dialog')){button.closest('dialog').close();return;}
    if(button.dataset.import){pendingImport=button.dataset.import;$('#settings-dialog').close();$('#file-input').click();return;}
    if(button.id==='settings-open'){$('#settings-dialog').showModal();return;}
    if(['download-progress','finish-download'].includes(button.id)){syncSavedSession();download(exportProgress(),'progress.json');return;}
    if(button.id==='reload-lesson'){if(recordingTask){toast('Stop recording before reloading the lesson.');return;}stopTimer();timerTask=null;delete db._ui.importedLesson;save();$('#settings-dialog').close();load();return;}
    if(button.dataset.openTask){const t=lesson.tasks.find(t=>t.id===button.dataset.openTask);if(t.type==='cards'){cardTask=t.id;filterTrack=t.deck;filterTag='all';buildQueue();navigate('cards');}else if(t.type==='quiz'){quizTask=t.id;quizIndex=0;navigate('quiz');}else document.getElementById('task-'+t.id)?.scrollIntoView({behavior:'smooth'});return;}
    if(button.dataset.gloss){const section=document.getElementById('task-'+button.dataset.gloss),show=button.getAttribute('aria-expanded')!=='true';section.querySelectorAll('.reading-gloss').forEach(el=>el.hidden=!show);button.textContent=show?'Hide gloss':'Show gloss';button.setAttribute('aria-expanded',String(show));return;}
    if(button.id==='flip-card'){flipped=!flipped;render();return;}
    if(button.dataset.rating){rate(button.dataset.rating);return;}
    if(button.id==='all-cards'){cardTask=null;filterTrack='all';filterTag='all';buildQueue();render();return;}
    if(button.id==='complete-cards'){if(cardTask&&!draft().done.includes(cardTask))draft().done.push(cardTask);update();navigate('today');return;}
    if(button.id==='speak-card'){const c=queue[0],voice=voiceFor(c.lang);if(voice){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(c.front);u.lang=c.lang;u.voice=voice;u.rate=.85;speechSynthesis.speak(u);}return;}
    if(own(button.dataset,'answer')){const value=button.dataset.answer;$('#selected-answer').value=value;document.querySelectorAll('.answer-option').forEach(el=>{const selected=el===button;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});return;}
    if(button.id==='next-question'){quizIndex++;render();return;}
    if(button.id==='quiz-done'){navigate('today');return;}
    if(button.dataset.timer){toggleTimer(button.dataset.timer);return;}
    if(button.dataset.resetTimer){stopTimer();timerTask=button.dataset.resetTimer;timerRemaining=lesson.tasks.find(t=>t.id===timerTask).seconds||60;render();return;}
    if(button.dataset.record){toggleRecording(button.dataset.record);return;}
    if(button.id==='finish-session'){finish();return;}
    if(button.id==='copy-summary'){
      const text=lastSummary;
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>toast('Summary copied. Ready for Tone Police.')).catch(()=>copyFallback(text));else copyFallback(text);
    }
  });
  function copyFallback(text){const a=document.createElement('textarea');a.value=text;$('#finish-dialog').append(a);a.select();const ok=document.execCommand('copy');a.remove();toast(ok?'Summary copied.':'Select and copy the summary above.');}
  document.addEventListener('change',e=>{
    const el=e.target;
    if(el.id==='file-input'&&el.files[0]){importFile(el.files[0]);return;}
    if(el.dataset.taskCheck){const d=draft(),id=el.dataset.taskCheck;d.done=d.done.filter(x=>x!==id);if(el.checked)d.done.push(id);update();render();return;}
    if(el.id==='filter-track'){filterTrack=el.value;filterTag='all';cardTask=null;buildQueue();render();return;}
    if(el.id==='filter-tag'){filterTag=el.value;cardTask=null;buildQueue();render();return;}
    if(el.id==='quiz-task'){quizTask=el.value;quizIndex=0;render();}
  });
  document.addEventListener('input',e=>{if(!lesson)return;if(e.target.dataset.speakingNote){draft().speaking[e.target.dataset.speakingNote]=e.target.value;update();}if(e.target.id==='session-note'){draft().notes=e.target.value;update();}});
  document.addEventListener('submit',e=>{if(e.target.id==='quiz-form')submitAnswer(e);});
  document.addEventListener('keydown',e=>{
    if(route!=='cards'||e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select'))return;
    if(e.code==='Space'&&queue.length&&!e.target.closest('button,a')){e.preventDefault();flipped=!flipped;render();}
    if(['1','2','3','4'].includes(e.key)&&flipped){e.preventDefault();rate(['again','hard','good','easy'][Number(e.key)-1]);}
  });
  let idleSince=Date.now();['pointerdown','keydown','scroll','touchstart'].forEach(name=>document.addEventListener(name,()=>idleSince=Date.now(),{passive:true}));
  function tick(){const now=Date.now(),elapsed=(now-lastActive)/1000;lastActive=now;if(lesson&&!booting&&!document.hidden&&now-idleSince<120000&&elapsed<10){draft().seconds+=elapsed;syncSavedSession();save();}}
  setInterval(tick,5000);
  document.addEventListener('visibilitychange',()=>{lastActive=Date.now();if(!document.hidden)idleSince=Date.now();});
  window.addEventListener('pagehide',()=>{tick();if(recording&&recording.state!=='inactive')recording.stop();stream?.getTracks().forEach(t=>t.stop());});
  window.addEventListener('hashchange',()=>{route=location.hash.slice(1);if(!['today','cards','quiz','progress'].includes(route))route='today';render();});
  window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{const x=JSON.parse(e.newValue);validateProgress(x);db=x;db.cards=Object.assign(dictionary(),db.cards);queue=[];render();toast('Progress updated from another tab.');}catch{toast('Another tab wrote an unreadable progress record.');}}});
  if('speechSynthesis' in window)speechSynthesis.addEventListener('voiceschanged',()=>{if(route==='cards')render();});
  $('.bottom-nav').innerHTML=['today','cards','quiz','progress'].map(t=>`<a class="nav-item" href="#${t}" data-route="${t}">${icon(t)}<span>${t[0].toUpperCase()+t.slice(1)}</span></a>`).join('');
  $('#settings-open').innerHTML=icon('settings');
  route=location.hash.slice(1)||'today';if(!['today','cards','quiz','progress'].includes(route))route='today';
  load();
})();
