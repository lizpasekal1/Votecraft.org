// Sound Toggle Functionality
// Manages sound state with three levels: on, down, off

// SVG paths for sound icons
const SOUND_ON_PATH = 'M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z';

const SOUND_DOWN_PATH = 'M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm320-122-42-42v-84q21 10 33.5 29t12.5 43q0 13-3.5 25.5T440-482Zm-40 126v-94l-72-72H200v80h114l86 86Zm-36-130Z';

const SOUND_OFF_PATH = 'M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Zm-8-232-58-58q17-31 25.5-65t8.5-70q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 53-14.5 102T784-288ZM650-422l-90-90v-130q47 22 73.5 66t26.5 96q0 15-2.5 29.5T650-422ZM480-592 376-696l104-104v208Zm-80 238v-94l-72-72H200v80h114l86 86Zm-36-130Z';

// Get sound state from localStorage (default: 'on')
// Returns 'on', 'down', or 'off'
function getSoundState() {
    const saved = localStorage.getItem('soundState');
    return saved === null ? 'on' : saved;
}

// Save sound state to localStorage
function setSoundState(state) {
    localStorage.setItem('soundState', state);
}

// Get volume level based on state
function getVolumeForState(state) {
    switch (state) {
        case 'on': return 1.0;
        case 'down': return 0.3;
        case 'off': return 0.0;
        default: return 1.0;
    }
}

// Update the icon based on sound state
function updateSoundIcon(button, state) {
    const path = button.querySelector('path');
    if (path) {
        let iconPath;
        switch (state) {
            case 'on':
                iconPath = SOUND_ON_PATH;
                break;
            case 'down':
                iconPath = SOUND_DOWN_PATH;
                break;
            case 'off':
                iconPath = SOUND_OFF_PATH;
                break;
            default:
                iconPath = SOUND_ON_PATH;
        }
        path.setAttribute('d', iconPath);
    }
}

// Initialize sound toggle button
function initSoundToggle() {
    const soundToggle = document.getElementById('soundToggle');
    if (!soundToggle) return;

    // Set initial state
    const soundState = getSoundState();
    updateSoundIcon(soundToggle, soundState);

    // Handle click - cycle through states: on -> down -> off -> on
    soundToggle.addEventListener('click', () => {
        const currentState = getSoundState();
        let newState;

        switch (currentState) {
            case 'on':
                newState = 'down';
                break;
            case 'down':
                newState = 'off';
                break;
            case 'off':
                newState = 'on';
                break;
            default:
                newState = 'on';
        }

        setSoundState(newState);
        updateSoundIcon(soundToggle, newState);

        // Dispatch custom event for other scripts to listen to
        window.dispatchEvent(new CustomEvent('soundToggle', {
            detail: {
                state: newState,
                volume: getVolumeForState(newState)
            }
        }));
    });
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSoundToggle);
} else {
    initSoundToggle();
}

// Export for use in other scripts
window.getSoundState = getSoundState;
window.getVolumeForState = getVolumeForState;
