(function() {
  let currentStage = 0;
  const totalStages = 4;

  // Initialize
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
    }

    // Trigger stage-specific animations
    if (currentStage === 1) {
      setTimeout(() => showEra('then'), 300);
    }
    if (currentStage === 3) {
      animateCycle();
    }
  };

  // Era slider
  window.showEra = function(era) {
    const thenPanel = document.getElementById('thenPanel');
    const nowPanel = document.getElementById('nowPanel');
    const thenBtn = document.querySelector('.then-btn');
    const nowBtn = document.querySelector('.now-btn');

    if (era === 'then') {
      thenPanel.classList.add('visible');
      thenPanel.classList.remove('slide-left');
      nowPanel.classList.remove('visible');
      thenBtn.classList.add('active');
      nowBtn.classList.remove('active');
      revealFlowItems(thenPanel);
    } else {
      thenPanel.classList.add('slide-left');
      thenPanel.classList.remove('visible');
      nowPanel.classList.add('visible');
      nowBtn.classList.add('active');
      thenBtn.classList.remove('active');
      revealFlowItems(nowPanel);
    }
  };

  function revealFlowItems(panel) {
    const items = panel.querySelectorAll('.flow-item');
    items.forEach((item, i) => {
      item.classList.remove('reveal');
      setTimeout(() => {
        item.classList.add('reveal');
      }, 300 + (i * 200));
    });
  }

  // Choice selection
  window.selectChoice = function(card, choice) {
    // Clear previous selections
    document.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    // Show result
    const resultDiv = document.getElementById('choiceResult');
    const resultText = document.getElementById('resultText');

    if (choice === 'raise') {
      resultText.innerHTML = `
        <strong>"It will hurt the economy!"</strong> they say.<br><br>
        Even if taxes go up, they're still lower than before the cuts.
        The wealthy already benefited from decades of reduced rates AND
        collected interest on the debt those cuts created.<br><br>
        <em>They already won.</em>
      `;
    } else {
      resultText.innerHTML = `
        <strong>"We can't afford to stop!"</strong> they say.<br><br>
        The government keeps borrowing. The debt grows.
        Interest payments balloon. And who holds that debt?
        Who collects those interest payments?<br><br>
        <em>The same people who got the tax cuts.</em>
      `;
    }

    resultDiv.classList.add('show');
  };

  // Cycle animation
  function animateCycle() {
    const nodes = document.querySelectorAll('.cycle-node');
    const arrows = document.querySelectorAll('.cycle-arrow');

    nodes.forEach((node, i) => {
      setTimeout(() => {
        node.classList.add('reveal');
      }, i * 400);
    });

    arrows.forEach((arrow, i) => {
      setTimeout(() => {
        arrow.classList.add('reveal');
      }, 200 + (i * 400));
    });
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

        // Trigger animations
        if (currentStage === 1) setTimeout(() => showEra('then'), 300);
        if (currentStage === 3) animateCycle();
      }
    });
  });
})();
