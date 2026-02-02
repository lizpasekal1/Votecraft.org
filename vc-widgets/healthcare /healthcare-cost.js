/**
 * Healthcare Cost by Income Widget JavaScript
 * Standalone widget version for embedding
 */

// DOM elements
const employmentBtns = document.querySelectorAll('#employment-selector .income-btn');
const incomeBtns = document.querySelectorAll('#income-selector .income-btn');
const incomeAmount = document.getElementById('income-amount');
const barYourShare = document.getElementById('bar-your-share');
const barEmployerShare = document.getElementById('bar-employer-share');
const barOopShare = document.getElementById('bar-oop-share');
const barRemaining = document.getElementById('bar-remaining');
const barLegend = document.getElementById('bar-legend');
const currentPct = document.getElementById('current-pct');
const currentDetail = document.getElementById('current-detail');
const universalPct = document.getElementById('universal-pct');
const universalDetail = document.getElementById('universal-detail');
const incomeImpact = document.getElementById('income-impact');
const costPremium = document.getElementById('cost-premium');
const costEmployer = document.getElementById('cost-employer');
const costOop = document.getElementById('cost-oop');
const costTotal = document.getElementById('cost-total');
const employerRow = document.getElementById('employer-row');
const healthcarePctLabel = document.getElementById('healthcare-pct-label');
const stateSelect = document.getElementById('state-select');

// Current state - null means nothing selected yet
let currentEmployment = null;
let currentIncome = null;
let currentState = 'expansion';
let previouslyShowedResults = false; // Track if results were previously shown

// Employment type data
const employmentData = {
    fulltime: {
        label: 'Full-Time W-2',
        employerPays: 17393,
        employeePays: 6575,
        outOfPocket: 3000,
        totalCost: 27000
    },
    parttime: {
        label: 'Part-Time (No Benefits)',
        employerPays: 0,
        employeePays: 15000,
        outOfPocket: 5000,
        totalCost: 20000
    },
    gig: {
        label: 'Gig/Contract (1099)',
        employerPays: 0,
        employeePays: 15000,
        outOfPocket: 5000,
        totalCost: 20000
    },
    minimum: {
        label: 'Minimum Wage (Retail/Service)',
        employerPays: 0,
        employeePays: 12000,
        outOfPocket: 4000,
        totalCost: 16000
    },
    laidoff: {
        label: 'Laid-Off (COBRA/Marketplace)',
        employerPays: 0,
        employeePays: 23968,
        outOfPocket: 4000,
        totalCost: 28000
    },
    quit: {
        label: 'Quit Job (Marketplace)',
        employerPays: 0,
        employeePays: 15000,
        outOfPocket: 5000,
        totalCost: 20000
    }
};

// Income labels
const incomeLabels = {
    0: '$0 (Unemployed)',
    20000: '$10-30K (avg $20K)',
    40000: '$30-50K (avg $40K)',
    75000: '$50-100K (avg $75K)',
    175000: '$100-250K (avg $175K)',
    350000: '$250-450K+ (avg $350K)'
};

// Calculate effective income based on employment type
// Quit = $0 income, Laid off = ~45% of previous income (unemployment benefits)
function getEffectiveIncome(employment, selectedIncome) {
    if (employment === 'quit') {
        return 0;
    }
    if (employment === 'laidoff') {
        // Unemployment benefits are roughly 45% of previous income, capped
        return Math.round(selectedIncome * 0.45);
    }
    return selectedIncome;
}

function getAdjustedCosts(employment, income, stateType, effectiveIncome) {
    const base = employmentData[employment];
    const nonEmployerTypes = ['parttime', 'gig', 'minimum', 'laidoff'];

    // Quit is NOT eligible for Medicaid (voluntarily left job)
    // Laid off IS eligible based on their unemployment income
    const medicaidEligible = (employment !== 'quit') &&
        (effectiveIncome === 0 || (effectiveIncome <= 20000 && nonEmployerTypes.includes(employment)));

    if (stateType === 'expansion' && medicaidEligible) {
        return {
            employerPays: 0,
            employeePays: 0,
            outOfPocket: 1500,
            totalCost: 1500,
            isMedicaid: true,
            isCoverageGap: false
        };
    } else if (stateType === 'non-expansion' && medicaidEligible) {
        return {
            employerPays: 0,
            employeePays: 0,
            outOfPocket: 12000,
            totalCost: 12000,
            isMedicaid: false,
            isCoverageGap: true
        };
    }

    return {
        employerPays: base.employerPays,
        employeePays: base.employeePays,
        outOfPocket: base.outOfPocket,
        totalCost: base.totalCost,
        isMedicaid: false,
        isCoverageGap: false
    };
}

function getInsight(income, employment, adjustedCosts, originalIncome) {
    const pct = income > 0 ? Math.round((adjustedCosts.totalCost / income) * 100) : 0;

    // Quit job - special case: $0 income but NOT eligible for Medicaid
    if (employment === 'quit') {
        const prevIncomeLabel = '$' + originalIncome.toLocaleString();
        return '<div class="insight-content"><strong>🪤 The Healthcare Trap</strong><p>You quit your ' + prevIncomeLabel + '/year job - but healthcare doesn\'t quit you. With $0 income, you still face $20K/year in marketplace costs. 😰 You voluntarily left, so you don\'t qualify for unemployment or (in most cases) Medicaid. Medical bills are the #1 cause of bankruptcy in America - 66% of all bankruptcies are tied to medical costs. This "job lock" keeps millions trapped in jobs they\'d leave if healthcare weren\'t tied to employment. 🔒</p></div>';
    }

    // Laid-off - income is now unemployment benefits (~45% of previous)
    if (employment === 'laidoff') {
        const prevIncomeLabel = '$' + originalIncome.toLocaleString();
        const unemploymentLabel = '$' + income.toLocaleString();
        if (adjustedCosts.isMedicaid) {
            return '<div class="insight-content"><strong>📉 Unemployment + Medicaid</strong><p>Your ' + prevIncomeLabel + '/year job is gone. Unemployment pays ~' + unemploymentLabel + '/year (45% of previous). ✨ The silver lining: you may now qualify for Medicaid in expansion states, with ~$1,500/year in out-of-pocket costs. Under a universal system, job loss wouldn\'t mean scrambling for coverage. 💚</p></div>';
        }
        if (adjustedCosts.isCoverageGap) {
            return '<div class="insight-content"><strong>🕳️ The Coverage Gap Nightmare</strong><p>Laid off from your ' + prevIncomeLabel + '/year job, you now receive ~' + unemploymentLabel + '/year in unemployment. 😱 In non-expansion states, you\'re trapped: too poor for ACA subsidies but don\'t qualify for Medicaid. You face $12K+ in uninsured costs while job hunting. ⚠️</p></div>';
        }
        return '<div class="insight-content"><strong>⚡ COBRA Shock</strong><p>Your ' + prevIncomeLabel + '/year job is gone. Unemployment pays ~' + unemploymentLabel + '/year - but COBRA costs $28K to keep your old insurance. 😵 That\'s ' + pct + '% of your reduced income! This is why job loss is the #1 cause of medical bankruptcy in America. 💔</p></div>';
    }

    // $0 income cases (selected $0 directly)
    if (income === 0) {
        if (adjustedCosts.isMedicaid) {
            return '<div class="insight-content"><strong>🛡️ Medicaid Safety Net</strong><p>With no income, you likely qualify for Medicaid in expansion states (eligibility varies - some require disability, pregnancy, or dependent children). 💊 Coverage includes copays, prescriptions, and some dental/vision gaps averaging ~$1,500/year. This is what healthcare could look like for everyone under a universal system. ✅</p></div>';
        } else if (adjustedCosts.isCoverageGap) {
            return '<div class="insight-content"><strong>🕳️ The Coverage Gap</strong><p>Even with $0 income, you may not qualify for Medicaid in non-expansion states (TX, FL, GA, WI, etc.). 😰 Without insurance, uninsured adults average $12K+ in annual medical costs when something goes wrong. About 2.2 million Americans are trapped in this gap. ⚠️</p></div>';
        }
        return '<div class="insight-content"><strong>⚠️ No Income Situation</strong><p>Without income, healthcare costs represent an infinite burden. This is why safety net programs exist. 🆘</p></div>';
    }

    // Medicaid/Coverage gap cases (low income, non-fulltime)
    if (adjustedCosts.isMedicaid) {
        return '<div class="insight-content"><strong>🛡️ Medicaid Safety Net</strong><p>In expansion states, adults earning up to 138% FPL ($20,783/year) likely qualify for Medicaid (eligibility varies by household). 💊 Even with Medicaid, copays, prescriptions, and coverage gaps average ~$1,500/year. Still, this is what healthcare could look like for everyone under a universal 8% income-based system. ✅</p></div>';
    }
    if (adjustedCosts.isCoverageGap) {
        return '<div class="insight-content"><strong>🕳️ The Coverage Gap Crisis</strong><p>In non-expansion states, you\'re trapped - too poor for ACA subsidies but don\'t qualify for Medicaid. 😰 Uninsured Americans average $12K+ in annual costs when medical issues arise. About 2.2 million Americans face this impossible situation. ⚠️</p></div>';
    }

    // Full-time employment cases
    if (employment === 'fulltime') {
        if (income <= 30000) {
            return '<div class="insight-content"><strong>😰 Crushing Burden</strong><p>Even with employer benefits, healthcare\'s TRUE cost ($27K including employer\'s hidden share) is ' + pct + '% of your income. 💸 That "hidden" employer contribution is money that could be your wages - the current system suppresses what you actually take home. 📉</p></div>';
        } else if (income <= 100000) {
            return '<div class="insight-content"><strong>🗜️ The Middle Squeeze</strong><p>Healthcare takes ' + pct + '% of income when you count the employer\'s "hidden" contribution. 👀 That $17K your employer pays is part of YOUR compensation - money that could be higher wages under a different system. 💭</p></div>';
        } else if (income <= 250000) {
            return '<div class="insight-content"><strong>📊 Getting Easier</strong><p>Healthcare is ' + pct + '% of income - more manageable at this level. 🤔 But you get the exact same coverage as someone paying 100%+ of their income. Same insurance, wildly different burden. ⚖️</p></div>';
        } else {
            return '<div class="insight-content"><strong>✨ A Lighter Burden</strong><p>Healthcare is just ' + pct + '% of your income. Same insurance, same coverage as a family earning $30K who pays 90%. 📊 The current system is deeply regressive - a flat 8% income tax would be far more equitable. ⚖️</p></div>';
        }
    }

    // Part-time and gig worker cases
    if (employment === 'parttime' || employment === 'gig') {
        if (income <= 30000) {
            return '<div class="insight-content"><strong>😱 Impossible Choice</strong><p>With no employer benefits, healthcare costs $20K/year - that\'s ' + pct + '% of your income! 💸 Full-time W-2 workers get $17K in hidden employer support you don\'t. Many gig workers simply go uninsured. 🚫</p></div>';
        } else if (income <= 100000) {
            return '<div class="insight-content"><strong>💰 The Gig Penalty</strong><p>Without employer help, you pay $20K for healthcare (' + pct + '% of income). 📊 A full-time W-2 worker at your income only pays $9,575 directly - their employer covers $17K invisibly. That\'s a $17K/year penalty for non-traditional work. ⚠️</p></div>';
        } else {
            return '<div class="insight-content"><strong>🏷️ The Self-Employment Tax</strong><p>Even at higher incomes, no employer benefits means paying the FULL $20K yourself (' + pct + '% of income). 💸 This hidden $17K/year penalty punishes entrepreneurship and gig work. 📉</p></div>';
        }
    }

    // Minimum wage cases
    if (currentState === 'non-expansion') {
        return '<div class="insight-content"><strong>🕳️ The Coverage Gap</strong><p>In non-expansion states, minimum wage workers often can\'t afford coverage. 😰 You may be too poor for ACA subsidies but not qualify for Medicaid - trapped with no good options. ⚠️</p></div>';
    }
    return '<div class="insight-content"><strong>📉 The Subsidy Cliff</strong><p>ACA subsidies help at minimum wage, but out-of-pocket costs ($16K total) still consume ' + pct + '% of your income. 💸 A universal 8% system would cut your costs dramatically. ✅</p></div>';
}

function updateDisplay() {
    // Get results section elements
    const incomeImpactDiv = document.getElementById('income-impact');

    // For $0 income, show results immediately (employment is irrelevant)
    // For other incomes, require both income AND employment selection
    const shouldShowResults = currentIncome === 0 || (currentIncome !== null && currentEmployment !== null);

    // Toggle grayed-out state and reset display when results shouldn't show
    if (!shouldShowResults) {
        incomeImpactDiv.classList.add('results-disabled');
        barLegend.classList.add('empty');

        // Reset all display values to initial state
        costPremium.textContent = '—';
        costOop.textContent = '—';
        costTotal.textContent = '—';
        costEmployer.textContent = '—';
        employerRow.style.display = 'none';
        incomeAmount.textContent = '—';
        healthcarePctLabel.textContent = '—';
        currentPct.textContent = '???';
        currentDetail.textContent = '';
        universalPct.textContent = '???';
        universalDetail.textContent = '';
        barYourShare.style.width = '0%';
        barEmployerShare.style.width = '0%';
        barOopShare.style.width = '0%';
        barRemaining.style.width = '100%';
        incomeImpact.innerHTML = '<strong>Select an income and employment type above to see healthcare cost breakdown.</strong>';

        // Show all legend items (grayed out via .empty class)
        const legendItems = barLegend.querySelectorAll('.legend-item');
        legendItems.forEach(item => item.style.display = 'flex');

        return;
    }

    incomeImpactDiv.classList.remove('results-disabled');
    barLegend.classList.remove('empty');

    // Scroll to results on mobile when user first completes their selection
    if (!previouslyShowedResults && window.innerWidth <= 430) {
        // Small delay to let the UI update first
        setTimeout(function() {
            window.parent.postMessage({ type: 'healthcare-scroll-results' }, '*');
        }, 100);
    }
    previouslyShowedResults = true;

    // For $0 income, use 'minimum' as default employment type (doesn't affect Medicaid calculation)
    const employmentForCalc = currentIncome === 0 ? 'minimum' : currentEmployment;

    // Calculate effective income (quit = $0, laid off = unemployment benefits)
    const effectiveIncome = currentIncome === 0 ? 0 : getEffectiveIncome(employmentForCalc, currentIncome);

    const adjustedCosts = getAdjustedCosts(employmentForCalc, currentIncome, currentState, effectiveIncome);
    const universalTax = Math.round(effectiveIncome * 0.08);

    let currentPctVal, universalPctVal;
    if (effectiveIncome === 0) {
        currentPctVal = adjustedCosts.totalCost > 0 ? Infinity : 0;
        universalPctVal = 0;
    } else {
        currentPctVal = Math.round((adjustedCosts.totalCost / effectiveIncome) * 100);
        universalPctVal = Math.round((universalTax / effectiveIncome) * 100);
    }
    const savingsAmt = adjustedCosts.totalCost - universalTax;

    // Update cost breakdown
    costPremium.textContent = '$' + adjustedCosts.employeePays.toLocaleString() + '/yr';
    costOop.textContent = '$' + adjustedCosts.outOfPocket.toLocaleString() + '/yr';
    costTotal.textContent = '$' + adjustedCosts.totalCost.toLocaleString() + '/yr';

    if (adjustedCosts.employerPays > 0) {
        employerRow.style.display = 'flex';
        costEmployer.textContent = '$' + adjustedCosts.employerPays.toLocaleString() + '/yr';
    } else {
        employerRow.style.display = 'none';
    }

    // Show effective income label (different for quit/laid-off)
    if (currentEmployment === 'quit') {
        incomeAmount.textContent = '$0 (Quit Job)';
    } else if (currentEmployment === 'laidoff') {
        incomeAmount.textContent = '$' + effectiveIncome.toLocaleString() + ' (Unemployment)';
    } else {
        incomeAmount.textContent = incomeLabels[currentIncome];
    }

    if (effectiveIncome === 0) {
        healthcarePctLabel.textContent = adjustedCosts.totalCost > 0 ? 'N/A' : '0%';
    } else {
        healthcarePctLabel.textContent = currentPctVal > 100 ? '>100%' : currentPctVal + '%';
    }

    let yourSharePct, employerSharePct, oopSharePct, totalHealthcarePct, remainingPct;
    if (effectiveIncome === 0) {
        yourSharePct = adjustedCosts.employeePays > 0 ? 33 : 0;
        employerSharePct = adjustedCosts.employerPays > 0 ? 34 : 0;
        oopSharePct = adjustedCosts.outOfPocket > 0 ? 33 : 0;
        totalHealthcarePct = 100;
        remainingPct = 0;
    } else {
        yourSharePct = Math.min(Math.round((adjustedCosts.employeePays / effectiveIncome) * 100), 100);
        employerSharePct = Math.min(Math.round((adjustedCosts.employerPays / effectiveIncome) * 100), 100);
        oopSharePct = Math.min(Math.round((adjustedCosts.outOfPocket / effectiveIncome) * 100), 100);
        totalHealthcarePct = Math.min(yourSharePct + employerSharePct + oopSharePct, 100);
        remainingPct = Math.max(100 - totalHealthcarePct, 0);
    }

    barYourShare.style.width = yourSharePct + '%';
    barOopShare.style.width = oopSharePct + '%';
    barRemaining.style.width = remainingPct + '%';

    // Change oop-share color to yellow for Medicaid coverage
    const oopLegendItem = barLegend.querySelectorAll('.legend-item')[2];
    const oopLegendDot = oopLegendItem.querySelector('.legend-dot');
    if (adjustedCosts.isMedicaid) {
        barOopShare.style.background = 'var(--yellow)';
        oopLegendDot.style.background = 'var(--yellow)';
        oopLegendItem.innerHTML = '<span class="legend-dot oop-share" style="background: var(--yellow)"></span> Medicaid Coverage';
    } else {
        barOopShare.style.background = 'var(--red)';
        oopLegendDot.style.background = 'var(--red)';
        oopLegendItem.innerHTML = '<span class="legend-dot oop-share"></span> Out-of-Pocket';
    }

    if (adjustedCosts.employerPays > 0) {
        barEmployerShare.style.width = employerSharePct + '%';
        barEmployerShare.style.display = 'block';
    } else {
        barEmployerShare.style.width = '0%';
        barEmployerShare.style.display = 'none';
    }

    // Show/hide legend items based on whether their segment is visible
    const legendItems = barLegend.querySelectorAll('.legend-item');
    const employerLegendItem = legendItems[0];
    const premiumLegendItem = legendItems[1];
    const oopLegendItemRef = legendItems[2];
    const remainingLegendItem = legendItems[3];

    employerLegendItem.style.display = adjustedCosts.employerPays > 0 ? 'flex' : 'none';
    premiumLegendItem.style.display = yourSharePct > 0 ? 'flex' : 'none';
    oopLegendItemRef.style.display = oopSharePct > 0 ? 'flex' : 'none';
    remainingLegendItem.style.display = remainingPct > 0 ? 'flex' : 'none';

    if (effectiveIncome === 0) {
        currentPct.textContent = adjustedCosts.totalCost > 0 ? 'N/A' : '$0';
        universalPct.textContent = '$0';
    } else {
        currentPct.textContent = currentPctVal + '%';
        universalPct.textContent = universalPctVal + '%';
    }
    currentDetail.textContent = '$' + adjustedCosts.totalCost.toLocaleString() + '/year';

    if (effectiveIncome === 0) {
        universalDetail.textContent = '$0/year (no income = no tax)';
    } else if (savingsAmt > 0) {
        universalDetail.textContent = '$' + universalTax.toLocaleString() + '/year (save $' + savingsAmt.toLocaleString() + ')';
    } else if (savingsAmt < 0) {
        universalDetail.textContent = '$' + universalTax.toLocaleString() + '/year';
    } else {
        universalDetail.textContent = '$' + universalTax.toLocaleString() + '/year (same cost)';
    }

    incomeImpact.innerHTML = getInsight(effectiveIncome, currentEmployment, adjustedCosts, currentIncome);

    // Toggle box color based on situation
    incomeImpactDiv.classList.remove('regressive', 'medicaid', 'affordable');
    if (adjustedCosts.isMedicaid) {
        incomeImpactDiv.classList.add('medicaid');
    } else if (currentEmployment === 'fulltime' && effectiveIncome > 100000) {
        // "Getting easier" and "A lighter burden" cases
        incomeImpactDiv.classList.add('affordable');
    } else {
        incomeImpactDiv.classList.add('regressive');
    }
}

function updateEmploymentAvailability() {
    if (currentIncome === null) {
        // No income selected yet, disable employment
        employmentBtns.forEach(btn => {
            btn.classList.add('disabled');
            btn.disabled = true;
        });
    } else if (currentIncome === 0) {
        employmentBtns.forEach(btn => {
            btn.classList.add('disabled');
            btn.disabled = true;
        });
    } else {
        employmentBtns.forEach(btn => {
            btn.classList.remove('disabled');
            btn.disabled = false;
        });
    }
}

function updateStateAvailability() {
    // For $0 income, state is always relevant (Medicaid check)
    // For other incomes, require employment selection first
    if (currentIncome === null) {
        stateSelect.disabled = true;
        stateSelect.style.opacity = '0.4';
        stateSelect.style.cursor = 'not-allowed';
        return;
    }

    // $0 income always qualifies for Medicaid check
    if (currentIncome === 0) {
        stateSelect.disabled = false;
        stateSelect.style.opacity = '1';
        stateSelect.style.cursor = 'pointer';
        return;
    }

    // For other incomes, require employment selection
    if (currentEmployment === null) {
        stateSelect.disabled = true;
        stateSelect.style.opacity = '0.4';
        stateSelect.style.cursor = 'not-allowed';
        return;
    }

    // Calculate effective income for laid-off scenario
    const effectiveIncome = getEffectiveIncome(currentEmployment, currentIncome);

    // Laid-off workers: state matters if their unemployment income qualifies for Medicaid
    // Quit workers: state doesn't matter (they don't qualify for Medicaid)
    // Others: state matters if low income and non-fulltime
    const medicaidRelevant = currentEmployment !== 'quit' &&
        currentEmployment !== 'fulltime' &&
        effectiveIncome <= 20000;

    if (medicaidRelevant) {
        stateSelect.disabled = false;
        stateSelect.style.opacity = '1';
        stateSelect.style.cursor = 'pointer';
    } else {
        stateSelect.disabled = true;
        stateSelect.style.opacity = '0.4';
        stateSelect.style.cursor = 'not-allowed';
    }
}

function updateIncomeAvailability() {
    incomeBtns.forEach(btn => {
        btn.classList.remove('disabled');
        btn.disabled = false;
    });
}

// Event handlers
employmentBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        if (this.disabled) return;
        employmentBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentEmployment = this.dataset.employment;
        updateIncomeAvailability();
        updateStateAvailability();
        updateDisplay();
    });
});

incomeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        if (this.disabled) return;
        const newIncome = parseInt(this.dataset.income);

        // If switching away from $0 to another income, clear employment selection
        // so user must re-select employment type
        if (currentIncome === 0 && newIncome !== 0) {
            currentEmployment = null;
            employmentBtns.forEach(b => b.classList.remove('active'));
        }

        incomeBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentIncome = newIncome;

        updateEmploymentAvailability();
        updateStateAvailability();
        updateDisplay();
    });
});

stateSelect.addEventListener('change', function() {
    currentState = this.value;
    updateDisplay();
});

// Reset demo function
function resetDemo() {
    // Clear selections
    currentEmployment = null;
    currentIncome = null;
    currentState = 'expansion';
    previouslyShowedResults = false; // Reset scroll tracking

    // Remove active states from buttons
    incomeBtns.forEach(btn => btn.classList.remove('active'));
    employmentBtns.forEach(btn => btn.classList.remove('active'));

    // Reset state selector
    stateSelect.value = 'expansion';

    // Update display
    updateEmploymentAvailability();
    updateStateAvailability();
    updateDisplay();

    // On mobile, scroll to top of widget
    if (window.innerWidth <= 430) {
        // Send message to parent to scroll to top of iframe
        window.parent.postMessage({ type: 'healthcare-scroll-top' }, '*');
    }
}

// Reset button event listener
const resetBtn = document.getElementById('reset-demo-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', resetDemo);
}

// Initialize
updateIncomeAvailability();
updateStateAvailability();
updateDisplay();
