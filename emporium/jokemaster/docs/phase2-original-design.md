# Phase 2 Original Design - Two Column Layout with Hover Details

This document preserves the original Phase 2 design concept for potential future use.

## Layout Structure

Phase 2 used a two-column layout:
- **Left column**: 4 goal buttons stacked vertically
- **Right column**: Hover details area with "Hover for details" placeholder and "Select Goal" button

## HTML Structure

```html
<div class="popup-phase" id="phase2">
    <div class="story-intro-text">What's the big idea?</div>
    <div class="goal-selection-layout">
        <div class="goal-buttons-column">
            <button class="goal-option-btn" data-goal="eco-wellness" data-details="Sustainable, affordable housing integrated with community wellness facilities, mental health support, and green spaces designed to nurture healthy, connected communities.">Eco-wellness housing</button>
            <button class="goal-option-btn" data-goal="gaming-gym" data-details="Innovative facilities combining physical fitness with immersive gaming technology. Members level up their bodies while conquering digital worlds in a community setting.">Gaming gym centers</button>
            <button class="goal-option-btn" data-goal="democracy" data-details="A transformative civic engagement platform that increases voter participation, improves transparency, and empowers citizens to actively shape their community's future.">Democracy upgrade</button>
            <button class="goal-option-btn" data-goal="healthcare" data-details="Accessible Healthcare for all residents, ensuring everyone has the medical support they need regardless of income, with preventive care and mental health services.">Universal basic Healthcare</button>
        </div>
        <div class="goal-details-column">
            <div class="goal-details-content">
                <div class="goal-details-placeholder">Hover for details</div>
                <div class="goal-details-text" id="goalDetailsText"></div>
            </div>
            <button class="story-intro-btn confirm-goal-btn disabled" id="confirmGoalBtn">Select Goal</button>
        </div>
    </div>
</div>
```

## CSS Styles

```css
.goal-selection-layout {
    display: flex;
    gap: 24px;
    width: 100%;
    margin-bottom: 16px;
}

.goal-buttons-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 0 0 auto;
}

.goal-details-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    min-height: 120px;
    position: relative;
}

.goal-details-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.goal-details-placeholder {
    font-family: 'Cinzel', serif;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
}

.goal-details-text {
    font-family: 'Crimson Text', serif;
    font-size: 16px;
    color: white;
    line-height: 1.6;
    text-align: left;
    display: none;
    padding: 10px;
}

.goal-details-text.visible {
    display: block;
}

.confirm-goal-btn {
    margin-top: 12px;
    align-self: center;
    transition: opacity 0.3s ease;
}

.confirm-goal-btn.disabled {
    opacity: 0.3;
    pointer-events: none;
    cursor: not-allowed;
}
```

## JavaScript Behavior

```javascript
// Phase 2: Goal Selection - Handle goal button clicks and hover
const goalButtons = document.querySelectorAll('#phase2 .goal-option-btn');
const confirmGoalBtn = document.getElementById('confirmGoalBtn');
const goalDetailsText = document.getElementById('goalDetailsText');
const goalDetailsPlaceholder = document.querySelector('.goal-details-placeholder');

goalButtons.forEach(btn => {
    // Click handler
    btn.addEventListener('click', function() {
        // If clicking already selected button, deselect it
        if (this.classList.contains('selected')) {
            this.classList.remove('selected');
            selectedGoal = null;
            goalDetailsText.classList.remove('visible');
            if (goalDetailsPlaceholder) {
                goalDetailsPlaceholder.style.display = 'block';
            }
            confirmGoalBtn.classList.add('disabled');
        } else {
            // Remove selected class from all buttons
            goalButtons.forEach(b => b.classList.remove('selected'));
            // Add selected class to clicked button
            this.classList.add('selected');
            // Store selected goal
            selectedGoal = this.dataset.goal;

            // Show the description for the selected goal
            const details = this.dataset.details;
            if (details) {
                goalDetailsText.textContent = details;
                goalDetailsText.classList.add('visible');
                if (goalDetailsPlaceholder) {
                    goalDetailsPlaceholder.style.display = 'none';
                }
            }

            // Enable confirm button
            confirmGoalBtn.classList.remove('disabled');
        }
    });

    // Hover handlers for details (only when no goal is selected)
    btn.addEventListener('mouseenter', function() {
        // Only show on hover if no goal is selected
        if (!selectedGoal) {
            const details = this.dataset.details;
            if (details) {
                goalDetailsText.textContent = details;
                goalDetailsText.classList.add('visible');
                if (goalDetailsPlaceholder) {
                    goalDetailsPlaceholder.style.display = 'none';
                }
            }
        }
    });

    btn.addEventListener('mouseleave', function() {
        // Only hide on hover leave if no goal is selected
        if (!selectedGoal) {
            goalDetailsText.classList.remove('visible');
            if (goalDetailsPlaceholder) {
                goalDetailsPlaceholder.style.display = 'block';
            }
        }
    });
});

// Confirm Goal button
confirmGoalBtn.addEventListener('click', function() {
    if (selectedGoal) {
        transitionToPhase(3);
    }
});
```

## Key Features

1. **Two-column responsive layout**
2. **Hover descriptions** appear in right column
3. **Always visible button** that's disabled (30% opacity) when no selection
4. **"Hover for details" placeholder** that disappears when hovering/selecting
5. **Left-aligned description text**
6. **Button stays at bottom** of right column using flexbox space-between
7. **Deselection** by clicking selected button

## Use Cases for Future

This design works well for:
- Scenarios with longer descriptions that need more reading space
- When you want to encourage users to explore all options before selecting
- When the confirm action is a significant commitment
- Layouts where horizontal space is available
