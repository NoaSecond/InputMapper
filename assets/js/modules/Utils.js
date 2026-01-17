export class Utils {
    static capitalize(s) {
        if (s === 'xbox') return 'XBox';
        if (s === 'playstation') return 'PlayStation';
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
}
