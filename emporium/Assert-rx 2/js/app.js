// --- data

const scenarios = [
  {
    id: 'requests', name: 'Requests',
    description: 'Practice asking clearly for what you need — without over-explaining, apologizing, or softening to the point of being ignored.',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80',
    skills: [
      {
        name: 'What matters most here?',
        prompt: 'Before you ask for anything, get clear on what you actually want.',
        suggestions: {
          direct: [{ text: 'Getting a clear yes or no answer', rating: 9 }, { text: 'Not feeling dismissed or rushed', rating: 7 }, { text: 'Keeping the relationship intact', rating: 6 }],
          gentle: [{ text: 'Being heard and taken seriously', rating: 9 }, { text: 'Finding a solution that works for both of us', rating: 8 }, { text: 'Not creating tension or awkwardness', rating: 6 }],
          firm:   [{ text: 'Getting exactly what I asked for', rating: 10 }, { text: 'Not being talked out of my request', rating: 8 }, { text: 'Setting a clear precedent for the future', rating: 7 }],
        },
      },
      { name: 'What do you want to ask for?', prompt: 'State your request in one or two sentences. Be specific — what exactly do you want, and by when?', suggestions: { direct: 'I need you to send me the updated report by Thursday at noon so I can review it before the meeting.', gentle: 'Would it be possible for you to get me the report by Thursday? That would give me time to look it over.', firm: 'I need the report by Thursday. That\'s the deadline I\'m working with.' } },
      { name: 'What are you willing to work with?', prompt: 'What flexibility, if any, do you have? What can you offer in return, or what alternative would you accept?', suggestions: { direct: 'If Thursday doesn\'t work, I can push to Friday morning — but that\'s the absolute latest.', gentle: 'I understand if Thursday is tight. Friday morning would still work if you need a bit more time.', firm: 'Thursday is the deadline. There\'s no flexibility on my end this time.' } },
      { name: 'What do you need to understand?', prompt: 'What information would help you make a stronger or more informed request?', suggestions: { direct: 'I need to know what\'s currently on their plate so I can assess whether my timeline is realistic.', gentle: 'It would help to understand if there are any blockers they\'re dealing with that might affect the timeline.', firm: 'I need to know if they\'ve deprioritized this, so I can escalate if necessary.' } },
      { name: 'How would you say no?', prompt: 'If they push back or try to delay, what will you say? Practice holding your position without getting defensive.', suggestions: { direct: 'I hear you, but I really do need this by Thursday. Is there anything I can do to make that happen on your end?', gentle: 'I understand you\'re stretched thin. Is there someone else who could help, or can we find a workaround together?', firm: 'I appreciate the honesty, but Thursday is the deadline and I need to hold it. Let\'s figure out how to make it work.' } },
      { name: 'What does this mean to you?', prompt: 'Why does this request matter? What\'s at stake if it goes unmet?', suggestions: { direct: 'If I don\'t have this by Thursday, I\'ll walk into that meeting unprepared, and that reflects on both of us.', gentle: 'This matters to me because being prepared makes the whole team look more competent in front of the client.', firm: 'Getting this right is important to me. It\'s not just a task — it\'s how I show up to the work I care about.' } },
    ],
    audioScript: ['Sure, I can try to have that to you by Thursday.', 'Actually, I\'m not sure Thursday works. I have a lot going on this week.', 'Can you give me until Friday? I\'ll definitely have it done by then.', 'Look, I\'m doing my best here. Don\'t you think Thursday is a bit unrealistic?', 'Why is Thursday so important? Can\'t the meeting just be rescheduled?', 'I feel like you\'re being pretty rigid about this. There\'s a lot on my plate right now.', 'What if I send you a partial draft by Thursday and finish it Friday morning?', 'I\'ve been on this team longer than you. I think I know how to manage my own deadlines.', 'Fine. I\'ll try. But I can\'t promise it\'ll be my best work under this kind of pressure.', 'I\'m not going to be able to get it done by Thursday. You\'re just going to have to deal with that.'],
  },
  {
    id: 'boundaries', name: 'Boundaries',
    description: 'Practice communicating what you will and won\'t accept — calmly, without guilt, and without needing the other person\'s approval to enforce it.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    skills: [
      {
        name: 'What matters most here?',
        prompt: 'Before you can hold a boundary, you need to know what you\'re protecting.',
        suggestions: {
          direct: [{ text: 'My time and personal space', rating: 10 }, { text: 'Being treated with basic respect', rating: 9 }, { text: 'Not having to justify my limits to others', rating: 7 }],
          gentle: [{ text: 'Feeling emotionally safe in this relationship', rating: 10 }, { text: 'Maintaining connection without losing myself', rating: 8 }, { text: 'Not feeling guilty for having needs', rating: 7 }],
          firm:   [{ text: 'My self-respect and mental health', rating: 10 }, { text: 'Making clear what I will not tolerate', rating: 9 }, { text: 'Following through consistently', rating: 8 }],
        },
      },
      { name: 'What do you want to ask for?', prompt: 'State your boundary clearly. What behavior are you asking to change, and what are you asking them to do instead?', suggestions: { direct: 'I need you to stop dropping by unannounced. If you want to visit, please text me first and wait for a yes.', gentle: 'I really value our time together, but I need a bit more notice before visits. Could we start checking in first?', firm: 'Going forward, all visits need to be planned in advance. I won\'t be opening the door for unannounced drop-ins.' } },
      { name: 'What are you willing to work with?', prompt: 'What are you willing to accommodate? Is there a middle ground — or is this non-negotiable?', suggestions: { direct: 'If you text and I\'m free, I\'m happy to have you over. The advance notice is the only thing I\'m asking for.', gentle: 'Even a quick text twenty minutes ahead is fine. I just need a little heads-up so I can be ready.', firm: 'This isn\'t up for negotiation. The boundary is the same regardless of the reason for the visit.' } },
      { name: 'What do you need to understand?', prompt: 'What would help you understand why this boundary is being crossed?', suggestions: { direct: 'I want to understand if they realize this bothers me, or if they genuinely don\'t see the problem.', gentle: 'It would help to know if there\'s something going on in their life that\'s driving this behavior.', firm: 'I need to know if this is a pattern or a one-time thing, so I know how firm I need to be.' } },
      { name: 'How would you say no?', prompt: 'What will you do or say if this boundary is crossed again? Practice stating a consequence calmly and directly.', suggestions: { direct: 'If you show up unannounced again, I won\'t answer the door. It\'s not personal — it\'s just the boundary I need.', gentle: 'If this keeps happening, I\'m going to have to step back from making plans with you for a while.', firm: 'I\'ve been clear about this. If it happens again, I\'ll need to reconsider how much access I give you to my life.' } },
      { name: 'What does this mean to you?', prompt: 'Why does this boundary matter to you? Knowing your "why" helps you hold it steady without anger or guilt.', suggestions: { direct: 'My home is the one place I can decompress. Having that disrupted without warning affects my whole day.', gentle: 'I care about this relationship, but I can only show up well in it if I have some control over my own space and time.', firm: 'Holding this boundary is how I take care of myself. It\'s not about you — it\'s about what I need to function.' } },
    ],
    audioScript: ['I didn\'t think it was a big deal. I was just in the neighborhood.', 'But we\'re family. Do you really need me to text before I come over?', 'You\'re being so uptight about this. I\'ve always just dropped by.', 'I can\'t believe you\'re making such a big deal out of this. I\'m not some stranger.', 'Fine. But I think you\'re being really cold. This isn\'t how people who care about each other act.', 'What if it\'s an emergency? You\'re going to make me text even then?', 'You know, I feel very unwelcome right now. Is that really how you want me to feel?', 'Mom used to do the same thing and you never said anything to her.', 'I just don\'t understand why you need so much space. Are you hiding something?', 'I\'ll try, but I can\'t promise anything. I\'m a spontaneous person — that\'s just who I am.'],
  },
  {
    id: 'disagreements', name: 'Disagreements',
    description: 'Practice holding your position in a disagreement — without backing down, getting defensive, or needing the other person to agree with you.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
    skills: [
      {
        name: 'What matters most here?',
        prompt: 'Get clear on what you\'re actually disagreeing about.',
        suggestions: {
          direct: [{ text: 'Being heard and taken seriously', rating: 9 }, { text: 'Not having my perspective dismissed', rating: 8 }, { text: 'Reaching a decision I can stand behind', rating: 8 }],
          gentle: [{ text: 'Maintaining mutual respect throughout', rating: 10 }, { text: 'Finding common ground where possible', rating: 8 }, { text: 'Preserving the relationship after the disagreement', rating: 7 }],
          firm:   [{ text: 'Sticking to my position without caving', rating: 10 }, { text: 'Not letting pressure or guilt change my view', rating: 9 }, { text: 'Being honest even if it creates friction', rating: 8 }],
        },
      },
      { name: 'What do you want to ask for?', prompt: 'What are you asking them to do, acknowledge, or reconsider? Be specific about what a good outcome looks like.', suggestions: { direct: 'I\'m asking you to seriously consider my perspective before we make a final decision — not just dismiss it.', gentle: 'I\'d love for us to take a step back and look at this from both angles before we move forward.', firm: 'I need you to hear my position fully before we go any further. I won\'t move on until that happens.' } },
      { name: 'What are you willing to work with?', prompt: 'Where can you meet in the middle? What would you be willing to concede?', suggestions: { direct: 'I\'m open to adjusting the details if the core approach changes. I\'m not flexible on the direction itself.', gentle: 'I\'m willing to try it your way on one condition — that we agree to reassess in a month.', firm: 'I\'m not willing to compromise on the main issue. But I\'m open to how we implement my position.' } },
      { name: 'What do you need to understand?', prompt: 'What\'s driving their position? What do you need to understand about their reasoning before you can respond thoughtfully?', suggestions: { direct: 'I need to understand exactly why they\'re pushing back so hard — what are they actually afraid of losing?', gentle: 'It would help to know what\'s behind their view. There might be a concern I haven\'t fully understood yet.', firm: 'I need to know if their position is based on facts or just preference — that changes how I respond.' } },
      { name: 'How would you say no?', prompt: 'When they push back on your position, what do you say? Practice acknowledging their view while holding your own.', suggestions: { direct: 'I hear you, and I understand where you\'re coming from. I still disagree, and I\'m not going to change my position on this.', gentle: 'I appreciate your perspective. I just see it differently, and I want to make sure my view gets equal weight here.', firm: 'I\'ve heard your reasoning. My answer is still no. That\'s not going to change because we keep going in circles.' } },
      { name: 'What does this mean to you?', prompt: 'Why does being heard in this disagreement matter to you?', suggestions: { direct: 'If I let this go, I\'m agreeing to a direction I don\'t believe in — and I\'ll be the one who has to live with that outcome.', gentle: 'This matters to me because I\'ve thought hard about this. Backing down just to keep the peace stops feeling okay at some point.', firm: 'Every time I give in when I know I\'m right, I lose a little trust in myself. I\'m not doing that today.' } },
    ],
    audioScript: ['I hear you, but I really think my approach makes more sense here.', 'You always dig your heels in like this. Why can\'t you just be flexible for once?', 'Everyone else on the team agrees with me. You\'re the only holdout.', 'We\'ve gone back and forth on this too many times. Can\'t you just drop it?', 'I have more experience with this kind of situation. I think you should defer to me.', 'You\'re being emotional about this. Let\'s just be logical for a second.', 'Fine, we\'ll do it your way. But when it fails, don\'t say I didn\'t warn you.', 'I don\'t have time to keep arguing. Can we just vote and move on?', 'You know, it would be really great if you could just trust me on this one.', 'I\'m done discussing it. We\'re going with my plan and that\'s final.'],
  },
  {
    id: 'needs', name: 'Needs',
    description: 'Practice expressing what you genuinely need — without minimizing it, burying it in hints, or waiting for someone to figure it out on their own.',
    image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=600&q=80',
    skills: [
      {
        name: 'What matters most here?',
        prompt: 'What do you actually need in this situation?',
        suggestions: {
          direct: [{ text: 'Practical support, not just sympathy', rating: 9 }, { text: 'Being asked how I\'m doing and actually heard', rating: 8 }, { text: 'Space to talk without being given advice', rating: 7 }],
          gentle: [{ text: 'Feeling less alone in what I\'m going through', rating: 10 }, { text: 'Someone checking in on me regularly', rating: 8 }, { text: 'Knowing I can ask for help without judgment', rating: 7 }],
          firm:   [{ text: 'Concrete help, not vague offers', rating: 10 }, { text: 'Follow-through on what people say they\'ll do', rating: 9 }, { text: 'Not having to ask more than once', rating: 8 }],
        },
      },
      { name: 'What do you want to ask for?', prompt: 'Say what you need directly. What specific thing are you asking for?', suggestions: { direct: 'I need help with the kids on Tuesday evening. Can you take pickup and dinner so I can have a few hours to myself?', gentle: 'I\'m running on empty and I could really use a break. Would you be able to cover Tuesday evening for me?', firm: 'I need Tuesday evening to myself. I\'m asking you to handle everything that night — no exceptions.' } },
      { name: 'What are you willing to work with?', prompt: 'What alternatives or adjustments are you open to? What are the non-negotiables?', suggestions: { direct: 'Tuesday works best, but Wednesday could also work. What I\'m not flexible on is getting that time this week.', gentle: 'If Tuesday is hard, I\'m open to another evening this week. I just need it to actually happen.', firm: 'The time off is not negotiable. Which evening it is can flex, but it\'s happening this week.' } },
      { name: 'What do you need to understand?', prompt: 'What would help you know whether this need can be met?', suggestions: { direct: 'I need to know if they\'re actually able to be present — not physically there but mentally checked out.', gentle: 'I want to understand if there\'s something going on with them too. I don\'t want to ask for more than they can give.', firm: 'I need to know if this is going to happen or if I\'ll need to make other arrangements.' } },
      { name: 'How would you say no?', prompt: 'What will you do if your need isn\'t met — or if they offer something that doesn\'t address what you\'re asking for?', suggestions: { direct: 'If you can\'t do it, I understand — but I\'ll need to find someone who can. I\'m not going to let this slide.', gentle: 'If this week doesn\'t work, I\'d like to schedule something specific for next week. I need to know it\'s on the calendar.', firm: 'If this doesn\'t happen, I\'m going to have to make other plans and I\'ll feel less able to rely on you going forward.' } },
      { name: 'What does this mean to you?', prompt: 'Why is this need important? What happens when this need goes unmet?', suggestions: { direct: 'When I don\'t get time to recharge, I become a worse parent, a worse partner, and a worse version of myself.', gentle: 'I\'ve been giving everything to everyone else and leaving nothing for me. This isn\'t sustainable and I need it to change.', firm: 'My needs are real and they matter. Treating them as an afterthought isn\'t something I\'m willing to keep accepting.' } },
    ],
    audioScript: ['Of course. I can take Tuesday. No problem.', 'Tuesday is actually pretty rough for me. Can it be a different night?', 'I\'ve been tired too, you know. It\'s not like I\'ve been taking it easy.', 'Why do you need a break? Things haven\'t seemed that bad from where I\'m standing.', 'You know I\'d love to help, but I have a lot going on at work right now.', 'Can\'t you just relax while they watch TV or something? Why does it have to be a whole thing?', 'I feel like you\'re asking me to do a lot. What about everything I already do?', 'Fine, I\'ll do it. But I just want you to know it\'s not convenient.', 'What do you even do with time to yourself? I don\'t understand why you need it.', 'Every time I try to help, it\'s never the right way. Maybe you should just handle it yourself.'],
  },
  {
    id: 'clarification', name: 'Clarification',
    description: 'Practice asking for clarity before reacting — so you can respond to what\'s actually being said, not what you assumed.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',
    skills: [
      {
        name: 'What matters most here?',
        prompt: 'Before asking for clarification, get clear on what you\'re confused about.',
        suggestions: {
          direct: [{ text: 'Understanding exactly what they meant', rating: 10 }, { text: 'Not reacting to something that wasn\'t meant how I took it', rating: 9 }, { text: 'Getting specific information, not vague reassurance', rating: 7 }],
          gentle: [{ text: 'Making sure I didn\'t misread the tone or intent', rating: 9 }, { text: 'Feeling safe enough to ask without seeming defensive', rating: 8 }, { text: 'Clarifying before things get more complicated', rating: 7 }],
          firm:   [{ text: 'Getting a straight answer, not a runaround', rating: 10 }, { text: 'Knowing where I stand clearly', rating: 9 }, { text: 'Not letting ambiguity become an excuse later', rating: 8 }],
        },
      },
      { name: 'What do you want to ask for?', prompt: 'What specific clarification are you asking for? Frame it as a question, not an accusation.', suggestions: { direct: 'When you said that, did you mean my work isn\'t meeting expectations, or that you want me to do it differently going forward?', gentle: 'I want to make sure I understood you correctly. When you said that, were you saying you were disappointed, or just flagging something for the future?', firm: 'I need you to be specific. What exactly did you mean by that, and what do you want me to do with it?' } },
      { name: 'What are you willing to work with?', prompt: 'What are you open to once you have clarity?', suggestions: { direct: 'Once I understand what you meant, I\'m happy to adjust my approach if that\'s what\'s needed.', gentle: 'If it turns out I misread it, I\'m completely open to hearing what you were really trying to say.', firm: 'Once I have a clear answer, I\'ll know what to do next. But I need the clarity first before I commit to anything.' } },
      { name: 'What do you need to understand?', prompt: 'What context would help you interpret what they said accurately?', suggestions: { direct: 'I need to understand if this was general feedback or specific criticism, and whether they\'re asking me to change something.', gentle: 'It would help to know if they were in a bad mood when they said it, or if it was a deliberate comment.', firm: 'I need to know the intention behind it — was it a warning, a complaint, or just offhand? That changes everything.' } },
      { name: 'How would you say no?', prompt: 'What if they give you a vague or dismissive answer? How do you push for the clarity you actually need?', suggestions: { direct: 'I appreciate that, but I still need a more specific answer. Can you tell me exactly what you meant?', gentle: 'I hear you, but I\'m still not sure I understand. Can we slow down and be more specific about what happened?', firm: 'That doesn\'t answer my question. I\'m going to ask it one more time, and I need a real answer.' } },
      { name: 'What does this mean to you?', prompt: 'Why does getting clarity matter here? What\'s the cost of acting on a misunderstanding?', suggestions: { direct: 'If I respond to the wrong message, I\'ll waste energy fixing the wrong thing — or create a bigger problem.', gentle: 'Getting this wrong could damage the relationship. I\'d rather take a moment to understand than react and regret it.', firm: 'I\'ve made the mistake of assuming before. Acting without clarity leads to outcomes I can\'t undo.' } },
    ],
    audioScript: ['I don\'t think I said anything that needs that much analysis.', 'You know what I meant. Why are you making this into a thing?', 'I was just making an observation. Don\'t overthink it.', 'Look, I can\'t control how you interpret what I say.', 'I said what I said. I don\'t know what more clarification you need.', 'Fine. I guess I was a little frustrated when I said it. Happy now?', 'You\'re being really sensitive about this. It wasn\'t a big deal.', 'I don\'t have time to walk through every single thing I say word by word.', 'Why does it matter exactly what I meant? Can\'t you just let it go?', 'Okay, you want the truth? I was annoyed. There. Is that the clarity you wanted?'],
  },
  {
    id: 'compromise', name: 'Compromise',
    description: 'Practice negotiating toward a real middle ground — where both people give something and neither person loses everything that matters to them.',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80',
    skills: [
      {
        name: 'What matters most here?',
        prompt: 'To find real compromise, you need to know what you\'re willing to give and what you\'re not.',
        suggestions: {
          direct: [{ text: 'The outcome I most care about getting right', rating: 10 }, { text: 'Not feeling like I gave up everything', rating: 8 }, { text: 'A solution we can both actually commit to', rating: 7 }],
          gentle: [{ text: 'Both people feeling respected in the outcome', rating: 10 }, { text: 'The relationship staying strong after this', rating: 9 }, { text: 'Not holding resentment over what I concede', rating: 7 }],
          firm:   [{ text: 'My core position not being completely abandoned', rating: 10 }, { text: 'Getting something real, not just symbolic', rating: 9 }, { text: 'Clear terms so this doesn\'t come up again', rating: 8 }],
        },
      },
      { name: 'What do you want to ask for?', prompt: 'What would a fair compromise look like from your side? Name your ideal version — the deal you\'d actually accept.', suggestions: { direct: 'I\'d like us to split the difference — I\'ll adjust my end by 30%, but I need you to meet me halfway with equal movement on yours.', gentle: 'What if we each took the piece we care about most and let the other decide the rest? That way we both get something that matters.', firm: 'Here\'s what I\'m willing to agree to: you get X, I get Y, and we don\'t revisit this for at least six months.' } },
      { name: 'What are you willing to work with?', prompt: 'What are you genuinely willing to give up or adjust? What\'s off the table entirely?', suggestions: { direct: 'I can be flexible on timing and format. What I won\'t move on is the core deliverable we agreed to.', gentle: 'I\'m open to adjusting how we get there, even if I need the destination to stay the same.', firm: 'I\'ll give on the smaller stuff, but I need the main ask to stand. That\'s the line I\'m holding.' } },
      { name: 'What do you need to understand?', prompt: 'What do you need to know about their priorities to find a deal that actually works for both of you?', suggestions: { direct: 'I need to understand what they\'re most unwilling to give up — that tells me where the real negotiation is happening.', gentle: 'If I knew what was driving their position, I might find places we can actually agree instead of just going in circles.', firm: 'I need to know if they\'re negotiating in good faith, or just trying to wear me down until I agree to everything.' } },
      { name: 'How would you say no?', prompt: 'What if the compromise they offer isn\'t actually a compromise? How do you push back without blowing up the negotiation?', suggestions: { direct: 'That\'s not a compromise — that\'s me giving up everything. I need something that moves in both directions.', gentle: 'I appreciate the offer, but I don\'t think that quite gets us to fair. Can we try again?', firm: 'I\'m going to be honest: that doesn\'t work for me. I\'m still at the table, but I need a better offer.' } },
      { name: 'What does this mean to you?', prompt: 'Why does reaching a real compromise matter here — not just ending the conflict, but actually finding something fair?', suggestions: { direct: 'A fake compromise that I resent will just create the same conflict again in three months. I\'d rather get it right now.', gentle: 'This matters because I want us to walk away both feeling like the outcome was fair. That\'s what makes it stick.', firm: 'If the compromise isn\'t real, I\'m just agreeing to lose with extra steps. That\'s not something I\'m willing to do.' } },
    ],
    audioScript: ['Okay, I\'m listening. What kind of compromise are you thinking?', 'That sounds more like you getting what you want with a bow on it.', 'I\'ve already given up a lot here. Why should I be the one giving more?', 'What if we just try it my way for a month and then revisit?', 'I feel like we keep landing on deals that favor you more than me.', 'You know, at some point, someone has to just decide. Why can\'t that be me?', 'I\'m not trying to win here. I just don\'t think your offer is actually fair.', 'What would it take for you to just agree to this? I\'m tired of going in circles.', 'I agreed to compromise. I didn\'t agree to give up everything that matters to me.', 'Fine. But I want it in writing so neither of us can pretend this didn\'t happen.'],
  },
];

const SKILL_ICONS = ['emoji_objects', 'chat', 'handshake', 'psychology', 'back_hand', 'favorite'];

const SKILL_IMAGES = [
  'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80',
  'https://images.unsplash.com/photo-1531498860502-7c67cf519b9e?w=600&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
  'https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=600&q=80',
];

// Step 0 uses scenario-specific skill.prompt; steps 1–5 use these.
const SKILL_DESCS = [
  null,
  'Being specific about what you want gives the other person a clear target — and keeps you from settling for less.',
  'Knowing your limits before the conversation keeps you from giving too much — or walking away from something reasonable.',
  'Understanding their perspective isn\'t backing down — it\'s information that makes your response stronger.',
  'Saying no clearly and calmly is a skill. Practicing it in advance makes it easier in the moment.',
  'Connecting your answer to your values gives it weight and helps you hold your position.',
];

const SKILL1_TASK = 'Add and rank what is important to you in this situation.';

// --- state

let _state = {
  screen: 'grid',
  scenario: null,
  step: 0,
  answers: ['', '', '', '', '', ''],
  suggestionIndex: -1,
  audioStep: 0,
  audioScenario: null,
  activeSession: null,
};

const _listeners = [];

function getState() {
  return Object.assign({}, _state, { answers: _state.answers.slice() });
}

function setState(patch) {
  Object.assign(_state, patch);
  const snap = getState();
  _listeners.forEach(fn => fn(snap));
}

function subscribe(fn) {
  _listeners.push(fn);
}

// --- storage

const SESSIONS_KEY = 'assertrx_sessions';

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []; } catch (e) { return []; }
}

function saveSession(session) {
  const all = loadSessions();
  all.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
}

function updateSessionAnswers(id, answers) {
  const all = loadSessions();
  const session = all.find(s => s.id === id);
  if (session) {
    session.answers = answers;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
  }
}

// --- audio

function speechSupported() { return 'speechSynthesis' in window; }

function stopAudio() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

function speak(text) {
  stopAudio();
  if (!speechSupported()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  window.speechSynthesis.speak(u);
}

// --- router

const FLOW_SCREENS = ['prompt', 'response', 'saved', 'timeline', 'audio-gate', 'audio', 'completion'];
const NO_BACK = ['onboarding', 'grid'];

subscribe(state => {
  document.querySelectorAll('[data-screen]').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === state.screen);
  });

  const bar = document.getElementById('progress-bar');
  const fill = document.getElementById('progress-fill');
  if (bar && fill) {
    const inFlow = state.screen === 'prompt' || state.screen === 'response';
    bar.hidden = !inFlow;
    if (inFlow) {
      const pct = ((state.step + (state.screen === 'response' ? 0.5 : 0)) / 6) * 100;
      fill.style.width = pct + '%';
    }
  }

  const btnBack = document.getElementById('btn-back');
  if (btnBack) btnBack.hidden = NO_BACK.includes(state.screen);

  const btnExit = document.getElementById('btn-exit');
  if (btnExit) btnExit.hidden = !FLOW_SCREENS.includes(state.screen);

  const nav = document.getElementById('bottom-nav');
  if (nav) nav.hidden = FLOW_SCREENS.includes(state.screen);
});

// --- grid

let _selectedScenario = null;

const grid = document.getElementById('scenario-grid');
if (grid) {
  grid.innerHTML = scenarios.map(s =>
    `<div class="scenario-card" data-id="${s.id}" role="button" tabindex="0">` +
    `<img src="${s.image}" alt="${s.name}" class="card-img" loading="lazy">` +
    `<div class="card-overlay"><span class="card-name">${s.name}</span></div>` +
    `</div>`
  ).join('');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.scenario-card');
    if (!card) return;
    const s = scenarios.find(sc => sc.id === card.dataset.id);
    if (s) openSheet(s);
  });
}

function openSheet(s) {
  _selectedScenario = s;
  const title = document.getElementById('sheet-title');
  const desc = document.getElementById('sheet-desc');
  if (title) title.textContent = s.name;
  if (desc) desc.textContent = s.description;
  document.getElementById('bottom-sheet').classList.add('open');
  document.getElementById('backdrop').classList.add('visible');
}

function closeSheet() {
  document.getElementById('bottom-sheet').classList.remove('open');
  document.getElementById('backdrop').classList.remove('visible');
  _selectedScenario = null;
}

document.getElementById('backdrop').addEventListener('click', closeSheet);

document.getElementById('btn-start-practice').addEventListener('click', () => {
  if (!_selectedScenario) return;
  const s = _selectedScenario;
  closeSheet();
  setState({ screen: 'prompt', scenario: s, step: 0, answers: ['', '', '', '', '', ''], suggestionIndex: -1 });
});

// --- skill 1 helpers

function setSlider(field, value) {
  const slider = document.querySelector(`.slider-group[data-field="${field}"] .rating-slider`);
  const label  = document.querySelector(`.slider-group[data-field="${field}"] .slider-value`);
  if (slider) slider.value = value;
  if (label)  label.textContent = String(value);
}

function getSliderValue(field) {
  const slider = document.querySelector(`.slider-group[data-field="${field}"] .rating-slider`);
  return slider ? slider.value : '0';
}

function resetPriority() {
  [0, 1, 2].forEach(i => {
    const input = document.getElementById(`s1-text-${i}`);
    if (input) input.value = '';
    setSlider(i, 0);
    const check = document.querySelector(`.skill1-check[data-field="${i}"]`);
    if (check) check.classList.remove('confirmed');
  });
}

function readPriority() {
  return [0, 1, 2].map(i => {
    const text = (document.getElementById(`s1-text-${i}`)?.value || '').trim();
    return text ? `${text} — ${getSliderValue(i)}/10` : '';
  }).filter(Boolean).join('\n');
}

function fillPriorityFromAnswer(answer) {
  answer.split('\n').forEach((line, i) => {
    const m = line.match(/^(.+) — (\d+)\/\d+$/);
    const input = document.getElementById(`s1-text-${i}`);
    if (input) input.value = m ? m[1] : line;
    if (m) setSlider(i, m[2]);
  });
}

function fillPriorityFromSuggestion(entries) {
  entries.forEach((entry, i) => {
    const check = document.querySelector(`.skill1-check[data-field="${i}"]`);
    if (check?.classList.contains('confirmed')) return;
    const input = document.getElementById(`s1-text-${i}`);
    if (input) input.value = entry.text;
    setSlider(i, entry.rating);
  });
}

// --- render

let _prevKey = null;

function renderPrompt(state) {
  if (!state.scenario) return;
  const skill = state.scenario.skills[state.step];
  const img = document.getElementById('prompt-image');
  if (img) { img.src = SKILL_IMAGES[state.step] || state.scenario.image; img.alt = state.scenario.name; }
  const lbl = document.getElementById('prompt-skill-label');
  if (lbl) lbl.textContent = `${state.scenario.name}: Skill ${state.step + 1} of 6`;
  const name = document.getElementById('prompt-skill-name');
  if (name) name.textContent = skill.name;
  const q = document.getElementById('prompt-question');
  if (q) q.textContent = state.step === 0 ? skill.prompt : SKILL_DESCS[state.step];
}

function renderResponse(state) {
  if (!state.scenario) return;
  const skill = state.scenario.skills[state.step];
  const isStep0 = state.step === 0;

  const lbl = document.getElementById('response-skill-label');
  if (lbl) lbl.textContent = `${state.scenario.name}: Skill ${state.step + 1} of 6`;
  const prmt = document.getElementById('response-prompt');
  if (prmt) prmt.textContent = isStep0 ? SKILL1_TASK : skill.prompt;

  const fields = document.getElementById('skill1-fields');
  const textarea = document.getElementById('response-textarea');
  if (fields) fields.hidden = !isStep0;
  if (textarea) textarea.hidden = isStep0;

  if (isStep0) {
    const key = `r0-${state.scenario.id}`;
    if (_prevKey !== key) {
      _prevKey = key;
      if (state.answers[0]) fillPriorityFromAnswer(state.answers[0]);
      else resetPriority();
    }
  } else {
    _prevKey = `r${state.step}`;
    if (textarea && textarea.value !== state.answers[state.step]) {
      textarea.value = state.answers[state.step] || '';
    }
  }
  syncTonePicker(state.suggestionIndex);
}

function syncTonePicker(idx) {
  document.querySelectorAll('.tone-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.tone) === idx);
  });
}

// --- flow events

document.getElementById('btn-answer').addEventListener('click', () => {
  setState({ screen: 'response' });
});

document.getElementById('btn-next-step').addEventListener('click', () => {
  _prevKey = null;
  const s = getState();
  const answers = s.answers.slice();

  if (s.step === 0) {
    answers[0] = readPriority();
  } else {
    const ta = document.getElementById('response-textarea');
    answers[s.step] = ta ? ta.value.trim() : '';
  }

  if (s.step < 5) {
    setState({ answers, screen: 'prompt', step: s.step + 1, suggestionIndex: -1 });
  } else {
    const session = {
      id: `${s.scenario.id}-${Date.now()}`,
      scenarioId: s.scenario.id,
      scenarioName: s.scenario.name,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      answers,
    };
    saveSession(session);
    setState({ answers, activeSession: session, screen: 'saved' });
  }
});

document.querySelector('.tone-picker').addEventListener('click', e => {
  const btn = e.target.closest('.tone-btn');
  if (!btn) return;
  const idx = Number(btn.dataset.tone);
  const s = getState();
  const answers = s.answers.slice();
  const isActive = s.suggestionIndex === idx && btn.classList.contains('active');

  if (isActive) {
    if (s.step === 0) {
      resetPriority();
      answers[0] = '';
    } else {
      const ta = document.getElementById('response-textarea');
      if (ta) ta.value = '';
      answers[s.step] = '';
    }
    setState({ suggestionIndex: -1, answers });
    syncTonePicker(-1);
    return;
  }

  const skill = s.scenario?.skills[s.step];
  if (!skill) return;
  const toneKey = ['direct', 'gentle', 'firm'][idx];
  const suggestion = skill.suggestions[toneKey];

  if (s.step === 0 && Array.isArray(suggestion)) {
    fillPriorityFromSuggestion(suggestion);
    answers[0] = readPriority();
  } else {
    const ta = document.getElementById('response-textarea');
    if (ta) ta.value = suggestion;
    answers[s.step] = suggestion;
  }
  setState({ suggestionIndex: idx, answers });
  syncTonePicker(idx);
});

document.getElementById('response-textarea').addEventListener('input', e => {
  const s = getState();
  if (s.step === 0) return;
  const answers = s.answers.slice();
  answers[s.step] = e.target.value;
  setState({ answers });
});

document.querySelectorAll('.rating-slider').forEach(slider => {
  slider.value = 0;
  slider.addEventListener('input', () => {
    const group = slider.closest('.slider-group');
    const label = group?.querySelector('.slider-value');
    if (label) label.textContent = slider.value;
    const field = group?.dataset.field;
    if (field != null) {
      const check = document.querySelector(`.skill1-check[data-field="${field}"]`);
      if (check) check.classList.add('confirmed');
    }
  });
});

document.getElementById('skill1-fields').addEventListener('click', e => {
  const btn = e.target.closest('.skill1-check');
  if (btn) btn.classList.toggle('confirmed');
});

// --- back nav

function handleBack(state) {
  switch (state.screen) {
    case 'response':
      _prevKey = null;
      setState({ screen: 'prompt' });
      break;
    case 'prompt':
      if (state.step === 0) setState({ screen: 'grid', scenario: null, step: 0 });
      else setState({ screen: 'response', step: state.step - 1 });
      break;
    case 'saved':      setState({ screen: 'response', step: 5 }); break;
    case 'timeline':   setState({ screen: 'saved' }); break;
    case 'audio-gate': setState({ screen: 'timeline' }); break;
    case 'audio':      setState({ screen: 'audio-gate' }); break;
    case 'completion': setState({ screen: 'timeline' }); break;
  }
}

document.getElementById('btn-back').addEventListener('click', () => {
  stopAudio();
  handleBack(getState());
});

document.getElementById('btn-exit').addEventListener('click', () => {
  stopAudio();
  setState({ screen: 'grid', scenario: null, step: 0, answers: ['', '', '', '', '', ''], activeSession: null });
});

// --- timeline

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function renderTimeline(state) {
  if (!state.scenario) return;
  const nameEl = document.getElementById('timeline-scenario-name');
  if (nameEl) nameEl.textContent = state.scenario.name;
  const container = document.getElementById('timeline-nodes');
  if (!container) return;
  const answers = state.activeSession?.answers || state.answers;
  container.innerHTML = state.scenario.skills.map((skill, i) => {
    const side = i % 2 === 0 ? 'right' : 'left';
    const ans = answers[i] || '';
    return `<div class="timeline-node ${side}">
      <div class="timeline-card" data-index="${i}">
        <div class="timeline-card-header">
          <span class="material-symbols-outlined timeline-icon">${SKILL_ICONS[i]}</span>
          <p class="timeline-skill">${skill.name}</p>
        </div>
        <p class="timeline-answer" id="ans-${i}">${escHtml(ans) || '<em class="timeline-empty">No answer recorded</em>'}</p>
        <div class="timeline-edit" id="edit-area-${i}" hidden>
          <textarea class="timeline-textarea" id="edit-ta-${i}" rows="3">${escHtml(ans)}</textarea>
          <div class="timeline-edit-actions">
            <button class="btn-save-edit" data-index="${i}">Save</button>
            <button class="btn-cancel-edit" data-index="${i}">Cancel</button>
          </div>
        </div>
      </div>
      <div class="timeline-dot"></div>
    </div>`;
  }).join('');
}

document.getElementById('btn-view-plan').addEventListener('click', () => {
  setState({ screen: 'timeline' });
});

document.getElementById('btn-start-audio').addEventListener('click', () => {
  setState({ screen: 'audio-gate' });
});

document.getElementById('timeline-nodes').addEventListener('click', e => {
  const save   = e.target.closest('.btn-save-edit');
  const cancel = e.target.closest('.btn-cancel-edit');
  const card   = e.target.closest('.timeline-card');

  if (save) {
    e.stopPropagation();
    const i = Number(save.dataset.index);
    const ta = document.getElementById(`edit-ta-${i}`);
    if (!ta) return;
    const val = ta.value.trim();
    const st = getState();
    const answers = (st.activeSession?.answers || st.answers).slice();
    answers[i] = val;
    if (st.activeSession?.id) {
      updateSessionAnswers(st.activeSession.id, answers);
      st.activeSession.answers = answers;
    }
    const ansEl = document.getElementById(`ans-${i}`);
    if (ansEl) ansEl.innerHTML = escHtml(val) || '<em class="timeline-empty">No answer</em>';
    toggleEdit(i, false);
  } else if (cancel) {
    e.stopPropagation();
    toggleEdit(Number(cancel.dataset.index), false);
  } else if (card && !e.target.closest('.timeline-edit')) {
    const idx = Number(card.dataset.index);
    const editArea = document.getElementById(`edit-area-${idx}`);
    if (editArea?.hidden) toggleEdit(idx, true);
  }
});

function toggleEdit(i, open) {
  const ansEl   = document.getElementById(`ans-${i}`);
  const editArea = document.getElementById(`edit-area-${i}`);
  if (ansEl)    ansEl.hidden     = open;
  if (editArea) editArea.hidden  = !open;
  if (open) document.getElementById(`edit-ta-${i}`)?.focus();
}

// --- audio screen

function renderAudio(state) {
  const script = state.audioScenario?.audioScript;
  if (!script) return;
  const counter = document.getElementById('audio-counter');
  const stmt    = document.getElementById('audio-statement');
  const nextBtn = document.getElementById('btn-next-audio');
  const playBtn = document.getElementById('btn-play-statement');
  if (counter) counter.textContent = `${state.audioStep + 1} / ${script.length}`;
  if (stmt)    stmt.textContent = script[state.audioStep];
  const lbl = nextBtn?.querySelector('.btn-label');
  if (lbl) lbl.textContent = state.audioStep < script.length - 1 ? 'Next' : 'Finish';
  if (playBtn) playBtn.hidden = !speechSupported();
  if (speechSupported()) speak(script[state.audioStep]);
}

document.getElementById('btn-play-statement').addEventListener('click', () => {
  const s = getState();
  const script = s.audioScenario?.audioScript;
  if (script) speak(script[s.audioStep]);
});

document.getElementById('btn-next-audio').addEventListener('click', () => {
  stopAudio();
  const s = getState();
  const script = s.audioScenario?.audioScript;
  if (!script) return;
  if (s.audioStep < script.length - 1) setState({ audioStep: s.audioStep + 1 });
  else setState({ screen: 'completion' });
});

// --- completion

document.getElementById('btn-try-another').addEventListener('click', () => {
  setState({ screen: 'grid', scenario: null, step: 0, answers: ['', '', '', '', '', ''], activeSession: null });
});

document.getElementById('btn-redo').addEventListener('click', () => {
  setState({ screen: 'prompt', step: 0, answers: ['', '', '', '', '', ''], suggestionIndex: -1, activeSession: null });
});

// --- subscriptions

subscribe(state => {
  if (state.screen === 'prompt')   renderPrompt(state);
  if (state.screen === 'response') renderResponse(state);
  if (state.screen === 'timeline') renderTimeline(state);
  if (state.screen === 'audio')    renderAudio(state);
});

setState({ screen: 'grid' });
