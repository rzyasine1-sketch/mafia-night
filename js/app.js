
const roleDefs=window.MafiaRoles.definitions;
let playerCount=8, players=[], assigned=[], dealIndex=0, dealTimer=null, dealSeconds=20, dealVisible=false, dealWaitingNext=false;
let stage=0, nightPicks={kill:'',mute:'',doctor:'',sniper:''}, sniperChoice='wait', sniperUsed=false, protectedLast='', round=1;
let speakerIndex=0,speechSeconds=90,speechTimer=null,speechRunning=false;
let votes={},voteClosed=false, pendingBomber=[], currentBomber=null, logs=[], revoteCandidates=null, revoteNo=0, evictorClaimed=false;
let activeView='setup', bomberAfterVote=false, gameOver=false;
let pendingMorningAnnouncements=[];
let pendingInheritance=[], inheritanceTimer=null, inheritanceSeconds=20, inheritanceContinuation=null;
let voteRevealed=false, voteNeedsPass=false, toastTimer=null;
let roleCounts={killer:1,mute:1,doctor:1,sniper:1,bomber:0,evictor:0};
let names=['أحمد','ياسين','سليم','كريم','ريان','أمين','مراد','فارس'];
let currentRoster = window.MafiaStorage.getLastRoster();
if(!currentRoster.length) currentRoster = [...names];
playerCount = currentRoster.length;
const $=id=>document.getElementById(id);
function notify(message){const t=$('toast');if(!t)return;t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600)}
let confirmResolver=null;
function confirmInApp({title='هل تريد المتابعة؟',message='راجع الإجراء قبل تنفيذه.',accept='تأكيد',danger=false}={}){
 const modal=$('confirmModal');
 return new Promise(resolve=>{
  if(confirmResolver){const previous=confirmResolver;confirmResolver=null;previous(false)}
  confirmResolver=resolve;
  $('appConfirmTitle').textContent=title;$('appConfirmText').textContent=message;$('appConfirmAccept').textContent=accept;
  $('appConfirmAccept').classList.toggle('danger',danger);
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  setTimeout(()=>$('appConfirmCancel').focus(),0);
 });
}
function settleAppConfirm(value){const modal=$('confirmModal');modal.classList.remove('open');modal.setAttribute('aria-hidden','true');if(confirmResolver){const done=confirmResolver;confirmResolver=null;done(value)}}
$('appConfirmCancel').onclick=()=>settleAppConfirm(false);
$('appConfirmAccept').onclick=()=>settleAppConfirm(true);
$('confirmModal').addEventListener('click',e=>{if(e.target.id==='confirmModal')settleAppConfirm(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('confirmModal').classList.contains('open'))settleAppConfirm(false)});

function openMore(){const s=$('moreSheet');s.classList.add('open');s.setAttribute('aria-hidden','false')}
function closeMore(){const s=$('moreSheet');s.classList.remove('open');s.setAttribute('aria-hidden','true')}
function showEndGame(winner){$('endTitle').textContent=winner==='town'?'فاز فريق المواطنين':'فاز فريق الإمبوستر';$('endMessage').textContent='انتهت المباراة. هذه هي الأدوار النهائية لجميع اللاعبين.';$('endRoles').innerHTML=assigned.map(p=>`<div class="end-role-row"><span>${escapeHTML(p.name)}</span><small>${escapeHTML(p.roleName)} · ${p.team==='mafia'?'الإمبوستر':'المواطنون'} · ${p.alive?'بقي في اللعبة':'خرج'}</small></div>`).join('');$('endModal').classList.add('open');$('endModal').setAttribute('aria-hidden','false')}
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function log(text){logs.unshift({time:new Date().toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'}),text});renderLog()}
let utilityReturnView='setup';
function setView(view){
  if(['players','log'].includes(view) && ['setup','deal','night','day','vote'].includes(activeView)) utilityReturnView=activeView;
  activeView=view;
  MafiaWorkflow.show(view);
  if(window.matchMedia('(max-width: 720px)').matches) window.scrollTo({top:0,behavior:'instant'});
  const titles={
    setup:['جهّز طاولتك','أضف الأسماء واختر الأدوار، ثم ابدأ تسليم البطاقات.'],
    deal:['تسليم الأدوار','كل لاعب يرى بطاقته وحده ثم يمرر الهاتف.'],
    night:['مرحلة الليل','سجّل أفعال الإمبوستر والطبيب والقناص بالترتيب.'],
    day:['مرحلة النهار','أدر وقت الحديث، ثم افتح التصويت.'],
    vote:['التصويت السري','مرّر الهاتف لكل لاعب على حدة ولا تكشف الأصوات قبل الإغلاق.'],
    players:['إدارة اللاعبين','سجّل المخالفات أو استبعد من يتجسس.'],
    log:['سجل المباراة','راجع القواعد والأحداث التي سجلها الحكم.']
  };
  $('pageTitle').textContent=titles[view][0];
  $('pageSub').textContent=titles[view][1];
  $('returnToGame').hidden=!['players','log'].includes(view);
  closeMore();
}
$('toolsButton').onclick=openMore;
$('closeMore')?.addEventListener('click',closeMore);
$('moreSheet')?.addEventListener('click',e=>{if(e.target.id==='moreSheet')closeMore()});
document.querySelectorAll('[data-more-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.moreView)));
$('returnToGame').onclick=()=>setView(utilityReturnView);
document.querySelectorAll('[data-return-game]').forEach(b=>b.addEventListener('click',()=>setView(utilityReturnView)));

const roleIcon=id=>window.MafiaRoles.icon(id);
function renderRoleSettings(){const caps={killer:1,mute:1,doctor:1,sniper:1,bomber:1,evictor:1};$('roleSettings').innerHTML=roleDefs.map(r=>`<div class="role-row"><span class="role-symbol">${roleIcon(r.id)}</span><div class="role-detail"><b>${r.name}</b><small>${r.desc}</small></div><span class="role-team">${r.short}</span><div class="stepper"><button type="button" data-role="${r.id}" data-delta="-1" aria-label="تقليل ${r.name}">−</button><output>${roleCounts[r.id]}</output><button type="button" data-role="${r.id}" data-delta="1" aria-label="زيادة ${r.name}">+</button></div></div>`).join('');document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>{let id=b.dataset.role;roleCounts[id]=Math.max(0,Math.min(caps[id],roleCounts[id]+Number(b.dataset.delta)));renderRoleSettings()}));let total=Object.values(roleCounts).reduce((a,b)=>a+b,0),mafia=roleCounts.killer+roleCounts.mute,town=playerCount-mafia;$('specialTotal').textContent=`${total} / ${playerCount}`;$('citizenCount').textContent=`مواطنون: ${Math.max(0,playerCount-total)}`;let invalid=total>playerCount||mafia===0||mafia>=town;$('beginDeal').disabled=invalid;let warning=mafia>playerCount/3?'عدد الإمبوستر مرتفع نسبيًا؛ هذا يجعل فوزهم أسهل. ':'';$('setupNote').textContent=mafia===0?'أضف عضوًا واحدًا على الأقل إلى فريق الإمبوستر.':mafia>=town?'عدد الإمبوستر يجب أن يكون أقل من بقية اللاعبين حتى لا تبدأ المباراة بنتيجة محسومة.':total>playerCount?'مجموع الأدوار يتجاوز عدد اللاعبين. قلّل الأدوار للمتابعة.':`${warning}المقاعد المتبقية (${playerCount-total}) تُملأ تلقائيًا بالمواطن الصالح.`;}
$('balancedPreset').onclick=()=>{roleCounts={killer:1,mute:1,doctor:1,sniper:1,bomber:0,evictor:0};renderRoleSettings();notify('تم اختيار التشكيلة الأساسية.');};
$('allRolesPreset').onclick=()=>{roleCounts={killer:1,mute:1,doctor:1,sniper:1,bomber:1,evictor:1};renderRoleSettings();notify('تم تفعيل جميع الأدوار الخاصة.');};
$('minusPlayers').onclick=()=>{
  if(currentRoster.length<=5){notify('الحد الأدنى للمباراة خمسة لاعبين.');return}
  const removed=currentRoster.pop();
  renderRosterManager();renderRoleSettings();notify(`تمت إزالة ${removed} من قائمة المباراة.`);
};
$('plusPlayers').onclick=()=>{$('newPlayerName').focus();notify('أضف اسم اللاعب الجديد ليزداد العدد.');};
function buildPlayers(){return currentRoster.slice(0,playerCount).map((name,i)=>({id:'p'+i,name,alive:true,fouls:0,muted:false,skip:0,role:'citizen',roleName:'المواطن الصالح',team:'town'}))}
function shuffle(a){let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function buildDeck(){let d=[];roleDefs.forEach(r=>{for(let i=0;i<roleCounts[r.id];i++)d.push(r.id)});while(d.length<playerCount)d.push('citizen');return shuffle(d).map(role=>{let r=roleDefs.find(x=>x.id===role);return {role,roleName:r?.name||'المواطن الصالح',team:r?.team||'town',desc:r?.desc||'لا تملك قدرة ليلية. شارك في النقاش والتصويت واكتشف الإمبوستر.'}})}
$('beginDeal').onclick=()=>{players=buildPlayers();let dupe=players.some((p,i)=>players.findIndex(x=>x.name.trim().toLocaleLowerCase()===p.name.trim().toLocaleLowerCase())!==i);if(dupe){notify('هناك أسماء مكررة. عدّلها قبل توزيع الأدوار.');return}if(players.length!==playerCount || players.some(p=>!p.name.trim())){notify('أضف أسماء جميع اللاعبين قبل المتابعة.');return}let deck=buildDeck();assigned=players.map((p,i)=>({...p,...deck[i]}));dealIndex=0;dealVisible=false;dealWaitingNext=false;dealSeconds=20;sniperUsed=false;voteRevealed=false;voteNeedsPass=false;round=1;stage=0;nightPicks={kill:'',mute:'',doctor:'',sniper:''};votes={};voteClosed=false;voteRevealed=false;voteNeedsPass=false;revoteCandidates=null;revoteNo=0;pendingBomber=[];currentBomber=null;protectedLast='';evictorClaimed=false;gameOver=false;pendingMorningAnnouncements=[];pendingInheritance=[];clearInterval(inheritanceTimer);inheritanceContinuation=null;logs=[];log('تم اعتماد التشكيلة وبدء توزيع البطاقات.');renderPlayers();renderDeal();setView('deal');$('gameStatus').textContent='توزيع';$('sideStatus').textContent='توزيع الأدوار';$('roundNo').textContent='01';};
function currentPlayer(){return assigned[dealIndex]}
function roleData(p){return roleDefs.find(r=>r.id===p?.role)}
function mafiaNames(){return assigned.filter(p=>p.team==='mafia'&&p.alive).map(p=>p.name)}
function renderDeal(){if(!assigned.length){$('secretCard').innerHTML='<div class="secret-top">مافيا نايت — بطاقة سرية</div><div class="secret-emblem">M</div><div class="secret-role">البطاقة لم تُوزّع بعد</div><div class="secret-desc">ابدأ التوزيع من صفحة التحضير.</div>';$('dealQueue').innerHTML='<div class="empty-state">ستظهر قائمة اللاعبين بعد اعتماد التشكيلة.</div>';return}
$('dealCounter').textContent=`${Math.min(dealIndex+1,assigned.length)} / ${assigned.length}`;$('dealProgressLabel').textContent=dealIndex>=assigned.length?'اكتمل التوزيع':`اللاعب ${dealIndex+1} من ${assigned.length}`;
$('dealQueue').innerHTML=assigned.map((p,i)=>`<div class="queue-item ${i===dealIndex?'current':''} ${i<dealIndex?'done':''}"><span>${i<dealIndex?'تم':i+1+' —'} ${escapeHTML(p.name)}</span><em>${i<dealIndex?'تم':i===dealIndex?'حالي':'بانتظار'}</em></div>`).join('');
if(dealIndex>=assigned.length){$('secretCard').innerHTML='<div class="secret-top">مافيا نايت — اكتمل التوزيع</div><div class="secret-emblem">تم</div><div class="secret-role">اكتمل توزيع الأدوار</div><div class="secret-desc">تم تسليم جميع البطاقات. لا تظهر الأدوار في هذه القائمة.</div><div class="secret-meta">انتقل إلى إدارة الليل عندما يصبح الجميع جاهزًا.</div>';$('dealTimer').textContent='تم';$('dealProgress').style.width='100%';$('showNext').disabled=false;$('showNext').textContent='الانتقال إلى الليل';$('showNext').onclick=()=>{stage=0;renderNight();setView('night');$('gameStatus').textContent='ليل';$('sideStatus').textContent='إدارة الليل';log('اكتمل توزيع الأدوار. بدأت مرحلة الليل الأولى.')};$('skipDealTimer').disabled=true;$('dealInstruction').textContent='كل البطاقات تم تسليمها.';return}
let p=currentPlayer();
if(!dealVisible){
  $('secretCard').innerHTML=`<div class="secret-top">مافيا نايت — بطاقة سرية</div><div class="secret-emblem">مخفاة</div><div class="secret-role">${dealWaitingNext?'انتهى وقت البطاقة':'البطاقة جاهزة'}</div><div class="secret-desc">${dealWaitingNext?'مرّر الهاتف إلى اللاعب التالي قبل متابعة التوزيع.':'تأكد أن اللاعب وحده ينظر إلى الشاشة، ثم اعرض بطاقته.'}</div><div class="secret-meta">لا تظهر تفاصيل الدور قبل الضغط على زر العرض.</div>`;
  $('dealTimer').textContent=dealWaitingNext?'انتهى':'جاهز';
  $('dealInstruction').textContent=dealWaitingNext?'أخفينا البطاقة. مرّر الهاتف إلى اللاعب التالي.':'مرّر الهاتف إلى '+p.name+' ثم اعرض بطاقته.';
  $('showNext').disabled=false;
  $('showNext').textContent=dealWaitingNext?'مرّر للاعب التالي':'عرض بطاقة '+p.name;
  $('skipDealTimer').disabled=true;
  $('dealProgress').style.width=dealWaitingNext?'100%':'0%';
}else{
  let teammates=p.team==='mafia'?mafiaNames().filter(n=>n!==p.name):[];
  $('secretCard').innerHTML=`<div class="secret-top">مافيا نايت — بطاقة سرية</div><div class="secret-emblem">${p.team==='mafia'?'مافيا':p.role==='doctor'?'طبيب':p.role==='sniper'?'قناص':p.role==='bomber'?'بومبر':p.role==='evictor'?'وارث':'مواطن'}</div><div class="secret-role">${escapeHTML(p.roleName)}</div><div class="secret-desc">${escapeHTML(p.desc)}</div>${teammates.length?`<div class="secret-meta">زملاؤك في فريق الإمبوستر: ${teammates.map(escapeHTML).join('، ')}</div>`:`<div class="secret-meta">احفظ دورك ولا تكشف البطاقة لأي لاعب.</div>`}`;
  $('dealTimer').textContent=String(dealSeconds).padStart(2,'0')+' ث';
  $('dealInstruction').textContent='اقرأ بطاقتك سرًا. ستُخفى البطاقة تلقائيًا بعد انتهاء المؤقت.';
  $('showNext').disabled=true;
  $('showNext').textContent='البطاقة معروضة';
  $('skipDealTimer').disabled=false;
  $('dealProgress').style.width=((20-dealSeconds)/20*100)+'%';
}
$('showNext').onclick=()=>{
  if(dealWaitingNext){advanceDeal();return}
  if(!dealVisible){dealVisible=true;dealSeconds=20;renderDeal();startDealClock()}
};
$('skipDealTimer').onclick=()=>{
  if(!dealVisible)return;
  dealSeconds=0;dealVisible=false;dealWaitingNext=true;clearInterval(dealTimer);renderDeal();
};
}
function startDealClock(){clearInterval(dealTimer);dealTimer=setInterval(()=>{dealSeconds=Math.max(0,dealSeconds-1);$('dealTimer').textContent=String(dealSeconds).padStart(2,'0')+' ث';$('dealProgress').style.width=((20-dealSeconds)/20*100)+'%';if(dealSeconds===0){clearInterval(dealTimer);dealVisible=false;dealWaitingNext=true;renderDeal();}},1000)}
function advanceDeal(){clearInterval(dealTimer);dealIndex++;dealVisible=false;dealWaitingNext=false;dealSeconds=20;renderDeal()}
function alivePlayers(){return assigned.filter(p=>p.alive)}
function renderNight(){if(!assigned.length){$('nightStageContent').innerHTML='<div class="empty-state">اعتمد التشكيلة ووزّع الأدوار أولًا.</div>';return}
const phases=[['مرحلة الإمبوستر','القتل والكتم معًا'],['مرحلة الطبيب','اختيار الحماية'],['مرحلة القناص','إطلاق أو تأجيل']];const cues=['الإمبوستر، افتحوا أعينكم. اختاروا هدف القتل وهدف الكتم، ثم عودوا للنوم.','الطبيب، افتح عينيك. اختر لاعبًا واحدًا لتحميه، ثم عُد للنوم.','القناص، افتح عينيك. أطلق طلقتك أو أجّلها إلى ليلة قادمة، ثم عُد للنوم.'];$('moderatorCue').textContent=cues[stage]||'انتهت أدوار الليل. أيقظ اللاعبين وابدأ إعلان الصباح.';$('nightPhases').innerHTML=phases.map((p,i)=>`<div class="phase-chip ${stage===i?'active':stage>i?'done':''}"><span class="phase-num">${stage>i?'تم':'0'+(i+1)}</span><div><b>${p[0]}</b><small>${p[1]}</small></div></div>`).join('');
let live=alivePlayers();$('nightPlayerList').innerHTML=live.map(p=>`<div class="player-row"><div class="player-name"><span class="player-initial">${escapeHTML(p.name.slice(0,1))}</span>${escapeHTML(p.name)}</div><div class="player-flags">${p.muted?'<span class="flag muted">مكتوم</span>':''}<span class="flag alive">حي</span></div></div>`).join('')||'<div class="empty-state">لا يوجد لاعبون أحياء.</div>';
if(stage===0){let hasKiller=live.some(p=>p.role==='killer'),hasMute=live.some(p=>p.role==='mute');if(!hasKiller&&!hasMute){stage=1;renderNight();return}$('nightStageTitle').textContent='مرحلة الإمبوستر';$('nightStageMeta').textContent='المرحلة 1 من 3';$('nightStageContent').innerHTML=`<div class="note red">يستيقظ الإمبوستر القاتل والصامت معًا. إذا كان الدوران موجودين، يختار القاتل هدفًا ويختار الصامت هدف الكتم في الوقت نفسه.</div>${hasKiller?`<div class="action-box"><h3>هدف القتل</h3><p>اختر لاعبًا من خارج فريق الإمبوستر. لا يمكن قتل زميل من الفريق نفسه.</p><div class="target-list">${live.filter(p=>p.team!=='mafia').map(p=>`<label class="target-option"><input type="radio" name="killTarget" value="${p.id}" ${nightPicks.kill===p.id?'checked':''}>${escapeHTML(p.name)}</label>`).join('')}</div></div>`:''}${hasMute?`<div class="action-box"><h3>هدف الكتم</h3><p>هدف الإمبوستر الصامت — لن يستطيع الكلام في النهار القادم.</p><div class="target-list">${live.map(p=>`<label class="target-option"><input type="radio" name="muteTarget" value="${p.id}" ${nightPicks.mute===p.id?'checked':''}>${escapeHTML(p.name)}</label>`).join('')}</div></div>`:''}`;$('confirmNightStage').textContent='تأكيد الاختيارات والانتقال للطبيب';}
else if(stage===1){let doctors=live.filter(p=>p.role==='doctor');$('nightStageTitle').textContent='مرحلة الطبيب';$('nightStageMeta').textContent='المرحلة 2 من 3';if(!doctors.length){$('nightStageContent').innerHTML='<div class="empty-state">لا يوجد طبيب حي في هذه المباراة. سيتم تخطي المرحلة.</div>';$('confirmNightStage').textContent='تخطي الطبيب والانتقال للقناص';}else{let lastProtected= $('doctorRepeat').checked?null:protectedLast;let candidates=live.filter(p=>( $('doctorSelf').checked || !doctors.some(d=>d.id===p.id)) && (!lastProtected||p.id!==lastProtected));$('nightStageContent').innerHTML=`<div class="note">الطبيب يستيقظ وحده بعد الإمبوستر. يختار لاعبًا واحدًا لحمايته من القتل الليلي.</div><div class="action-box"><h3>من سيحمي الطبيب؟</h3><div class="target-list">${candidates.map(p=>`<label class="target-option"><input type="radio" name="doctorTarget" value="${p.id}" ${nightPicks.doctor===p.id?'checked':''}>${escapeHTML(p.name)}</label>`).join('')}</div>${candidates.length?'':'<div class="small muted">لا توجد أهداف متاحة وفق إعدادات الحماية.</div>'}</div>`;$('confirmNightStage').textContent='تأكيد الحماية والانتقال للقناص';}}
else if(stage===2){let sniper=assigned.find(p=>p.role==='sniper'&&p.alive);if(!sniper||sniperUsed){$('nightStageTitle').textContent='مرحلة القناص';$('nightStageMeta').textContent='المرحلة 3 من 3';$('nightStageContent').innerHTML=`<div class="empty-state">${!sniper?'لا يوجد قناص حي في هذه المباراة.':'القناص استخدم طلقته الوحيدة سابقًا.'}<br>سيتم تخطي هذه المرحلة.</div>`;$('confirmNightStage').textContent='إنهاء الليل وحساب النتائج';}
else{$('nightStageTitle').textContent='مرحلة القناص';$('nightStageMeta').textContent='المرحلة 3 من 3';$('nightStageContent').innerHTML=`<div class="note red">القناص يملك طلقة واحدة في المباراة. يستطيع إطلاقها الآن أو تأجيلها إلى ليلة لاحقة.</div><div class="action-box"><h3>قرار القناص</h3><div class="target-list"><label class="target-option"><input type="radio" name="sniperChoice" value="fire" ${sniperChoice==='fire'?'checked':''}>إطلاق الطلقة الآن</label><label class="target-option"><input type="radio" name="sniperChoice" value="wait" ${sniperChoice==='wait'?'checked':''}>تأجيل الطلقة</label></div></div>${sniperChoice==='fire'?`<div class="action-box"><h3>هدف القناص</h3><p>إذا كان الهدف من فريق الإمبوستر يموت الهدف فقط؛ وإذا كان بريئًا يموت القناص والهدف معًا.</p><div class="target-list">${live.filter(p=>p.id!==sniper.id).map(p=>`<label class="target-option"><input type="radio" name="sniperTarget" value="${p.id}" ${nightPicks.sniper===p.id?'checked':''}>${escapeHTML(p.name)}</label>`).join('')}</div></div>`:''}`;$('confirmNightStage').textContent='تأكيد قرار القناص وإنهاء الليل';document.querySelectorAll('input[name=\"sniperChoice\"]').forEach(r=>r.addEventListener('change',e=>{sniperChoice=e.target.value;renderNight()}));}}
}
$('confirmNightStage').onclick=()=>{if(stage===0){let hasKiller=alivePlayers().some(p=>p.role==='killer'),hasMute=alivePlayers().some(p=>p.role==='mute');nightPicks.kill=document.querySelector('input[name="killTarget"]:checked')?.value||'';nightPicks.mute=document.querySelector('input[name="muteTarget"]:checked')?.value||'';if((hasKiller&&!nightPicks.kill)||(hasMute&&!nightPicks.mute)){notify('أكمل اختيار أهداف الأدوار الموجودة أولًا.');return}stage=1;log('سُجّلت اختيارات مرحلة الإمبوستر.');renderNight()}
else if(stage===1){let hasDoctor=alivePlayers().some(p=>p.role==='doctor');nightPicks.doctor=document.querySelector('input[name="doctorTarget"]:checked')?.value||'';if(hasDoctor&&!nightPicks.doctor){notify('اختر لاعبًا لحمايته أولًا.');return}stage=2;renderNight()}
else{let sniper=assigned.find(p=>p.role==='sniper'&&p.alive);if(sniper&&!sniperUsed){sniperChoice=document.querySelector('input[name="sniperChoice"]:checked')?.value||'wait';if(sniperChoice==='fire'){nightPicks.sniper=document.querySelector('input[name="sniperTarget"]:checked')?.value||'';if(!nightPicks.sniper){notify('اختر هدف القناص أو اختر التأجيل.');return}sniperUsed=true;log('أطلق القناص طلقته الوحيدة.')}else{log('أجّل القناص طلقته.')}}resolveNight()}};
function killPlayer(id,reason){
 let p=assigned.find(x=>x.id===id);if(!p||!p.alive)return null;
 let deadRole=p.role,deadRoleName=p.roleName,deadTeam=p.team,deadDesc=p.desc;
 p.alive=false;p.deathReason=reason;log(`${p.name} خرج من اللعبة (${reason}).`);
 if(deadRole==='bomber')pendingBomber.push(p.id);
 let ev=assigned.find(x=>x.alive&&x.role==='evictor'&&!evictorClaimed);
 if(ev&&deadRole!=='citizen'&&deadRole!=='evictor'){
  ev.role=deadRole;ev.roleName=deadRoleName;ev.team=deadTeam;ev.desc=deadDesc||'ورثت هذا الدور وقدرته بعد موت صاحبه.';ev.inherited=true;evictorClaimed=true;
  pendingInheritance.push({playerId:ev.id,playerName:ev.name,role:deadRole,roleName:deadRoleName,team:deadTeam,desc:ev.desc});
  log(`انتقل دور ${deadRoleName} إلى لاعب آخر. سيُسلّم له سرًا قبل المرحلة التالية.`);
 }
 return p;
}
function showNextInheritance(onComplete){
 if(typeof onComplete==='function')inheritanceContinuation=onComplete;
 if(!pendingInheritance.length){let done=inheritanceContinuation;inheritanceContinuation=null;if(done)done();return;}
 clearInterval(inheritanceTimer);inheritanceSeconds=20;
 const item=pendingInheritance.shift(), player=assigned.find(p=>p.id===item.playerId);
 if(!player||!player.alive){log('لم تعد بطاقة الدور الموروث مطلوبة؛ اللاعب خرج قبل استلامها.');if(pendingInheritance.length)showNextInheritance();else{const done=inheritanceContinuation;inheritanceContinuation=null;if(done)done()}return;}
 $('inheritIntroText').textContent=`${item.playerName} ورث دور ${item.roleName}. مرّر الهاتف إليه، ثم اعرض البطاقة عندما يصبح وحده أمام الشاشة.`;
 $('inheritIntro').hidden=false;$('inheritSecret').hidden=true;$('inheritDone').hidden=true;
 $('inheritModal').classList.add('open');$('inheritModal').setAttribute('aria-hidden','false');
 $('revealInherited').onclick=()=>{
  const liveMafia=assigned.filter(p=>p.alive&&p.team==='mafia'&&p.id!==item.playerId).map(p=>p.name);
  $('inheritCardFace').innerHTML=`<div class="inherit-overline">مافيا نايت · بطاقة سرية موروثة</div><div class="inherit-player">${escapeHTML(item.playerName)}</div><div class="inherit-role-mark">${roleIcon(item.role)}</div><h2>${escapeHTML(item.roleName)}</h2><p>${escapeHTML(item.desc)}</p>${item.team==='mafia'?`<div class="inherit-teammates">زملاؤك الأحياء في فريق الإمبوستر: ${liveMafia.map(escapeHTML).join('، ')||'لا يوجد لاعب آخر'}</div>`:'<div class="inherit-teammates">أنت الآن من فريق المواطنين.</div>'}`;
  $('inheritIntro').hidden=true;$('inheritSecret').hidden=false;$('inheritDone').hidden=true;
  $('inheritTimer').textContent='20';$('inheritProgress').style.width='0%';
  clearInterval(inheritanceTimer);
  inheritanceTimer=setInterval(()=>{inheritanceSeconds=Math.max(0,inheritanceSeconds-1);$('inheritTimer').textContent=String(inheritanceSeconds);$('inheritProgress').style.width=((20-inheritanceSeconds)/20*100)+'%';if(inheritanceSeconds===0)hideInheritanceCard();},1000);
 };
 $('hideInherited').onclick=hideInheritanceCard;
}
function hideInheritanceCard(){clearInterval(inheritanceTimer);$('inheritSecret').hidden=true;$('inheritDone').hidden=false;}
function finishInheritance(){
 $('inheritModal').classList.remove('open');$('inheritModal').setAttribute('aria-hidden','true');
 if(pendingInheritance.length){showNextInheritance();return;}
 const done=inheritanceContinuation;inheritanceContinuation=null;if(done)done();
}
$('finishInheritance').onclick=finishInheritance;

function resolveNight(){let deaths=[],killTarget=assigned.find(p=>p.id===nightPicks.kill),docTarget=nightPicks.doctor,protectedByDoc=docTarget===nightPicks.kill;protectedLast=docTarget;
if(killTarget&&killTarget.alive&&!protectedByDoc){let d=killPlayer(killTarget.id,'قتل الإمبوستر');if(d)deaths.push(d)}else if(protectedByDoc){log('نجحت حماية الطبيب؛ لم يُنفّذ قتل الإمبوستر.')}else{log('لم يُسجّل هدف قتل صالح.')}
if(nightPicks.mute){let muted=assigned.find(p=>p.id===nightPicks.mute);if(muted?.alive){muted.muted=true;log(`${muted.name} تم كتمه لهذا النهار.`)}}
if(sniperChoice==='fire'&&nightPicks.sniper){let target=assigned.find(p=>p.id===nightPicks.sniper);let shooter=assigned.find(p=>p.role==='sniper'&&p.alive);if(target?.alive&&shooter){let protectedSniper=$('doctorBlocksSniper').checked&&docTarget===target.id;if(protectedSniper){log('حماية الطبيب منعت طلقة القناص وفق إعداد المباراة.')}else if(target.team==='mafia'){let d=killPlayer(target.id,'طلقة قناص صحيحة');if(d)deaths.push(d)}else{let d1=killPlayer(target.id,'هدف بريء أصابه القناص');let d2=killPlayer(shooter.id,'القناص أخطأ الهدف');if(d1)deaths.push(d1);if(d2)deaths.push(d2)}}}
let summary=deaths.length?`<div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap">${deaths.map(p=>`<span class="flag dead">${escapeHTML(p.name)} خرج</span>`).join('')}</div>`:'لم يمت أحد هذه الليلة.';
if(deaths.length&&$('revealRule').value==='now')summary+=`<p class="small muted" style="margin:10px 0 0">الأدوار: ${deaths.map(p=>escapeHTML(p.name)+' — '+escapeHTML(p.roleName)).join('، ')}</p>`;
$('morningSummary').innerHTML=summary+`<div class="note">القتل والحماية والكتم حُسبت. قدرة البومبر تُنفذ قبل بدء النهار إذا مات.</div>`;
if(pendingBomber.length){handleBomberDeaths()}else{finishNightToDay()} }
function handleBomberDeaths(){let id=pendingBomber.shift();let bomber=assigned.find(p=>p.id===id);let candidates=alivePlayers();if(!bomber||!candidates.length){if(pendingBomber.length)handleBomberDeaths();else if(bomberAfterVote){bomberAfterVote=false;renderPlayers();if(pendingInheritance.length)showNextInheritance(checkWin);else checkWin()}else if(activeView==='night')finishNightToDay();else if(pendingInheritance.length)showNextInheritance(checkWin);else checkWin();return}currentBomber=bomber.id;$('bomberModalText').textContent=`البومبر ${bomber.name} مات. اختر اللاعب الذي سيخرج معه.`;$('bomberTargetSelect').innerHTML=candidates.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');$('bomberModal').classList.add('open');$('bomberModal').setAttribute('aria-hidden','false')}
$('confirmBomberTarget').onclick=()=>{let id=$('bomberTargetSelect').value;let target=assigned.find(p=>p.id===id);if(!target||!target.alive){notify('اختر لاعبًا حيًا.');return}killPlayer(id,'قدرة البومبر');if($('revealRule').value==='now')$('morningSummary').innerHTML+=`<p class="small">البومبر أخذ معه: ${escapeHTML(target.name)}</p>`;$('bomberModal').classList.remove('open');$('bomberModal').setAttribute('aria-hidden','true');currentBomber=null;renderPlayers();if(pendingBomber.length)handleBomberDeaths();else if(bomberAfterVote){bomberAfterVote=false;checkWin();renderPlayers()}else if(activeView==='night')finishNightToDay();else{checkWin();renderPlayers()}}
function finishNightToDay(){if(pendingInheritance.length){showNextInheritance(finishNightToDay);return}if(pendingMorningAnnouncements.length){$('morningSummary').innerHTML+='<div class="note red">'+pendingMorningAnnouncements.map(escapeHTML).join('<br>')+'</div>';pendingMorningAnnouncements=[]}$('roundNo').textContent=String(round).padStart(2,'0');$('dayRound').textContent='اليوم '+String(round).padStart(2,'0');$('gameStatus').textContent='نهار';$('sideStatus').textContent='مرحلة النهار';speakerIndex=0;extraSpeakerIds=[];renderSpeakers();setView('day');log('انتهت حسابات الليل. بدأت مرحلة النهار.');checkWin()}
let extraSpeakerIds=[];
function getSpeechQueue(){
  const base=alivePlayers().filter(p=>!p.muted);
  const extras=extraSpeakerIds.map(id=>assigned.find(p=>p.id===id)).filter(p=>p&&p.alive&&!p.muted);
  return [...base,...extras];
}
function renderSpeakers(){
  let speakers=getSpeechQueue();
  $('speakerQueue').innerHTML=speakers.length?speakers.map((p,i)=>`<div class="queue-item ${i===speakerIndex?'current':''}"><span>${i+1} — ${escapeHTML(p.name)}</span><em>${i>=alivePlayers().filter(x=>!x.muted).length?'دور إضافي':'تخطٍ '+p.skip+'/2'}</em></div>`).join(''):'<div class="empty-state">لا يوجد متحدثون متاحون.</div>';
  let p=speakers[speakerIndex];
  $('speakerName').textContent=p?p.name:'انتهى النقاش';
  $('startSpeech').disabled=!p||speechRunning;
  $('finishSpeech').disabled=!speechRunning;
  $('skipSpeech').disabled=!p||speechRunning||p.skip>=2;
  $('skipSpeech').textContent='تخطٍ — '+(p?p.skip:0)+' / 2';
  $('dayNextWrap').hidden=!!p||speechRunning||gameOver;
  const options=alivePlayers().filter(x=>!x.muted);
  $('speakerToAdd').innerHTML=options.map(x=>`<option value="${x.id}">${escapeHTML(x.name)}</option>`).join('');
  $('addSpeakerBtn').disabled=options.length===0;
  if(!options.length)$('speakerAddPanel').hidden=true;
}
$('addSpeakerBtn').onclick=()=>{$('speakerAddPanel').hidden=!$('speakerAddPanel').hidden;renderSpeakers()};
$('confirmAddSpeaker').onclick=()=>{
  const id=$('speakerToAdd').value;
  const player=assigned.find(x=>x.id===id&&x.alive&&!x.muted);
  if(!player){notify('اختر لاعبًا حيًا وغير مكتوم.');return}
  extraSpeakerIds.push(id);
  $('speakerAddPanel').hidden=true;
  log(`أضاف الحكم دور كلام إضافيًا للاعب ${player.name}.`);
  renderSpeakers();notify(`أُضيف ${player.name} إلى نهاية قائمة الحديث.`);
};
function stopSpeech(autoFoul=false){clearInterval(speechTimer);speechRunning=false;let current=getSpeechQueue()[speakerIndex];if(autoFoul&&current){current.fouls++;log(`${current.name} تجاوز وقت الكلام؛ مخالفة +1.`)}speakerIndex++;speechSeconds=90;$('speechClock').textContent='01:30';renderSpeakers();renderPlayers()}
$('startSpeech').onclick=()=>{let p=getSpeechQueue()[speakerIndex];if(!p)return;speechRunning=true;renderSpeakers();$('speechHint').textContent='الوقت يعمل. عند انتهاء 90 ثانية تُسجل مخالفة.';speechTimer=setInterval(()=>{speechSeconds--;let m=Math.floor(speechSeconds/60),s=speechSeconds%60;$('speechClock').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');if(speechSeconds<=0)stopSpeech(true)},1000)};
$('finishSpeech').onclick=()=>{if(!speechRunning)return;log('أنهى اللاعب حديثه قبل انتهاء الوقت.');stopSpeech(false)};
$('skipSpeech').onclick=()=>{let p=getSpeechQueue()[speakerIndex];if(!p||p.skip>=2)return;p.skip++;log(`${p.name} استخدم التخطي (${p.skip}/2).`);stopSpeech(false)};
$('startVoting').onclick=()=>{if(gameOver)return;votes={};voteClosed=false;revoteCandidates=null;revoteNo=0;voteRevealed=false;voteNeedsPass=false;renderVoteControls();renderVoteResults();setView('vote');log('انتهى النقاش وبدأ التصويت السري.');};
function renderPlayers(){let list=assigned;$('playerAdminList').innerHTML=list.map(p=>`<div class="player-row"><div class="player-name"><span class="player-initial">${escapeHTML(p.name.slice(0,1))}</span><span>${escapeHTML(p.name)}</span></div><div class="player-flags"><span class="flag ${p.alive?'alive':'dead'}">${p.alive?'حي':'مستبعد'}</span>${p.muted?'<span class="flag muted">مكتوم</span>':''}<span class="flag">مخالفات ${p.fouls}</span><div class="player-tools"><button class="mini-btn" data-foul="${p.id}" ${!p.alive?'disabled':''}>+1</button><button class="mini-btn warn" data-peek="${p.id}" ${!p.alive?'disabled':''}>تجسس</button></div></div></div>`).join('')||'<div class="empty-state">لم يتم توزيع اللاعبين.</div>';$('adminTarget').innerHTML=list.filter(p=>p.alive).map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');document.querySelectorAll('[data-foul]').forEach(b=>b.onclick=()=>addFoul(b.dataset.foul));document.querySelectorAll('[data-peek]').forEach(b=>b.onclick=()=>peekOut(b.dataset.peek));renderVoteControls()}
function addFoul(id){let p=assigned.find(p=>p.id===id);if(!p||!p.alive)return;p.fouls++;log(`${p.name} حصل على مخالفة جديدة. المجموع: ${p.fouls}.`);renderPlayers()}
async function peekOut(id){let p=assigned.find(p=>p.id===id);if(!p||!p.alive)return;if(!await confirmInApp({title:'استبعاد بسبب التجسس؟',message:`سيخرج ${p.name} من المباراة فورًا. سيُحفظ إعلان دوره للصباح وفق الإعدادات.`,accept:'استبعاد اللاعب',danger:true}))return;killPlayer(id,'استبعاد بسبب التجسس ليلًا');if($('revealPeek').checked)pendingMorningAnnouncements.push(`${p.name} أُخرج بسبب التجسس. دوره: ${p.roleName}.`);renderPlayers();if(pendingBomber.length){bomberAfterVote=false;handleBomberDeaths()}else if(activeView==='night'){log('سيُعلن استبعاد اللاعب عند حلول الصباح.');}else if(pendingInheritance.length)showNextInheritance(checkWin);else checkWin()}
$('addFoul').onclick=()=>addFoul($('adminTarget').value);$('peekOut').onclick=()=>peekOut($('adminTarget').value);
function renderVoteControls(){
 let alive=alivePlayers(),voter=$('voterSelect'),target=$('voteTarget');
 let next=alive.find(p=>votes[p.id]===undefined);
 voter.innerHTML=next?`<option value="${next.id}">${escapeHTML(next.name)}</option>`:'';
 let vId=next?.id||'';
 let validTargets=alive.filter(p=>p.id!==vId&&(!revoteCandidates||revoteCandidates.includes(p.id)));
 target.innerHTML=validTargets.map(p=>`<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('')+'<option value="abstain">امتناع عن التصويت</option>';
 $('voteCounter').textContent=Object.keys(votes).length+' / '+alive.length;
 $('voteProgressText').textContent=`سُجّل ${Object.keys(votes).length} من ${alive.length} أصوات. لا تظهر الاختيارات قبل إعلان النتيجة.`;
 $('voteCurrentName').textContent=voteClosed?'انتهى الاقتراع':next?next.name:'اكتمل التصويت';
 $('voteStepText').textContent=voteClosed?'تم إغلاق ورقة الاقتراع':next?`اللاعب التالي · ${Object.keys(votes).length+1} من ${alive.length}`:'اكتملت أوراق الاقتراع';
 $('voteDescription').textContent=voteClosed?'أُغلقت عملية التصويت. انتظر إعلان الحكم للنتيجة.':next?(voteNeedsPass?'تم تثبيت الصوت. مرّر الهاتف إلى اللاعب التالي.':voteRevealed?'اختر اسمًا أو امتنع، ثم ثبّت صوتك.':'مرّر الهاتف إلى هذا اللاعب، ثم دعه يفتح ورقته بنفسه.'):'اكتملت أصوات اللاعبين. أغلق التصويت عندما تكون جاهزًا لإعلان النتيجة.';
 $('votePassPanel').hidden=voteClosed||!next||voteRevealed||voteNeedsPass;
 $('voteBallotPanel').hidden=voteClosed||!next||!voteRevealed;
 $('voteRecordedPanel').hidden=voteClosed||!voteNeedsPass;
 $('voteNextPlayer').textContent=next?'مرّر الهاتف إلى اللاعب التالي':'سلّم الهاتف إلى الحكم';
 $('voteClosedPanel').hidden=!voteClosed;
 $('openBallot').disabled=voteClosed||!next||voteRevealed||voteNeedsPass;
 $('castVote').disabled=voteClosed||!next||!voteRevealed;
 $('closeVote').disabled=voteClosed||voteRevealed||voteNeedsPass;
 $('voterLabel').textContent=revoteCandidates?'إعادة التصويت':'اللاعب الذي يصوّت';
}
$('openBallot').onclick=()=>{if(!$('voterSelect').value)return;voteRevealed=true;renderVoteControls()};
$('voteNextPlayer').onclick=()=>{voteNeedsPass=false;voteRevealed=false;renderVoteControls()};
$('castVote').onclick=()=>{let voter=$('voterSelect').value,target=$('voteTarget').value;if(!voter||!voteRevealed)return;if(voter===target){notify('لا يستطيع اللاعب التصويت لنفسه.');return}votes[voter]=target;let p=assigned.find(p=>p.id===voter);log(`${p?.name||'لاعب'} أدلى بصوته سرًا.`);voteRevealed=false;voteNeedsPass=true;renderVoteControls();renderVoteResults()};
$('clearVotes').onclick=async()=>{if(!await confirmInApp({title:'إعادة بدء التصويت؟',message:'سيتم حذف كل الأصوات المسجلة والبدء من أول لاعب.',accept:'إعادة التصويت',danger:true}))return;votes={};voteClosed=false;voteRevealed=false;voteNeedsPass=false;revoteCandidates=null;revoteNo=0;renderVoteControls();renderVoteResults();log('أعاد الحكم فتح التصويت من البداية.')};
function renderVoteResults(){if(!voteClosed){$('voteResults').innerHTML='<div class="empty-state">الأصوات محفوظة بسرية. لن تظهر الأسماء أو الأعداد قبل إغلاق التصويت.</div>';return}let tally={};Object.entries(votes).forEach(([v,t])=>{if(t!=='abstain')tally[t]=(tally[t]||0)+1});let ordered=Object.entries(tally).sort((a,b)=>b[1]-a[1]);$('voteResults').innerHTML=ordered.length?ordered.map(([id,n])=>{let p=assigned.find(p=>p.id===id);return `<div class="vote-card"><strong>${escapeHTML(p?.name||'—')}</strong><span class="vote-count">${n}</span></div>`}).join(''):'<div class="empty-state">لم يحصل أي لاعب على أصوات. الجميع امتنعوا.</div>'}
$('nextNight').onclick=()=>{if(gameOver)return;round++;$('roundNo').textContent=String(round).padStart(2,'0');$('nightRound').textContent='الليلة '+String(round).padStart(2,'0');stage=0;nightPicks={kill:'',mute:'',doctor:'',sniper:''};sniperChoice='wait';votes={};voteClosed=false;revoteCandidates=null;revoteNo=0;$('nextNight').style.display='none';$('gameStatus').textContent='ليل';$('sideStatus').textContent='إدارة الليل';renderNight();setView('night');log('بدأت ليلة جديدة.')};
$('closeVote').onclick=async()=>{if(voteRevealed||voteNeedsPass){notify('أكمل تسليم الهاتف وتسجيل الصوت الحالي أولًا.');return}let alive=alivePlayers();if(Object.keys(votes).length<alive.length){if(!await confirmInApp({title:'بعض اللاعبين لم يصوّتوا',message:'هل تريد إغلاق الاقتراع الآن بالأصوات المسجلة فقط؟',accept:'إغلاق الاقتراع'}))return}let tally={};Object.values(votes).forEach(t=>{if(t!=='abstain')tally[t]=(tally[t]||0)+1});let entries=Object.entries(tally).sort((a,b)=>b[1]-a[1]);if(!entries.length){log('انتهى التصويت دون أصوات محتسبة.');notify('لا يوجد لاعب سيتم إخراجه.');voteClosed=true;assigned.forEach(p=>p.muted=false);$('nextNight').style.display='inline-flex';renderVoteControls();renderVoteResults();return}let tied=entries.filter(x=>x[1]===entries[0][1]);if(tied.length>1){let rule=$('tieRule').value;log('حدث تعادل في التصويت.');if(rule==='none'){notify('تعادل في الأصوات؛ لا يخرج أحد اليوم.');voteClosed=true;assigned.forEach(p=>p.muted=false);$('nextNight').style.display='inline-flex';}else if(rule==='revote'&&revoteNo===0){revoteCandidates=tied.map(([id])=>id);revoteNo=1;votes={};voteClosed=false;voteRevealed=false;voteNeedsPass=false;notify('تعادل. بدأت إعادة التصويت بين اللاعبين المتعادلين.');renderVoteControls();renderVoteResults();return}else{notify('تعادل مرة ثانية؛ لا يخرج أحد اليوم.');voteClosed=true;revoteCandidates=null;assigned.forEach(p=>p.muted=false);$('nextNight').style.display='inline-flex';}renderVoteControls();renderVoteResults();return}let out=assigned.find(p=>p.id===entries[0][0]);revoteCandidates=null;revoteNo=0;if(out){killPlayer(out.id,'تصويت النهار');if($('revealRule').value==='now')notify(`خرج ${out.name}. دوره: ${out.roleName}`);else notify(`خرج ${out.name} من اللعبة.`);log(`${out.name} أُخرج بالتصويت.`)}voteClosed=true;assigned.forEach(p=>p.muted=false);$('nextNight').style.display='inline-flex';renderPlayers();renderVoteControls();renderVoteResults();if(pendingBomber.length){bomberAfterVote=true;handleBomberDeaths()}else if(pendingInheritance.length)showNextInheritance(checkWin);else checkWin()};
function checkWin(){if(!assigned.length||gameOver)return;let alive=alivePlayers(),mafia=alive.filter(p=>p.team==='mafia').length,town=alive.length-mafia;if(mafia===0){gameOver=true;$('gameStatus').textContent='فوز المواطنين';$('sideStatus').textContent='انتهت المباراة';$('nextNight').style.display='none';$('startVoting')?.setAttribute('disabled','disabled');log('انتهت المباراة: فوز المواطنين.');showEndGame('town')}else if(mafia>=town){gameOver=true;$('gameStatus').textContent='فوز الإمبوستر';$('sideStatus').textContent='انتهت المباراة';$('nextNight').style.display='none';$('startVoting')?.setAttribute('disabled','disabled');log('انتهت المباراة: فوز الإمبوستر.');showEndGame('mafia')}}
$('closeEndModal').onclick=()=>{$('endModal').classList.remove('open');$('endModal').setAttribute('aria-hidden','true')};
$('newMatch').onclick=async()=>{if(!await confirmInApp({title:'بدء مباراة جديدة؟',message:'سيتم إنهاء المباراة الحالية وحذف سجلها من هذه الجلسة.',accept:'بدء مباراة جديدة',danger:true}))return;location.reload()};
function renderLog(){$('logList').innerHTML=logs.length?logs.map(x=>`<div class="log-item"><div class="log-time">${x.time}</div><div class="log-text">${escapeHTML(x.text)}</div></div>`).join(''):'<div class="empty-state">لا توجد أحداث بعد.</div>'}
$('exportLog').onclick=()=>{let text=logs.map(x=>`${x.time} — ${x.text}`).join('\n');if(!text){notify('السجل فارغ حاليًا.');return}if(!navigator.clipboard?.writeText){notify('ميزة النسخ غير متاحة في هذا المتصفح.');return}navigator.clipboard.writeText(text).then(()=>notify('تم نسخ سجل المباراة.')).catch(()=>notify('تعذر النسخ.'))};
// قواعد المباراة تبقى قابلة للتعديل من صفحة السجل والإعدادات.


function renderRosterManager(){
  playerCount=currentRoster.length;
  $('playerCount').textContent=playerCount;
  $('topPlayers').textContent=playerCount;
  $('playerNames').value=currentRoster.join('\n');
  $('rosterCount').textContent=`${playerCount} لاعب`;
  $('nameCountHint').textContent=`${playerCount} من 24 أسماء`;
  $('currentRosterList').innerHTML=currentRoster.map((name,index)=>`<span class="roster-chip"><span>${escapeHTML(name)}</span><button type="button" data-remove-roster="${index}" aria-label="إزالة ${escapeHTML(name)}">×</button></span>`).join('')||'<div class="empty-state">أضف أسماء اللاعبين لتجهيز المباراة.</div>';
  document.querySelectorAll('[data-remove-roster]').forEach(btn=>btn.onclick=()=>{
    if(currentRoster.length<=5){notify('الحد الأدنى للمباراة خمسة لاعبين.');return}
    currentRoster.splice(Number(btn.dataset.removeRoster),1);renderRosterManager();renderRoleSettings();
  });
  const library=window.MafiaStorage.getPeople();
  const unused=library.filter(name=>!currentRoster.some(x=>x.toLocaleLowerCase()===name.toLocaleLowerCase()));
  $('savedPlayerSelect').innerHTML=unused.length?unused.map(n=>`<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join(''):'<option value="">لا توجد أسماء محفوظة إضافية</option>';
  const groups=window.MafiaStorage.getGroups();
  $('savedRosterSelect').innerHTML=groups.length?groups.map(g=>`<option value="${escapeHTML(g.id)}">${escapeHTML(g.label)} · ${g.names.length} لاعبين</option>`).join(''):'<option value="">لا توجد قوائم محفوظة</option>';
  $('addSavedPlayer').disabled=!unused.length;
  $('loadRosterGroup').disabled=!groups.length;
  $('deleteRosterGroup').disabled=!groups.length;
  window.MafiaStorage.saveLastRoster(currentRoster);
  renderRoleSettings();
}
function addRosterPlayer(name){
  const clean=String(name||'').trim().replace(/[<>]/g,'').slice(0,32);
  if(!clean){notify('اكتب اسمًا أولًا.');return}
  if(currentRoster.length>=24){notify('الحد الأقصى 24 لاعبًا.');return}
  if(currentRoster.some(x=>x.toLocaleLowerCase()===clean.toLocaleLowerCase())){notify('هذا الاسم موجود في قائمة المباراة.');return}
  currentRoster.push(clean);
  window.MafiaStorage.addPerson(clean);
  $('newPlayerName').value='';
  renderRosterManager();
}
$('addPlayerName').onclick=()=>addRosterPlayer($('newPlayerName').value);
$('newPlayerName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addRosterPlayer($('newPlayerName').value)}});
$('addSavedPlayer').onclick=()=>addRosterPlayer($('savedPlayerSelect').value);
$('saveRosterGroup').onclick=()=>{
  if(currentRoster.length<5){notify('أضف خمسة لاعبين على الأقل قبل حفظ القائمة.');return}
  const label=$('rosterLabelInput').value.trim()||'قائمة اللاعبين';
  window.MafiaStorage.saveGroup(label,currentRoster);
  renderRosterManager();notify('تم حفظ قائمة اللاعبين على هذا الجهاز.');
};
$('loadRosterGroup').onclick=()=>{
  const group=window.MafiaStorage.getGroup($('savedRosterSelect').value);
  if(!group)return;
  if(group.names.length<5||group.names.length>24){notify('القائمة المحفوظة لا تناسب عدد اللاعبين المسموح.');return}
  currentRoster=[...group.names];$('rosterLabelInput').value=group.label;renderRosterManager();notify(`تم تحميل قائمة ${group.label}.`);
};
$('deleteRosterGroup').onclick=async()=>{
  const group=window.MafiaStorage.getGroup($('savedRosterSelect').value);if(!group)return;
  if(!await confirmInApp({title:'حذف القائمة المحفوظة؟',message:`سيتم حذف قائمة ${group.label} فقط. الأسماء المفردة ستبقى محفوظة.`,accept:'حذف القائمة',danger:true}))return;
  window.MafiaStorage.deleteGroup(group.id);renderRosterManager();notify('تم حذف القائمة المحفوظة.');
};
$('exportRosterBackup').onclick=()=>{
  const data=window.MafiaStorage.exportData();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mafia-night-names-backup.json';a.click();URL.revokeObjectURL(url);
  notify('تم تنزيل نسخة احتياطية للأسماء والقوائم.');
};
$('importRosterFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const data=JSON.parse(await file.text());window.MafiaStorage.importData(data);currentRoster=window.MafiaStorage.getLastRoster();if(!currentRoster.length)currentRoster=window.MafiaStorage.getPeople().slice(0,8);renderRosterManager();notify('تم استعادة الأسماء والقوائم المحفوظة.');}
  catch{notify('ملف النسخة الاحتياطية غير صالح.');}
  e.target.value='';
});

// Initial UI state.
renderRosterManager();
renderRoleSettings();
renderDeal();
renderPlayers();
renderNight();
renderVoteControls();
renderVoteResults();
renderLog();
setView('setup');
