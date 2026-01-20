document.addEventListener('DOMContentLoaded', function() {
  let currentStage = 0;
  const totalStages = 5;

  // Initialize first stage animations
  setTimeout(() => animateCards(0), 300);

  // Change stage
  window.changeStage = function(direction) {
    const newStage = currentStage + direction;
    if (newStage < 0 || newStage >= totalStages) return;

    // Hide current stage
    document.querySelector(`.stage[data-stage="${currentStage}"]`).classList.remove('active');
    document.querySelector(`.step-dot[data-step="${currentStage}"]`).classList.remove('active');
    document.querySelector(`.step-dot[data-step="${currentStage}"]`).classList.add('completed');

    // Show new stage
    currentStage = newStage;
    document.querySelector(`.stage[data-stage="${currentStage}"]`).classList.add('active');
    document.querySelector(`.step-dot[data-step="${currentStage}"]`).classList.add('active');
    document.querySelector(`.step-dot[data-step="${currentStage}"]`).classList.remove('completed');

    // Update navigation
    document.getElementById('prevBtn').disabled = currentStage === 0;
    document.getElementById('nextBtn').textContent = currentStage === totalStages - 1 ? 'Start Over \u21BB' : 'Next \u2192';

    if (currentStage === totalStages - 1) {
      document.getElementById('nextBtn').onclick = function() {
        location.reload();
      };
    } else {
      document.getElementById('nextBtn').onclick = function() {
        changeStage(1);
      };
    }

    // Trigger stage-specific animations
    setTimeout(() => animateCards(currentStage), 300);
  };

  function animateCards(stage) {
    // Animate problem cards
    if (stage === 0) {
      const cards = document.querySelectorAll('.problem-card');
      cards.forEach((card, i) => {
        card.classList.remove('reveal');
        setTimeout(() => {
          card.classList.add('reveal');
        }, i * 200);
      });
    }

    // Animate solution cards
    if (stage === 1) {
      const cards = document.querySelectorAll('.solution-card');
      cards.forEach((card, i) => {
        card.classList.remove('reveal');
        setTimeout(() => {
          card.classList.add('reveal');
        }, i * 200);
      });
    }

    // Animate comparison panels
    if (stage === 2) {
      const panels = document.querySelectorAll('.comparison-panel');
      panels.forEach((panel, i) => {
        panel.classList.remove('reveal');
        setTimeout(() => {
          panel.classList.add('reveal');
        }, i * 300);
      });
    }

    // Animate cycle diagram
    if (stage === 3) {
      const center = document.querySelector('.cycle-center');
      const nodes = document.querySelectorAll('.cycle-node');
      const arrows = document.querySelectorAll('.cycle-arrow');

      // Reset
      center.classList.remove('reveal');
      nodes.forEach(n => n.classList.remove('reveal'));
      arrows.forEach(a => a.classList.remove('reveal'));

      // Animate center first
      setTimeout(() => center.classList.add('reveal'), 100);

      // Animate nodes one by one
      nodes.forEach((node, i) => {
        setTimeout(() => node.classList.add('reveal'), 300 + i * 250);
      });

      // Animate arrows after nodes
      arrows.forEach((arrow, i) => {
        setTimeout(() => arrow.classList.add('reveal'), 1300 + i * 200);
      });
    }
  }

  // Click on progress dots to jump
  document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', function() {
      const targetStage = parseInt(this.dataset.step);
      const diff = targetStage - currentStage;
      if (diff !== 0) {
        // Update all dots
        document.querySelectorAll('.step-dot').forEach((d, i) => {
          d.classList.remove('active', 'completed');
          if (i < targetStage) d.classList.add('completed');
          if (i === targetStage) d.classList.add('active');
        });

        // Update stages
        document.querySelector(`.stage[data-stage="${currentStage}"]`).classList.remove('active');
        currentStage = targetStage;
        document.querySelector(`.stage[data-stage="${currentStage}"]`).classList.add('active');

        // Update nav
        document.getElementById('prevBtn').disabled = currentStage === 0;
        document.getElementById('nextBtn').textContent = currentStage === totalStages - 1 ? 'Start Over \u21BB' : 'Next \u2192';

        if (currentStage === totalStages - 1) {
          document.getElementById('nextBtn').onclick = function() {
            location.reload();
          };
        } else {
          document.getElementById('nextBtn').onclick = function() {
            changeStage(1);
          };
        }

        // Trigger animations
        setTimeout(() => animateCards(currentStage), 300);
      }
    });
  });
});
