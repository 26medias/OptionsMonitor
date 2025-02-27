class Gradient {
    constructor() {}

    // Returns an array of gradient colors.
    // options: { colors: [hex, hex, ...], count: number }
    array({ colors, count }) {
        if (count <= 1) {
            return [colors[0]];
        }
        const result = [];
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            result.push(this._getInterpolatedColor(colors, t));
        }
        return result;
    }

    // Returns a function that maps a value (between min and max) to a color.
    // options: { colors: [hex, hex, ...], min: number, max: number }
    factory({ colors, min, max }) {
        return (value) => {
            // Clamp value to [min, max]
            if (value < min) value = min;
            if (value > max) value = max;
            const t = (value - min) / (max - min);
            return this._getInterpolatedColor(colors, t);
        };
    }

    // Converts a hex color (e.g. "#e26053") to an {r, g, b} object.
    toRGB(hex) {
        // Remove the leading '#' if present.
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
            // Expand shorthand (e.g. "abc" -> "aabbcc")
            hex = hex.split('').map(ch => ch + ch).join('');
        }
        const intVal = parseInt(hex, 16);
        return {
            r: (intVal >> 16) & 255,
            g: (intVal >> 8) & 255,
            b: intVal & 255
        };
    }

    // Converts an {r, g, b} object to a hex color string.
    fromRGB({ r, g, b }) {
        const toHex = (n) => {
            const hex = n.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Wraps the text with ANSI escape codes for terminal color.
    // If hexColor is not provided, defaults to white.
    terminal(text, hexColor = '#ffffff', backgroundColor) {
        const { r, g, b } = this.toRGB(hexColor);
        const ansiForeground = `\x1b[38;2;${r};${g};${b}m`;
        let ansiBackground = '';
        if (backgroundColor) {
            const bgRGB = this.toRGB(backgroundColor);
            ansiBackground = `\x1b[48;2;${bgRGB.r};${bgRGB.g};${bgRGB.b}m`;
        }
        return `${ansiForeground}${ansiBackground}${text}\x1b[0m`;
    }

    invert(color) {
        const { r, g, b } = this.toRGB(color);
        return this.fromRGB({
            r: 255 - r,
            g: 255 - g,
            b: 255 - b
        });
    }

    // Private helper: interpolates between two numbers.
    _lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // Private helper: Given an array of hex colors and a normalized t (0..1),
    // returns the interpolated hex color.
    _getInterpolatedColor(colors, t) {
        const n = colors.length;
        if (t <= 0) return colors[0];
        if (t >= 1) return colors[n - 1];

        // Determine which segment of the gradient we're in.
        const totalSegments = n - 1;
        // t * totalSegments gives us a value in [0, totalSegments]
        let segment = Math.floor(t * totalSegments);
        if (segment >= totalSegments) {
            segment = totalSegments - 1;
        }
        const localT = (t * totalSegments) - segment;

        const startRGB = this.toRGB(colors[segment]);
        const endRGB = this.toRGB(colors[segment + 1]);

        const r = Math.round(this._lerp(startRGB.r, endRGB.r, localT));
        const g = Math.round(this._lerp(startRGB.g, endRGB.g, localT));
        const b = Math.round(this._lerp(startRGB.b, endRGB.b, localT));

        return this.fromRGB({ r, g, b });
    }
}