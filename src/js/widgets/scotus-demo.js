/**
 * Supreme Court Interpretation Demo
 * Shows how the same constitutional text gets interpreted differently across eras
 */

class SCOTUSDemo {
    constructor() {
        this.clauseSelect = document.getElementById('clause-select');
        this.clauseText = document.getElementById('clause-text');
        this.eraButtons = document.querySelectorAll('.era-btn');
        this.eraLabel = document.getElementById('era-label');
        this.keyPhrase = document.getElementById('key-phrase');
        this.phraseMeaning = document.getElementById('phrase-meaning');
        this.caseName = document.getElementById('case-name');
        this.caseRuling = document.getElementById('case-ruling');
        this.impactContent = document.getElementById('impact-content');
        this.comparisonNote = document.getElementById('comparison-note');
        this.resetBtn = document.getElementById('reset-btn');

        this.currentClause = 'commerce';
        this.currentEra = 'early';

        this.data = this.getInterpretationData();

        this.init();
    }

    getInterpretationData() {
        return {
            'commerce': {
                text: '"[The Congress shall have Power] To regulate Commerce with foreign Nations, and among the several States, and with the Indian Tribes"',
                source: 'Article I, Section 8, Clause 3',
                comparisonNote: 'The same 16 words have been used to justify completely opposite outcomes - from blocking child labor laws to requiring wheelchair ramps in local businesses.',
                eras: {
                    early: {
                        label: 'Early Court (1800s-1930s)',
                        keyPhrase: '"Commerce among the states"',
                        meaning: 'Means only <strong>direct interstate trade</strong> - the actual buying and selling of goods across state lines',
                        caseName: 'United States v. E.C. Knight (1895)',
                        caseRuling: 'The Court ruled that manufacturing (sugar refining) was NOT commerce, even if products were later sold across state lines. Congress could not regulate a sugar monopoly because "commerce succeeds to manufacture, and is not a part of it."',
                        impact: [
                            'Federal government had very limited power to regulate business',
                            'Child labor laws struck down as unconstitutional',
                            'Workplace safety regulations blocked',
                            'States had primary authority over economic activity'
                        ]
                    },
                    middle: {
                        label: 'Mid-20th Century (1937-1995)',
                        keyPhrase: '"Commerce among the states"',
                        meaning: 'Means <strong>anything that affects interstate commerce</strong> - even purely local activities if they have an aggregate economic effect',
                        caseName: 'Wickard v. Filburn (1942)',
                        caseRuling: 'A farmer growing wheat for his own chickens affected interstate commerce because if many farmers did this, it would affect wheat prices. The Court said Congress can regulate activities that "exert a substantial economic effect on interstate commerce."',
                        impact: [
                            'Federal minimum wage laws upheld',
                            'Civil Rights Act of 1964 passed using commerce power',
                            'Environmental regulations expanded',
                            'Broad federal authority over economic matters'
                        ]
                    },
                    modern: {
                        label: 'Modern Court (1995-Present)',
                        keyPhrase: '"Commerce among the states"',
                        meaning: 'Means <strong>economic activity with substantial effects</strong> on interstate commerce - but with new limits on non-economic activity',
                        caseName: 'United States v. Lopez (1995)',
                        caseRuling: 'For the first time in 60 years, the Court struck down a law (Gun-Free School Zones Act) as exceeding commerce power. Possessing a gun near a school was not "economic activity" and had too tenuous a connection to commerce.',
                        impact: [
                            'Some limits restored on federal power',
                            'States regained authority over non-economic crimes',
                            'ACA individual mandate struck down under Commerce Clause',
                            'Ongoing debate about federal vs. state authority'
                        ]
                    }
                }
            },
            'equal-protection': {
                text: '"No State shall... deny to any person within its jurisdiction the equal protection of the laws"',
                source: '14th Amendment, Section 1 (1868)',
                comparisonNote: 'These 15 words went from permitting "separate but equal" segregation to requiring integration, then to debates over affirmative action - showing how interpretation shapes society.',
                eras: {
                    early: {
                        label: 'Early Interpretation (1896-1954)',
                        keyPhrase: '"Equal protection of the laws"',
                        meaning: 'Means <strong>equal treatment within separate systems</strong> - segregation is allowed if facilities are "equal"',
                        caseName: 'Plessy v. Ferguson (1896)',
                        caseRuling: 'The Court upheld Louisiana\'s law requiring separate railway cars for Black and white passengers. "Separate but equal" facilities did not violate equal protection because the amendment "could not have been intended to abolish distinctions based upon color."',
                        impact: [
                            'Jim Crow laws upheld across the South',
                            'Segregated schools, restaurants, and public facilities',
                            'Voting restrictions on Black Americans',
                            'Legal foundation for racial apartheid'
                        ]
                    },
                    middle: {
                        label: 'Civil Rights Era (1954-1970s)',
                        keyPhrase: '"Equal protection of the laws"',
                        meaning: 'Means <strong>no government-mandated racial separation</strong> - separate is inherently unequal',
                        caseName: 'Brown v. Board of Education (1954)',
                        caseRuling: 'The Court unanimously overturned Plessy, ruling that "separate educational facilities are inherently unequal." Segregation in public schools violated equal protection because it generated "a feeling of inferiority" that affected children\'s hearts and minds.',
                        impact: [
                            'School desegregation ordered nationwide',
                            'Foundation for Civil Rights Act of 1964',
                            'Struck down laws banning interracial marriage',
                            'Dismantled legal segregation'
                        ]
                    },
                    modern: {
                        label: 'Modern Era (1978-Present)',
                        keyPhrase: '"Equal protection of the laws"',
                        meaning: 'Means <strong>strict scrutiny of all racial classifications</strong> - even those designed to help minorities',
                        caseName: 'Students for Fair Admissions v. Harvard (2023)',
                        caseRuling: 'The Court struck down race-conscious college admissions, ruling that Harvard and UNC\'s programs violated equal protection. The majority said the 14th Amendment\'s "guarantee of equal protection cannot mean one thing when applied to one individual and something else when applied to a person of another color."',
                        impact: [
                            'Race-based affirmative action in college admissions ended',
                            'Debate over "colorblind" vs. race-conscious policies',
                            'Ongoing disputes over diversity initiatives',
                            'Questions about remedying historical discrimination'
                        ]
                    }
                }
            },
            'second-amendment': {
                text: '"A well regulated Militia, being necessary to the security of a free State, the right of the people to keep and bear Arms, shall not be infringed"',
                source: 'Second Amendment (1791)',
                comparisonNote: 'For 200+ years, courts said this protected state militias. In 2008, it became an individual right. Same 27 words, completely different meaning.',
                eras: {
                    early: {
                        label: 'Collective Rights View (1791-2008)',
                        keyPhrase: '"A well regulated Militia"',
                        meaning: 'The prefatory clause <strong>defines the purpose</strong> - this protects the right of states to maintain armed militias, not individual gun ownership',
                        caseName: 'United States v. Miller (1939)',
                        caseRuling: 'The Court upheld a ban on sawed-off shotguns, noting that such weapons had no "reasonable relationship to the preservation or efficiency of a well regulated militia." The Second Amendment must be interpreted in relation to militia service.',
                        impact: [
                            'Federal gun regulations widely upheld',
                            'States had broad authority to restrict firearms',
                            'No recognized individual right to own guns',
                            'Focus on collective/militia rights'
                        ]
                    },
                    middle: {
                        label: 'Transitional Period (1970s-2008)',
                        keyPhrase: '"the right of the people"',
                        meaning: 'Growing scholarly debate - does "the people" mean <strong>individuals</strong> (like in the 1st and 4th Amendments) or the collective citizenry?',
                        caseName: 'Various Circuit Court Cases',
                        caseRuling: 'Lower courts were split. Most continued following Miller\'s collective rights interpretation, but legal scholars and the NRA began arguing the Second Amendment protected individual rights. The Supreme Court declined to clarify for decades.',
                        impact: [
                            'Academic debate intensified',
                            'Gun rights advocacy grew',
                            'Federal assault weapons ban passed (1994)',
                            'State laws varied widely'
                        ]
                    },
                    modern: {
                        label: 'Individual Rights Era (2008-Present)',
                        keyPhrase: '"the right of the people to keep and bear Arms"',
                        meaning: 'The operative clause protects an <strong>individual right</strong> to possess firearms unconnected with militia service',
                        caseName: 'District of Columbia v. Heller (2008)',
                        caseRuling: 'In a 5-4 decision, the Court ruled the Second Amendment protects an individual right to keep handguns at home for self-defense. Justice Scalia wrote that the prefatory clause "announces a purpose" but does not limit the operative clause.',
                        impact: [
                            'Handgun bans struck down (D.C., Chicago)',
                            'Individual right extended to states',
                            'New "text, history, and tradition" test for gun laws',
                            'Many regulations now being challenged in courts'
                        ]
                    }
                }
            },
            'cruel-unusual': {
                text: '"Excessive bail shall not be required, nor excessive fines imposed, nor cruel and unusual punishments inflicted"',
                source: 'Eighth Amendment (1791)',
                comparisonNote: 'Does "cruel and unusual" mean what was cruel in 1791, or does it evolve? This debate shapes everything from the death penalty to prison conditions.',
                eras: {
                    early: {
                        label: 'Original Understanding (1791-1958)',
                        keyPhrase: '"cruel and unusual punishments"',
                        meaning: 'Means punishments that were considered <strong>barbaric in 1791</strong> - torture, burning at the stake, drawing and quartering',
                        caseName: 'In re Kemmler (1890)',
                        caseRuling: 'The Court upheld electrocution as a method of execution, noting the Eighth Amendment only prohibited "inhuman and barbarous" punishments like "burning at the stake, crucifixion, breaking on the wheel, or the like."',
                        impact: [
                            'Death penalty broadly permitted',
                            'Limited restrictions on punishment methods',
                            'No proportionality requirement',
                            'States had wide discretion'
                        ]
                    },
                    middle: {
                        label: 'Evolving Standards (1958-2000s)',
                        keyPhrase: '"cruel and unusual punishments"',
                        meaning: 'Must be interpreted according to <strong>"evolving standards of decency"</strong> that mark the progress of a maturing society',
                        caseName: 'Trop v. Dulles (1958)',
                        caseRuling: 'Chief Justice Warren wrote that the Eighth Amendment "must draw its meaning from the evolving standards of decency that mark the progress of a maturing society." Stripping citizenship as punishment was cruel because civilized nations don\'t render people stateless.',
                        impact: [
                            'Death penalty for rape struck down',
                            'Execution of intellectually disabled banned',
                            'Juvenile death penalty eliminated',
                            'Proportionality review required'
                        ]
                    },
                    modern: {
                        label: 'Current Debate (2000s-Present)',
                        keyPhrase: '"cruel and unusual punishments"',
                        meaning: 'Tension between <strong>originalism</strong> (fixed 1791 meaning) and <strong>living constitution</strong> (evolving standards)',
                        caseName: 'Bucklew v. Precythe (2019)',
                        caseRuling: 'Justice Gorsuch emphasized that the Eighth Amendment\'s meaning is "fixed" - it bans only methods of execution considered cruel in 1791. A prisoner must identify a known and available alternative method of execution if challenging lethal injection.',
                        impact: [
                            'Ongoing debate over death penalty methods',
                            'Solitary confinement challenges',
                            'Life without parole for juveniles limited',
                            'Interpretive philosophy affects outcomes'
                        ]
                    }
                }
            }
        };
    }

    init() {
        this.clauseSelect.addEventListener('change', () => this.handleClauseChange());

        this.eraButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleEraChange(btn.dataset.era));
        });

        this.resetBtn.addEventListener('click', () => this.reset());

        this.updateDisplay();
    }

    handleClauseChange() {
        this.currentClause = this.clauseSelect.value;
        this.currentEra = 'early';

        // Reset era buttons
        this.eraButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.era === 'early') {
                btn.classList.add('active');
            }
        });

        this.updateDisplay();
    }

    handleEraChange(era) {
        this.currentEra = era;

        // Update button states
        this.eraButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.era === era) {
                btn.classList.add('active');
            }
        });

        this.updateDisplay();
    }

    updateDisplay() {
        const clauseData = this.data[this.currentClause];
        const eraData = clauseData.eras[this.currentEra];

        // Update constitutional text
        this.clauseText.textContent = clauseData.text;
        this.clauseText.nextElementSibling.textContent = clauseData.source;

        // Update era label with color
        this.eraLabel.textContent = eraData.label;
        this.eraLabel.className = 'era-label ' + this.currentEra;

        // Update key phrase
        this.keyPhrase.textContent = eraData.keyPhrase;
        this.phraseMeaning.innerHTML = eraData.meaning;

        // Update case info
        this.caseName.textContent = eraData.caseName;
        this.caseRuling.textContent = eraData.caseRuling;

        // Update impact list
        const impactHtml = eraData.impact.map(item => `<li>${item}</li>`).join('');
        this.impactContent.innerHTML = `<ul>${impactHtml}</ul>`;

        // Update comparison note
        this.comparisonNote.querySelector('.note-text').textContent = clauseData.comparisonNote;

        // Animate the display
        const display = document.querySelector('.interpretation-display');
        display.style.animation = 'none';
        display.offsetHeight; // Trigger reflow
        display.style.animation = 'fadeIn 0.3s ease-out';
    }

    reset() {
        this.clauseSelect.value = 'commerce';
        this.currentClause = 'commerce';
        this.currentEra = 'early';

        this.eraButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.era === 'early') {
                btn.classList.add('active');
            }
        });

        this.updateDisplay();

        // Scroll to top of widget
        document.querySelector('.scotus-widget').scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SCOTUSDemo();
});
