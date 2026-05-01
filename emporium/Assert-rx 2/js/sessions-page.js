// ─── DATA ─────────────────────────────────────────────────────────────────────
var scenarios = [
  {
    id: 'requests', name: 'Requests',
    skills: [
      { name: 'What matters most here?' },
      { name: 'What do you want to ask for?' },
      { name: 'What are you willing to work with?' },
      { name: 'What do you need to understand?' },
      { name: 'How would you say no?' },
      { name: 'What does this mean to you?' },
    ],
  },
  {
    id: 'boundaries', name: 'Boundaries',
    skills: [
      { name: 'What matters most here?' },
      { name: 'What do you want to ask for?' },
      { name: 'What are you willing to work with?' },
      { name: 'What do you need to understand?' },
      { name: 'How would you say no?' },
      { name: 'What does this mean to you?' },
    ],
  },
  {
    id: 'disagreements', name: 'Disagreements',
    skills: [
      { name: 'What matters most here?' },
      { name: 'What do you want to ask for?' },
      { name: 'What are you willing to work with?' },
      { name: 'What do you need to understand?' },
      { name: 'How would you say no?' },
      { name: 'What does this mean to you?' },
    ],
  },
  {
    id: 'needs', name: 'Needs',
    skills: [
      { name: 'What matters most here?' },
      { name: 'What do you want to ask for?' },
      { name: 'What are you willing to work with?' },
      { name: 'What do you need to understand?' },
      { name: 'How would you say no?' },
      { name: 'What does this mean to you?' },
    ],
  },
  {
    id: 'clarification', name: 'Clarification',
    skills: [
      { name: 'What matters most here?' },
      { name: 'What do you want to ask for?' },
      { name: 'What are you willing to work with?' },
      { name: 'What do you need to understand?' },
      { name: 'How would you say no?' },
      { name: 'What does this mean to you?' },
    ],
  },
  {
    id: 'compromise', name: 'Compromise',
    skills: [
      { name: 'What matters most here?' },
      { name: 'What do you want to ask for?' },
      { name: 'What are you willing to work with?' },
      { name: 'What do you need to understand?' },
      { name: 'How would you say no?' },
      { name: 'What does this mean to you?' },
    ],
  },
];

// ─── STORAGE ──────────────────────────────────────────────────────────────────
var SESSIONS_KEY = 'assertrx_sessions';

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []; } catch(e) { return []; }
}

function deleteSession(id) {
  var all = loadSessions().filter(function(s) { return s.id !== id; });
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderList() {
  var list = document.getElementById('sessions-list');
  if (!list) return;
  var sessions = loadSessions();
  if (!sessions.length) {
    list.innerHTML = '<p class="empty-state">No sessions yet. Complete a practice to see it here.</p>';
    return;
  }
  list.innerHTML = sessions.map(function(s) {
    return '<div class="session-item" data-id="' + s.id + '" role="button" tabindex="0">' +
      '<div class="session-info">' +
        '<span class="session-name">' + esc(s.scenarioName) + '</span>' +
        '<span class="session-date">' + esc(s.date) + '</span>' +
      '</div>' +
      '<div class="session-actions">' +
        '<span class="material-symbols-outlined session-arrow">chevron_right</span>' +
        '<button class="btn-delete" data-id="' + s.id + '" aria-label="Delete">' +
          '<span class="material-symbols-outlined">delete</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderTimeline(scenario, answers) {
  var container = document.getElementById('detail-timeline');
  if (!container) return;
  container.innerHTML = scenario.skills.map(function(skill, i) {
    var side = i % 2 === 0 ? 'right' : 'left';
    var ans = answers[i] || '';
    return '<div class="timeline-node ' + side + '">' +
      '<div class="timeline-card">' +
        '<p class="timeline-skill">' + esc(skill.name) + '</p>' +
        '<p class="timeline-answer">' + (esc(ans) || '<em style="color:#a8c5bc">No answer recorded</em>') + '</p>' +
      '</div>' +
      '<div class="timeline-dot"></div>' +
    '</div>';
  }).join('');
}

function openDetail(id) {
  var session = loadSessions().find(function(s) { return s.id === id; });
  if (!session) return;
  var scenario = scenarios.find(function(s) { return s.id === session.scenarioId; });
  if (!scenario) return;
  document.getElementById('detail-name').textContent = session.scenarioName;
  document.getElementById('detail-date').textContent = session.date;
  renderTimeline(scenario, session.answers);
  showDetail();
}

function showList() {
  document.getElementById('view-list').hidden = false;
  document.getElementById('view-detail').hidden = true;
  document.getElementById('btn-back').hidden = true;
}

function showDetail() {
  document.getElementById('view-list').hidden = true;
  document.getElementById('view-detail').hidden = false;
  document.getElementById('btn-back').hidden = false;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────
document.getElementById('sessions-list').addEventListener('click', function(e) {
  var del = e.target.closest('.btn-delete');
  var item = e.target.closest('.session-item');
  if (del) {
    e.stopPropagation();
    if (confirm('Delete this session?')) { deleteSession(del.dataset.id); renderList(); }
  } else if (item) {
    openDetail(item.dataset.id);
  }
});

document.getElementById('btn-back').addEventListener('click', showList);

// ─── BOOT ─────────────────────────────────────────────────────────────────────
renderList();
