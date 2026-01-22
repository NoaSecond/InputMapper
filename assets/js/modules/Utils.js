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
}
