// ── Dragon Ranking Demo ─────────────────────────────────────────
// Chinese dragon silhouette that fluidly follows the mouse
// through illuminated manuscript text, with ember particles.

(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────────
  // 1.  MANUSCRIPT TEXT
  // ────────────────────────────────────────────────────────────────
  const STORY = `It was the third candle the abbess had confiscated, and Sable had nodded gravely each time and stolen another from the chapel stores. She kept reading by its unsteady light, hunched beneath her wool blanket in the scriptorium where the novices slept on straw pallets between the copying desks. It was the bestiary that held her. Not the psalter, not the gospels, not the lives of saints with their wooden sufferings. The bestiary. Some brother at Lindisfarne had painted it two centuries ago, and his creatures had a quality she could not name, a weight to them, as if they had been observed from life rather than copied from pattern books. His lions looked hungry. His basilisks looked bored. And his dragon, coiled in the lower margin of the forty-seventh leaf, looked like it was breathing. She had watched it for six nights before she was certain. The movement was slight, a swelling of the ribs, a settling, barely more than the flicker of candlelight thrown across the page. On the seventh night she held her breath and set her finger beside its painted flank, and it was warm. "You could simply ask," the dragon said. Sable jerked her hand back. The dragon opened one eye, yellow as egg yolk, and regarded her with an expression she recognised from the abbey cats: mild contempt for a creature too slow to be interesting but too close to ignore. "I am called Voss," it said. "Though the brother who painted me called me several other things, mostly under his breath, when I would not hold still."`;

  const body = document.getElementById('manuscript-body');
  const firstLetter = STORY[0];
  const rest = STORY.slice(1);
  body.innerHTML = `<span class="drop-cap">${firstLetter}</span>${rest}`;

  // ────────────────────────────────────────────────────────────────
  // 2.  SVG DRAGON (bold silhouette, Chinese style)
  // ────────────────────────────────────────────────────────────────
  const dragonSVG = document.getElementById('dragon-svg');

  dragonSVG.innerHTML = `
    <defs>
      <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffdd00"/>
        <stop offset="60%" stop-color="#ff8c00"/>
        <stop offset="100%" stop-color="#cc3300"/>
      </radialGradient>
      <filter id="dragonGlow">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- ═══ BODY — S-curve with coil ═══ -->
    <!-- Upper S: head down through body -->
    <path d="M220,68 Q260,85 262,130 Q260,170 230,195 Q200,218 195,250
             Q192,278 215,300 Q245,325 268,360 Q288,395 275,440 Q260,475 225,488"
      fill="none" stroke="#1a1008" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- The coil / loop -->
    <path d="M225,488 Q190,498 165,478 Q145,455 155,425
             Q168,395 200,380 Q230,368 240,345 Q248,322 230,300"
      fill="none" stroke="#1a1008" stroke-width="30" stroke-linecap="round"/>

    <!-- Tail -->
    <path d="M225,488 Q235,510 225,540 Q215,565 195,580
             Q175,592 160,605 Q148,618 155,628"
      fill="none" stroke="#1a1008" stroke-width="20" stroke-linecap="round"/>
    <!-- Tail tip -->
    <path d="M155,628 Q162,640 155,652 Q145,662 138,658
             Q132,650 140,640 Q148,632 155,628"
      fill="#1a1008"/>

    <!-- ═══ BELLY SEGMENTS ═══ -->
    <g fill="none" stroke="#e8dcc4" stroke-width="1.2" opacity="0.5">
      <path d="M235,90 Q225,95 218,88"/>
      <path d="M248,110 Q238,118 228,108"/>
      <path d="M252,135 Q240,144 230,132"/>
      <path d="M245,160 Q232,170 222,157"/>
      <path d="M232,185 Q218,195 210,182"/>
      <path d="M215,210 Q203,220 197,208"/>
      <path d="M205,235 Q195,244 190,232"/>
      <path d="M205,258 Q198,268 192,255"/>
      <path d="M218,280 Q210,290 202,278"/>
      <path d="M235,305 Q225,315 218,302"/>
      <path d="M252,330 Q240,340 232,328"/>
      <path d="M265,358 Q252,368 245,355"/>
      <path d="M272,388 Q258,398 252,385"/>
      <path d="M268,418 Q255,428 248,415"/>
      <path d="M255,448 Q242,458 235,445"/>
      <path d="M238,472 Q225,480 220,468"/>
      <path d="M228,505 Q218,512 212,500"/>
      <path d="M222,530 Q212,538 208,525"/>
      <path d="M210,555 Q200,562 195,550"/>
      <path d="M195,578 Q185,585 182,573"/>
      <path d="M175,600 Q168,606 165,595"/>
      <path d="M205,400 Q195,408 188,396"/>
      <path d="M185,425 Q175,432 170,420"/>
      <path d="M178,450 Q170,458 165,446"/>
      <path d="M188,470 Q180,478 175,466"/>
    </g>

    <!-- ═══ DORSAL SPIKES ═══ -->
    <g fill="#1a1008" stroke="none">
      <path d="M218,62 L208,42 L222,58Z"/>
      <path d="M230,60 L225,38 L238,56Z"/>
      <path d="M245,68 L248,45 L252,68Z"/>
      <path d="M260,85 L268,62 L265,88Z"/>
      <path d="M268,108 L280,88 L272,112Z"/>
      <path d="M268,135 L282,118 L272,140Z"/>
      <path d="M260,162 L275,148 L264,168Z"/>
      <path d="M248,182 L262,168 L252,188Z"/>
      <path d="M232,200 L244,185 L236,205Z"/>
      <path d="M215,218 L225,202 L220,222Z"/>
      <path d="M202,238 L210,220 L208,242Z"/>
      <path d="M228,308 L240,290 L235,312Z"/>
      <path d="M248,332 L262,315 L254,338Z"/>
      <path d="M265,360 L280,345 L270,365Z"/>
      <path d="M278,390 L295,375 L282,395Z"/>
      <path d="M278,420 L292,408 L280,425Z"/>
      <path d="M268,448 L280,438 L270,452Z"/>
      <path d="M248,460 L258,450 L250,465Z"/>
      <path d="M235,478 L242,468 L238,482Z"/>
      <path d="M230,500 L240,488 L232,505Z"/>
      <path d="M225,525 L235,512 L228,530Z"/>
      <path d="M215,550 L225,538 L218,555Z"/>
      <path d="M200,572 L210,560 L204,578Z"/>
      <path d="M180,595 L190,582 L184,600Z"/>
      <path d="M165,615 L172,602 L168,618Z"/>
    </g>

    <!-- ═══ HEAD ═══ -->
    <path d="M210,72 Q200,55 210,42 Q222,32 238,35
             Q252,40 258,55 Q262,68 255,82
             Q245,92 232,95 Q218,95 210,85Z"
      fill="#1a1008" filter="url(#dragonGlow)"/>

    <!-- Snout upper -->
    <path d="M255,58 Q272,48 285,52 Q292,58 288,66 Q280,72 260,72" fill="#1a1008"/>
    <!-- Snout lower (open mouth) -->
    <path d="M260,75 Q278,82 288,78 Q292,72 290,66" fill="#1a1008"/>
    <!-- Teeth -->
    <g fill="#e8dcc4">
      <path d="M268,66 L272,60 L275,66Z"/>
      <path d="M278,64 L280,57 L283,64Z"/>
      <path d="M270,72 L274,78 L277,72Z"/>
      <path d="M280,70 L282,76 L285,70Z"/>
    </g>

    <!-- Nostril glow -->
    <circle cx="284" cy="55" r="1.2" fill="#ff4400" opacity="0.4">
      <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite"/>
    </circle>

    <!-- Eye -->
    <ellipse cx="238" cy="55" rx="6" ry="5.5" fill="url(#eyeGrad)">
      <animate attributeName="ry" values="5.5;1;5.5" dur="5s" begin="3s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="239" cy="55" rx="2" ry="5" fill="#111">
      <animate attributeName="ry" values="5;0.5;5" dur="5s" begin="3s" repeatCount="indefinite"/>
    </ellipse>

    <!-- ═══ HORNS (flame-like, swept back) ═══ -->
    <g fill="#1a1008">
      <path d="M218,42 Q205,22 198,8 Q202,18 208,28 Q200,15 195,2 Q205,20 215,38Z"/>
      <path d="M238,38 Q245,18 250,5 Q248,20 242,30 Q252,12 258,0 Q248,22 240,36Z"/>
    </g>

    <!-- ═══ WHISKERS ═══ -->
    <g fill="none" stroke="#1a1008" stroke-width="2" stroke-linecap="round">
      <path d="M260,62 Q240,70 215,78 Q195,85 175,80">
        <animate attributeName="d"
          values="M260,62 Q240,70 215,78 Q195,85 175,80;
                  M260,62 Q240,73 215,82 Q195,88 178,85;
                  M260,62 Q240,70 215,78 Q195,85 175,80"
          dur="3s" repeatCount="indefinite"/>
      </path>
      <path d="M262,68 Q245,78 225,88 Q205,95 185,92">
        <animate attributeName="d"
          values="M262,68 Q245,78 225,88 Q205,95 185,92;
                  M262,68 Q245,82 225,92 Q205,100 188,98;
                  M262,68 Q245,78 225,88 Q205,95 185,92"
          dur="3.5s" repeatCount="indefinite"/>
      </path>
      <path d="M288,60 Q305,52 322,50 Q338,50 348,55">
        <animate attributeName="d"
          values="M288,60 Q305,52 322,50 Q338,50 348,55;
                  M288,60 Q305,48 322,46 Q338,45 350,48;
                  M288,60 Q305,52 322,50 Q338,50 348,55"
          dur="3.2s" repeatCount="indefinite"/>
      </path>
    </g>

    <!-- ═══ FRONT ARM ═══ -->
    <g>
      <path d="M250,155 Q270,162 280,175 Q288,188 282,195"
        fill="none" stroke="#1a1008" stroke-width="8" stroke-linecap="round"/>
      <path d="M282,195 Q290,188 295,180" fill="none" stroke="#1a1008" stroke-width="3" stroke-linecap="round"/>
      <path d="M282,195 Q292,192 298,186" fill="none" stroke="#1a1008" stroke-width="3" stroke-linecap="round"/>
      <path d="M282,195 Q292,198 298,194" fill="none" stroke="#1a1008" stroke-width="3" stroke-linecap="round"/>
      <path d="M282,195 Q288,205 294,202" fill="none" stroke="#1a1008" stroke-width="3" stroke-linecap="round"/>
      <circle cx="295" cy="179" r="1.5" fill="#1a1008"/>
      <circle cx="298" cy="185" r="1.5" fill="#1a1008"/>
      <circle cx="298" cy="193" r="1.5" fill="#1a1008"/>
      <circle cx="294" cy="201" r="1.5" fill="#1a1008"/>
    </g>

    <!-- ═══ BACK LEG ═══ -->
    <g>
      <path d="M170,445 Q148,455 135,470 Q128,482 135,488"
        fill="none" stroke="#1a1008" stroke-width="7" stroke-linecap="round"/>
      <path d="M135,488 Q128,482 122,478" fill="none" stroke="#1a1008" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M135,488 Q130,492 125,490" fill="none" stroke="#1a1008" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M135,488 Q132,496 127,496" fill="none" stroke="#1a1008" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M135,488 Q138,498 134,500" fill="none" stroke="#1a1008" stroke-width="2.5" stroke-linecap="round"/>
    </g>

    <!-- ═══ FLAME WISPS ═══ -->
    <g opacity="0.15">
      <path d="M288,58 Q310,45 320,50 Q315,55 305,52 Q315,48 325,52"
        fill="none" stroke="#ff4400" stroke-width="2" stroke-linecap="round">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
      </path>
    </g>
  `;

  // ────────────────────────────────────────────────────────────────
  // 3.  FLUID MOUSE-FOLLOWING
  // ────────────────────────────────────────────────────────────────
  // The dragon's position lerps toward the mouse each frame,
  // and it rotates to face its direction of travel.

  const dragon = dragonSVG;
  const dragonW = 180; // CSS width of the SVG
  const dragonH = dragonW * (700 / 400); // aspect ratio from viewBox

  // Current interpolated position & angle
  let dx = window.innerWidth / 2;
  let dy = window.innerHeight / 2;
  let mouseX = dx;
  let mouseY = dy;
  let angle = 0;
  let prevDx = dx;
  let prevDy = dy;
  let visible = false;

  // Track velocity for rotation
  let vx = 0;
  let vy = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      dx = mouseX;
      dy = mouseY;
    }
  });

  document.addEventListener('mouseleave', () => {
    visible = false;
  });

  // Lerp factor — lower = more fluid/laggy, higher = snappier
  const LERP = 0.06;
  const ANGLE_LERP = 0.08;

  function updateDragon() {
    // Smooth position
    dx += (mouseX - dx) * LERP;
    dy += (mouseY - dy) * LERP;

    // Velocity for rotation
    vx = dx - prevDx;
    vy = dy - prevDy;
    prevDx = dx;
    prevDy = dy;

    // Only update angle when there's meaningful movement
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 0.5) {
      // Angle: 0 = pointing up (dragon's default), rotate based on travel direction
      const targetAngle = Math.atan2(vx, -vy); // up = 0, right = pi/2
      // Smooth angle interpolation (handle wrapping)
      let diff = targetAngle - angle;
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      angle += diff * ANGLE_LERP;
    }

    // Position the dragon centered on the interpolated point
    // Offset so the head (top of SVG) is near the cursor
    const offsetX = dx - dragonW / 2;
    const offsetY = dy - 40; // head is near top of SVG

    dragon.style.left = offsetX + 'px';
    dragon.style.top = offsetY + 'px';
    dragon.style.transform = `rotate(${angle}rad)`;
    dragon.style.transformOrigin = `${dragonW / 2}px 40px`;
    dragon.style.opacity = visible ? '1' : '0';

    requestAnimationFrame(updateDragon);
  }

  updateDragon();

  // ────────────────────────────────────────────────────────────────
  // 4.  PARTICLE / EMBER SYSTEM
  // ────────────────────────────────────────────────────────────────
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const MAX_PARTICLES = 100;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  class Ember {
    constructor() {
      this.reset();
    }

    reset() {
      // Spawn near the dragon's current position (along its body)
      const bodyOffset = Math.random() * 200;
      this.x = dx + (Math.random() - 0.5) * 60;
      this.y = dy + bodyOffset * Math.cos(angle) + (Math.random() - 0.5) * 40;
      this.size = Math.random() * 3 + 0.8;
      this.speedX = vx * 0.3 + (Math.random() - 0.5) * 0.6;
      this.speedY = vy * 0.3 - (Math.random() * 0.8 + 0.2);
      this.life = 1.0;
      this.decay = Math.random() * 0.01 + 0.004;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.08;
      const hue = 15 + Math.random() * 35;
      const lightness = 48 + Math.random() * 22;
      this.color = `hsl(${hue}, 100%, ${lightness}%)`;
    }

    update() {
      this.x += this.speedX + Math.sin(this.life * 5) * 0.2;
      this.y += this.speedY;
      this.speedY -= 0.008;
      this.life -= this.decay;
      this.rotation += this.rotSpeed;
      if (this.life <= 0) this.reset();
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.life * 0.75;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.size * 3;
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
      ctx.restore();
    }
  }

  for (let i = 0; i < MAX_PARTICLES; i++) {
    const ember = new Ember();
    ember.life = Math.random();
    particles.push(ember);
  }

  // ────────────────────────────────────────────────────────────────
  // 5.  SCORCH MARKS
  // ────────────────────────────────────────────────────────────────
  const page = document.querySelector('.manuscript-page');
  [
    { top: '25%', left: '30%', size: 120 },
    { top: '50%', left: '60%', size: 100 },
    { top: '70%', left: '35%', size: 80 },
  ].forEach(({ top, left, size }) => {
    const el = document.createElement('div');
    el.className = 'scorch';
    el.style.top = top;
    el.style.left = left;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    page.appendChild(el);
  });

  // ────────────────────────────────────────────────────────────────
  // 6.  ANIMATION LOOP
  // ────────────────────────────────────────────────────────────────
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.update();
      p.draw(ctx);
    }
    requestAnimationFrame(animate);
  }
  animate();

})();
