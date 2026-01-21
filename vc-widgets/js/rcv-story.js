document.addEventListener('DOMContentLoaded', function() {
  let currentStage = 0;
  const totalStages = 4;

  // Initialize first stage animations
  setTimeout(() => animateCards(0), 300);

  // Change stage
  window.changeStage = function(direction) {
    let newStage = currentStage + direction;
    // Loop around
    if (newStage < 0) newStage = totalStages - 1;
    if (newStage >= totalStages) newStage = 0;

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
    document.getElementById('prevBtn').disabled = false;
    document.getElementById('nextBtn').textContent = 'Next \u2192';

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

    // Animate cycle diagram
    if (stage === 2) {
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

    // Animate final stage (slide 4)
    if (stage === 3) {
      const nums = document.querySelectorAll('.final-num');
      const message = document.querySelector('.stage[data-stage="3"] .final-message');

      // Reset
      nums.forEach(n => n.classList.remove('reveal'));
      if (message) message.classList.remove('reveal');

      // Animate numbers one by one
      nums.forEach((num, i) => {
        setTimeout(() => num.classList.add('reveal'), 200 + i * 300);
      });

      // Animate message after numbers
      if (message) {
        setTimeout(() => message.classList.add('reveal'), 1100);
      }
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

        // Update nav (always enabled for looping)
        document.getElementById('prevBtn').disabled = false;

        // Trigger animations
        setTimeout(() => animateCards(currentStage), 300);
      }
    });
  });
});
