import { InputMapper } from './InputMapper.js';

window.addEventListener('DOMContentLoaded', () => {
    window.app = new InputMapper();

    // Mobile warning logic
    const mobileWarning = document.getElementById('mobileWarning');
    const closeBtn = document.getElementById('closeWarning');
    if (closeBtn && mobileWarning) {
        closeBtn.addEventListener('click', () => {
            mobileWarning.style.display = 'none';
        });
    }
});
