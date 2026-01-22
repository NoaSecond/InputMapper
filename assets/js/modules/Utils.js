import { ADAPTIVE_BG_SETTINGS } from './Config.js';

export class Utils {
    static capitalize(s) {
        if (s === 'xbox') return 'XBox';
        if (s === 'playstation') return 'PlayStation';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    static hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    static hexToHsl(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = "0x" + hex[1] + hex[1];
            g = "0x" + hex[2] + hex[2];
            b = "0x" + hex[3] + hex[3];
        } else if (hex.length === 7) {
            r = "0x" + hex[1] + hex[2];
            g = "0x" + hex[3] + hex[4];
            b = "0x" + hex[5] + hex[6];
        }
        r /= 255; g /= 255; b /= 255;
        let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin, h = 0, s = 0, l = 0;
        if (delta === 0) h = 0;
        else if (cmax === r) h = ((g - b) / delta) % 6;
        else if (cmax === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        l = (cmax + cmin) / 2;
        s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        s = +(s * 100).toFixed(1);
        l = +(l * 100).toFixed(1);
        return { h, s, l };
    }

    static getAdaptiveBackground(mainHex) {
        const { l } = this.hexToHsl(mainHex);

        // Binary background L: either lightL (25) or darkL (8)
        // If main color is dark (below threshold), background is lighter (lightL)
        // If main color is light (above threshold), background is darker (darkL)
        const bgL = l < ADAPTIVE_BG_SETTINGS.threshold ? ADAPTIVE_BG_SETTINGS.lightL : ADAPTIVE_BG_SETTINGS.darkL;
        const bgS = 0;
        const h = 0;

        // Grid stays white since background range is always dark
        const gridColor = `rgba(255, 255, 255, 0.05)`;

        return {
            bg: `hsl(${h}, ${bgS}%, ${bgL}%)`,
            grid: gridColor
        };
    }
}
