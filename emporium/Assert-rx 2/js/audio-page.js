// ─── DATA ─────────────────────────────────────────────────────────────────────
var scenarios = [
  {
    id: 'requests', name: 'Requests',
    audioScript: ['Sure, I can try to have that to you by Thursday.', 'Actually, I\'m not sure Thursday works. I have a lot going on this week.', 'Can you give me until Friday? I\'ll definitely have it done by then.', 'Look, I\'m doing my best here. Don\'t you think Thursday is a bit unrealistic?', 'Why is Thursday so important? Can\'t the meeting just be rescheduled?', 'I feel like you\'re being pretty rigid about this. There\'s a lot on my plate right now.', 'What if I send you a partial draft by Thursday and finish it Friday morning?', 'I\'ve been on this team longer than you. I think I know how to manage my own deadlines.', 'Fine. I\'ll try. But I can\'t promise it\'ll be my best work under this kind of pressure.', 'I\'m not going to be able to get it done by Thursday. You\'re just going to have to deal with that.'],
  },
  {
    id: 'boundaries', name: 'Boundaries',
    audioScript: ['I didn\'t think it was a big deal. I was just in the neighborhood.', 'But we\'re family. Do you really need me to text before I come over?', 'You\'re being so uptight about this. I\'ve always just dropped by.', 'I can\'t believe you\'re making such a big deal out of this. I\'m not some stranger.', 'Fine. But I think you\'re being really cold. This isn\'t how people who care about each other act.', 'What if it\'s an emergency? You\'re going to make me text even then?', 'You know, I feel very unwelcome right now. Is that really how you want me to feel?', 'Mom used to do the same thing and you never said anything to her.', 'I just don\'t understand why you need so much space. Are you hiding something?', 'I\'ll try, but I can\'t promise anything. I\'m a spontaneous person — that\'s just who I am.'],
  },
  {
    id: 'disagreements', name: 'Disagreements',
    audioScript: ['I hear you, but I really think my approach makes more sense here.', 'You always dig your heels in like this. Why can\'t you just be flexible for once?', 'Everyone else on the team agrees with me. You\'re the only holdout.', 'We\'ve gone back and forth on this too many times. Can\'t you just drop it?', 'I have more experience with this kind of situation. I think you should defer to me.', 'You\'re being emotional about this. Let\'s just be logical for a second.', 'Fine, we\'ll do it your way. But when it fails, don\'t say I didn\'t warn you.', 'I don\'t have time to keep arguing. Can we just vote and move on?', 'You know, it would be really great if you could just trust me on this one.', 'I\'m done discussing it. We\'re going with my plan and that\'s final.'],
  },
  {
    id: 'needs', name: 'Needs',
    audioScript: ['Of course. I can take Tuesday. No problem.', 'Tuesday is actually pretty rough for me. Can it be a different night?', 'I\'ve been tired too, you know. It\'s not like I\'ve been taking it easy.', 'Why do you need a break? Things haven\'t seemed that bad from where I\'m standing.', 'You know I\'d love to help, but I have a lot going on at work right now.', 'Can\'t you just relax while they watch TV or something? Why does it have to be a whole thing?', 'I feel like you\'re asking me to do a lot. What about everything I already do?', 'Fine, I\'ll do it. But I just want you to know it\'s not convenient.', 'What do you even do with time to yourself? I don\'t understand why you need it.', 'Every time I try to help, it\'s never the right way. Maybe you should just handle it yourself.'],
  },
  {
    id: 'clarification', name: 'Clarification',
    audioScript: ['I don\'t think I said anything that needs that much analysis.', 'You know what I meant. Why are you making this into a thing?', 'I was just making an observation. Don\'t overthink it.', 'Look, I can\'t control how you interpret what I say.', 'I said what I said. I don\'t know what more clarification you need.', 'Fine. I guess I was a little frustrated when I said it. Happy now?', 'You\'re being really sensitive about this. It wasn\'t a big deal.', 'I don\'t have time to walk through every single thing I say word by word.', 'Why does it matter exactly what I meant? Can\'t you just let it go?', 'Okay, you want the truth? I was annoyed. There. Is that the clarity you wanted?'],
  },
  {
    id: 'compromise', name: 'Compromise',
    audioScript: ['Okay, I\'m listening. What kind of compromise are you thinking?', 'That sounds more like you getting what you want with a bow on it.', 'I\'ve already given up a lot here. Why should I be the one giving more?', 'What if we just try it my way for a month and then revisit?', 'I feel like we keep landing on deals that favor you more than me.', 'You know, at some point, someone has to just decide. Why can\'t that be me?', 'I\'m not trying to win here. I just don\'t think your offer is actually fair.', 'What would it take for you to just agree to this? I\'m tired of going in circles.', 'I agreed to compromise. I didn\'t agree to give up everything that matters to me.', 'Fine. But I want it in writing so neither of us can pretend this didn\'t happen.'],
  },
];

// ─── VOICE ────────────────────────────────────────────────────────────────────
var VOICE_PROFILES = [
  { id: 'young-female', label: 'Young F', preferred: ['Ava (Enhanced)', 'Ava', 'Samantha (Enhanced)', 'Samantha', 'Zoe', 'Google US English'] },
  { id: 'mature-female', label: 'Mature F', preferred: ['Victoria', 'Karen (Enhanced)', 'Karen', 'Moira', 'Google UK English Female'] },
  { id: 'young-male', label: 'Young M', preferred: ['Daniel (Enhanced)', 'Daniel', 'Tom', 'Google UK English Male', 'Aaron'] },
  { id: 'mature-male', label: 'Mature M', preferred: ['Alex', 'Arthur (Enhanced)', 'Arthur', 'Gordon', 'Fred'] },
];

var _voices = [];
var _profile = localStorage.getItem('assertrx_voice') || 'young-female';
var _readyCbs = [];

function loadVoices() {
  var v = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
  if (v.length) {
    _voices = v;
    _readyCbs.forEach(function(fn) { fn(); });
    _readyCbs = [];
  }
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function onVoicesReady(fn) {
  if (_voices.length) fn(); else _readyCbs.push(fn);
}

function resolveVoice(id) {
  var profile = VOICE_PROFILES.find(function(p) { return p.id === id; });
  if (!profile) return null;
  var en = _voices.filter(function(v) { return v.lang.startsWith('en'); });
  for (var i = 0; i < profile.preferred.length; i++) {
    var name = profile.preferred[i];
    var found = en.find(function(v) { return v.name === name; });
    if (found) return found;
  }
  return en[0] || null;
}

function isSupported() { return 'speechSynthesis' in window; }

function stopAudio() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function speak(text) {
  stopAudio();
  if (!('speechSynthesis' in window)) return;
  var u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  var voice = resolveVoice(_profile);
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

function preview(id) {
  stopAudio();
  if (!('speechSynthesis' in window)) return;
  var u = new SpeechSynthesisUtterance('I hear you. Can we talk about this?');
  u.rate = 0.92;
  var voice = resolveVoice(id);
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

function getProfile() { return _profile; }

function setProfile(id) {
  _profile = id;
  localStorage.setItem('assertrx_voice', id);
}

// ─── PAGE STATE ───────────────────────────────────────────────────────────────
var _scenario = null;
var _step = 0;

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderScenarioList() {
  var list = document.getElementById('audio-select-list');
  if (!list) return;
  list.innerHTML = scenarios.map(function(s) {
    return '<div class="audio-select-item" data-id="' + s.id + '" role="button" tabindex="0">' +
      '<span class="material-symbols-outlined audio-select-icon">record_voice_over</span>' +
      '<span class="audio-select-name">' + s.name + '</span>' +
      '<span class="material-symbols-outlined" style="color:var(--text-muted)">chevron_right</span>' +
    '</div>';
  }).join('');
}

function renderVoicePicker() {
  var picker = document.getElementById('voice-picker');
  if (!picker || !isSupported()) return;
  var sel = getProfile();
  picker.innerHTML = VOICE_PROFILES.map(function(p) {
    return '<button class="voice-option' + (p.id === sel ? ' active' : '') + '" data-id="' + p.id + '">' +
      '<span class="voice-option-label">' + p.label + '</span>' +
      '<span class="material-symbols-outlined voice-option-play">play_circle</span>' +
    '</button>';
  }).join('');
}

function renderPractice() {
  var counter = document.getElementById('ap-counter');
  var stmt = document.getElementById('ap-statement');
  var lbl = document.getElementById('ap-next-label');
  var play = document.getElementById('ap-play');
  if (!_scenario) return;
  if (counter) counter.textContent = (_step + 1) + ' / ' + _scenario.audioScript.length;
  if (stmt) stmt.textContent = _scenario.audioScript[_step];
  if (lbl) lbl.textContent = _step < _scenario.audioScript.length - 1 ? 'Next' : 'Finish';
  if (play) play.hidden = !isSupported();
}

function showSelect() {
  document.getElementById('view-select').hidden = false;
  document.getElementById('view-practice').hidden = true;
  document.getElementById('btn-back').hidden = true;
}

function showPractice() {
  document.getElementById('view-select').hidden = true;
  document.getElementById('view-practice').hidden = false;
  document.getElementById('btn-back').hidden = false;
}

function startPractice(s) {
  _scenario = s;
  _step = 0;
  showPractice();
  renderPractice();
  if (isSupported()) speak(s.audioScript[0]);
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
document.getElementById('audio-select-list').addEventListener('click', function(e) {
  var item = e.target.closest('.audio-select-item');
  if (!item) return;
  var s = scenarios.find(function(sc) { return sc.id === item.dataset.id; });
  if (s) startPractice(s);
});

document.getElementById('voice-picker').addEventListener('click', function(e) {
  var opt = e.target.closest('.voice-option');
  if (!opt) return;
  stopAudio();
  setProfile(opt.dataset.id);
  renderVoicePicker();
  preview(opt.dataset.id);
});

document.getElementById('btn-back').addEventListener('click', function() {
  stopAudio();
  showSelect();
});

document.getElementById('ap-play').addEventListener('click', function() {
  if (_scenario) speak(_scenario.audioScript[_step]);
});

document.getElementById('ap-next').addEventListener('click', function() {
  stopAudio();
  if (!_scenario) return;
  if (_step < _scenario.audioScript.length - 1) {
    _step++;
    renderPractice();
    if (isSupported()) speak(_scenario.audioScript[_step]);
  } else {
    showSelect();
  }
});

// ─── BOOT ─────────────────────────────────────────────────────────────────────
renderScenarioList();
renderVoicePicker();
onVoicesReady(renderVoicePicker);
