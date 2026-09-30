export function initTheme() {
    const picker = document.querySelector('#accent-color-picker');
    if (!picker) return;

    const savedColor = localStorage.getItem('theme_accent_color') || '#b9ed5a';
    picker.value = savedColor;
    applyAccentColor(savedColor);
    initCustomColorPicker(picker, savedColor);

    picker.addEventListener('input', (e) => {
        applyAccentColor(e.target.value);
    });

    picker.addEventListener('change', (e) => {
        localStorage.setItem('theme_accent_color', e.target.value);
    });
}

function applyAccentColor(hexColor) {
    const root = document.documentElement;
    const rgbaGlow = hexToRgba(hexColor, 0.35);
    const borderGlow = hexToRgba(hexColor, 0.4);

    root.style.setProperty('--accent-red', hexColor);
    root.style.setProperty('--accent-red-hover', hexColor);
    root.style.setProperty('--accent-red-glow', rgbaGlow);
    root.style.setProperty('--border-glow', borderGlow);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', hexColor);
}

function initCustomColorPicker(picker, initialColor) {
    const wrapper = document.querySelector('.color-picker-wrapper');
    const trigger = document.querySelector('#accent-color-trigger');
    const panel = document.querySelector('#accent-color-popover');
    const closeButton = document.querySelector('#accent-color-close');
    const saturation = document.querySelector('#accent-color-saturation');
    const marker = saturation?.querySelector('.accent-saturation-marker');
    const hueInput = document.querySelector('#accent-color-hue');
    const hexInput = document.querySelector('#accent-color-hex');
    const rgbInputs = ['r', 'g', 'b'].map((channel) => document.querySelector(`#accent-color-${channel}`));
    const swatch = document.querySelector('.accent-color-swatch');
    if (!wrapper || !trigger || !panel || !saturation || !marker || !hueInput || !hexInput || rgbInputs.some((input) => !input)) return;

    let hsv = hexToHsv(initialColor);

    const render = (hex = hsvToHex(hsv)) => {
        const rgb = hexToRgb(hex);
        swatch.style.backgroundColor = hex;
        saturation.style.setProperty('--picker-hue', `${hsv.h}deg`);
        marker.style.left = `${hsv.s * 100}%`;
        marker.style.top = `${(1 - hsv.v) * 100}%`;
        saturation.setAttribute('aria-valuetext', `Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`);
        hueInput.value = String(Math.round(hsv.h));
        hexInput.value = hex;
        rgbInputs.forEach((input, index) => { input.value = String(rgb[index]); });
    };

    const updateColor = (commit = false) => {
        const hex = hsvToHex(hsv);
        render(hex);
        picker.value = hex;
        picker.dispatchEvent(new Event('input', { bubbles: true }));
        if (commit) picker.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const setFromHex = (hex, commit = false) => {
        if (!/^#?[\da-f]{6}$/i.test(hex)) return false;
        hsv = hexToHsv(hex.startsWith('#') ? hex : `#${hex}`);
        updateColor(commit);
        return true;
    };

    const setOpen = (open) => {
        panel.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
        if (open) hexInput.focus();
    };

    trigger.addEventListener('click', () => setOpen(panel.hidden));
    closeButton?.addEventListener('click', () => { setOpen(false); trigger.focus(); });
    document.addEventListener('pointerdown', (event) => {
        if (!panel.hidden && !wrapper.contains(event.target)) setOpen(false);
    });
    panel.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { setOpen(false); trigger.focus(); }
    });

    hueInput.addEventListener('input', () => {
        hsv.h = Number(hueInput.value);
        updateColor();
    });
    hueInput.addEventListener('change', () => updateColor(true));

    const updateSaturationFromPointer = (event) => {
        const bounds = saturation.getBoundingClientRect();
        hsv.s = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
        hsv.v = 1 - clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
        updateColor();
    };
    let activePointer = null;
    saturation.addEventListener('pointerdown', (event) => {
        activePointer = event.pointerId;
        saturation.setPointerCapture(activePointer);
        updateSaturationFromPointer(event);
    });
    saturation.addEventListener('pointermove', (event) => {
        if (event.pointerId === activePointer) updateSaturationFromPointer(event);
    });
    const finishPointer = (event) => {
        if (event.pointerId !== activePointer) return;
        activePointer = null;
        updateColor(true);
    };
    saturation.addEventListener('pointerup', finishPointer);
    saturation.addEventListener('pointercancel', finishPointer);
    saturation.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 0.1 : 0.02;
        if (event.key === 'ArrowLeft') hsv.s = clamp(hsv.s - step, 0, 1);
        else if (event.key === 'ArrowRight') hsv.s = clamp(hsv.s + step, 0, 1);
        else if (event.key === 'ArrowUp') hsv.v = clamp(hsv.v + step, 0, 1);
        else if (event.key === 'ArrowDown') hsv.v = clamp(hsv.v - step, 0, 1);
        else return;
        event.preventDefault();
        updateColor();
    });
    saturation.addEventListener('keyup', (event) => {
        if (event.key.startsWith('Arrow')) updateColor(true);
    });

    hexInput.addEventListener('input', () => {
        if (/^#?[\da-f]{6}$/i.test(hexInput.value)) setFromHex(hexInput.value);
    });
    hexInput.addEventListener('change', () => {
        if (!setFromHex(hexInput.value, true)) render();
    });
    rgbInputs.forEach((input, channelIndex) => {
        input.addEventListener('input', () => {
            if (input.value === '') return;
            const rgb = rgbInputs.map((channel) => clamp(Number(channel.value) || 0, 0, 255));
            rgb[channelIndex] = clamp(Number(input.value) || 0, 0, 255);
            hsv = hexToHsv(rgbToHex(rgb));
            updateColor();
        });
        input.addEventListener('change', () => updateColor(true));
    });
    panel.querySelectorAll('[data-accent-preset]').forEach((button) => {
        button.addEventListener('click', () => setFromHex(button.dataset.accentPreset, true));
    });

    render(initialColor);
}

function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function hexToHsv(hex) {
    const [red, green, blue] = hexToRgb(hex).map((channel) => channel / 255);
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    let hue = 0;
    if (delta) {
        if (max === red) hue = 60 * (((green - blue) / delta) % 6);
        else if (max === green) hue = 60 * ((blue - red) / delta + 2);
        else hue = 60 * ((red - green) / delta + 4);
    }
    return { h: (hue + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToHex({ h, s, v }) {
    const chroma = v * s;
    const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
    const match = v - chroma;
    const sector = Math.floor(h / 60) % 6;
    const channels = [
        [chroma, x, 0], [x, chroma, 0], [0, chroma, x],
        [0, x, chroma], [x, 0, chroma], [chroma, 0, x]
    ][sector].map((channel) => Math.round((channel + match) * 255));
    return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHex(rgb) {
    return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}