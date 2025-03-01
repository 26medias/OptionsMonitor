const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { PNG } = require('pngjs');

class NodeCanvas {
	constructor() {
		this.png = null;
		this.width = 0;
		this.height = 0;
		// Default to Photoshop's "normal" mode (i.e. standard source-over blending)
		this.blendMode("normal");
	}

	/**
	 * Sets the blend mode for subsequent drawing operations.
	 * Available modes:
	 * - "normal": standard alpha compositing (source-over).
	 * - "overwrite": simply replaces the pixel.
	 * @param {string} blendModeType
	 */
	blendMode(blendModeType) {
		this.currentBlendMode = blendModeType;
	}

	/**
	 * Initializes a new blank image with the given width and height,
	 * filled with the provided background color (default: opaque white).
	 * @param {number} width
	 * @param {number} height
	 * @param {object} color - {r, g, b, a}
	 */
	init(width, height, color = { r: 255, g: 255, b: 255, a: 255 }) {
		this.width = width;
		this.height = height;
		this.png = new PNG({ width, height });
		// Fill with the provided background color
		for (let i = 0; i < this.png.data.length; i += 4) {
			this.png.data[i] = color.r;
			this.png.data[i + 1] = color.g;
			this.png.data[i + 2] = color.b;
			this.png.data[i + 3] = color.a;
		}
	}

	/**
	 * Opens an existing PNG file and loads its data.
	 * @param {string} pngFilename - The path to the PNG file.
	 */
	async open(pngFilename) {
		return new Promise((resolve, reject) => {
			fs.createReadStream(pngFilename)
				.pipe(new PNG())
				.on('parsed', function () {
					resolve(this);
				})
				.on('error', (err) => reject(err));
		}).then((png) => {
			this.png = png;
			this.width = png.width;
			this.height = png.height;
		});
	}

	/**
	 * Saves the current image as a PNG file.
	 * If the directory does not exist, it will be created.
	 * @param {string} pngFilename - The file path to save the PNG.
	 */
	async save(pngFilename) {
		const dir = path.dirname(pngFilename);
		await fsp.mkdir(dir, { recursive: true });
		return new Promise((resolve, reject) => {
			const writeStream = fs.createWriteStream(pngFilename);
			this.png
				.pack()
				.pipe(writeStream)
				.on('finish', () => resolve(pngFilename))
				.on('error', (err) => reject(err));
		});
	}

	/**
	 * Draws a rectangle.
	 * @param {number} x - Top-left x-coordinate.
	 * @param {number} y - Top-left y-coordinate.
	 * @param {number} w - Width of the rectangle.
	 * @param {number} h - Height of the rectangle.
	 * @param {object} color - {r, g, b, a} color object.
	 * @param {boolean} fill - Whether to fill the rectangle.
	 * @param {number} thickness - Border thickness if not filled.
	 */
	rect(x, y, w, h, color, fill = true, thickness = 1) {
		if (fill) {
			for (let j = y; j < y + h; j++) {
				for (let i = x; i < x + w; i++) {
					this.setPixel(i, j, color);
				}
			}
		} else {
			// Top and bottom borders
			for (let t = 0; t < thickness; t++) {
				for (let i = x; i < x + w; i++) {
					this.setPixel(i, y + t, color);
					this.setPixel(i, y + h - 1 - t, color);
				}
			}
			// Left and right borders
			for (let t = 0; t < thickness; t++) {
				for (let j = y; j < y + h; j++) {
					this.setPixel(x + t, j, color);
					this.setPixel(x + w - 1 - t, j, color);
				}
			}
		}
	}

	/**
	 * Draws a circle.
	 * @param {number} x - Center x-coordinate.
	 * @param {number} y - Center y-coordinate.
	 * @param {number} r - Radius.
	 * @param {object} color - {r, g, b, a} color object.
	 * @param {boolean} fill - Whether to fill the circle.
	 * @param {number} thickness - Border thickness if not filled.
	 */
	circle(x, y, r, color, fill = true, thickness = 1) {
		const x0 = x;
		const y0 = y;
		const rSquared = r * r;

		if (fill) {
			for (let j = y0 - r; j <= y0 + r; j++) {
				for (let i = x0 - r; i <= x0 + r; i++) {
					const dx = i - x0;
					const dy = j - y0;
					if (dx * dx + dy * dy <= rSquared) {
						this.setPixel(i, j, color);
					}
				}
			}
		} else {
			for (let j = y0 - r - thickness; j <= y0 + r + thickness; j++) {
				for (let i = x0 - r - thickness; i <= x0 + r + thickness; i++) {
					const dx = i - x0;
					const dy = j - y0;
					const dist = Math.sqrt(dx * dx + dy * dy);
					if (Math.abs(dist - r) < thickness) {
						this.setPixel(i, j, color);
					}
				}
			}
		}
	}

	/**
	 * Draws a line using Bresenham's algorithm.
	 * Supports thickness by drawing parallel lines.
	 * @param {number} x1 - Start x-coordinate.
	 * @param {number} y1 - Start y-coordinate.
	 * @param {number} x2 - End x-coordinate.
	 * @param {number} y2 - End y-coordinate.
	 * @param {object} color - {r, g, b, a} color object.
	 * @param {number} thickness - Line thickness.
	 */
	line(x1, y1, x2, y2, color, thickness = 1) {
		const drawBasicLine = (x1, y1, x2, y2) => {
			x1 = Math.round(x1);
			y1 = Math.round(y1);
			x2 = Math.round(x2);
			y2 = Math.round(y2);
			let dx = Math.abs(x2 - x1);
			let dy = Math.abs(y2 - y1);
			let sx = x1 < x2 ? 1 : -1;
			let sy = y1 < y2 ? 1 : -1;
			let err = dx - dy;

			while (true) {
				this.setPixel(x1, y1, color);
				if (x1 === x2 && y1 === y2) break;
				let e2 = 2 * err;
				if (e2 > -dy) {
					err -= dy;
					x1 += sx;
				}
				if (e2 < dx) {
					err += dx;
					y1 += sy;
				}
			}
		};

		if (thickness <= 1) {
			drawBasicLine(x1, y1, x2, y2);
		} else {
			const dx = x2 - x1;
			const dy = y2 - y1;
			const len = Math.sqrt(dx * dx + dy * dy);
			if (len === 0) {
				this.setPixel(x1, y1, color);
				return;
			}
			const px = -dy / len;
			const py = dx / len;
			const half = Math.floor(thickness / 2);
			for (let offset = -half; offset <= half; offset++) {
				const offsetX = px * offset;
				const offsetY = py * offset;
				drawBasicLine(x1 + offsetX, y1 + offsetY, x2 + offsetX, y2 + offsetY);
			}
		}
	}

	/**
	 * Draws a spline (smooth curve) through the given points.
	 * Uses a Catmull-Rom spline interpolation.
	 * @param {Array} points - Array of objects [{x, y}, ...].
	 * @param {object} color - {r, g, b, a} color object.
	 * @param {number} thickness - Line thickness.
	 */
	spline(points, color, thickness = 1) {
		if (points.length < 2) return;

		const catmullRom = (p0, p1, p2, p3, t) => {
			const t2 = t * t;
			const t3 = t2 * t;
			return {
				x: 0.5 * (
					(2 * p1.x) +
					(-p0.x + p2.x) * t +
					(2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
					(-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
				),
				y: 0.5 * (
					(2 * p1.y) +
					(-p0.y + p2.y) * t +
					(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
					(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
				)
			};
		};

		const pts = [points[0], ...points, points[points.length - 1]];
		const interpolated = [];
		const steps = 20;

		for (let i = 0; i < pts.length - 3; i++) {
			for (let j = 0; j < steps; j++) {
				const t = j / steps;
				const p = catmullRom(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], t);
				interpolated.push(p);
			}
		}
		interpolated.push(points[points.length - 1]);

		for (let i = 0; i < interpolated.length - 1; i++) {
			this.line(
				interpolated[i].x,
				interpolated[i].y,
				interpolated[i + 1].x,
				interpolated[i + 1].y,
				color,
				thickness
			);
		}
	}

	write(x, y, text, color, options = { font: 'small' }) {
		// Small 3x5 font definition
		const smallFont = {
			'null':	[[0, 0, 0], [0, 0, 0], [0, 1, 0], [0, 0, 0], [0, 0, 0]],
			'0':	[[1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1]],
			'1':	[[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
			'2':	[[1, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 0], [1, 1, 1]],
			'3':	[[1, 1, 1], [0, 0, 1], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
			'4':	[[1, 0, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [0, 0, 1]],
			'5':	[[1, 1, 1], [1, 0, 0], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
			'6':	[[1, 1, 1], [1, 0, 0], [1, 1, 1], [1, 0, 1], [1, 1, 1]],
			'7':	[[1, 1, 1], [0, 0, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
			'8':	[[1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, 1], [1, 1, 1]],
			'9':	[[1, 1, 1], [1, 0, 1], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
			'%':	[[1, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], [0, 0, 1]],
			'.':	[[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 1, 0]],
			':':	[[0, 0, 0], [0, 1, 0], [0, 0, 0], [0, 1, 0], [0, 0, 0]],
			'/':	[[0, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], [0, 0, 0]],
			' ':	[[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]],
			'-':	[[0, 0, 0], [0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0]],
			'+':	[[0, 0, 0], [0, 1, 0], [1, 1, 1], [0, 1, 0], [0, 0, 0]],
			'A':	[[1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, 1], [1, 0, 1]],
			'B':	[[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 1], [1, 1, 1]],
			'C':	[[1, 1, 1], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 1, 1]],
			'D':	[[1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1]],
			'E':	[[1, 1, 1], [1, 0, 0], [1, 1, 1], [1, 0, 0], [1, 1, 1]],
			'F':	[[1, 1, 1], [1, 0, 0], [1, 1, 1], [1, 0, 0], [1, 0, 0]],
			'G':	[[1, 1, 1], [1, 0, 0], [1, 1, 1], [1, 0, 1], [1, 1, 1]],
			'H':	[[1, 0, 1], [1, 0, 1], [1, 1, 1], [1, 0, 1], [1, 0, 1]],
			'I':	[[1, 1, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1, 1]],
			'J':	[[0, 0, 1], [0, 0, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]],
			'K':	[[1, 0, 1], [1, 0, 1], [1, 1, 0], [1, 0, 1], [1, 0, 1]],
			'L':	[[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 1, 1]],
			'M':	[[1, 0, 1], [1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1]],
			'N':	[[1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1]],
			'O':	[[1, 1, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1]],
			'P':	[[1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 0, 0], [1, 0, 0]],
			'R':	[[1, 1, 1], [1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 1]],
			'S':	[[1, 1, 1], [1, 0, 0], [1, 1, 1], [0, 0, 1], [1, 1, 1]],
			'T':	[[1, 1, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
			'U':	[[1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1]],
			'V':	[[1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 0, 1], [0, 1, 0]],
			'W':	[[1, 0, 1], [1, 0, 1], [1, 0, 1], [1, 1, 1], [1, 0, 1]],
			'X':	[[1, 0, 1], [1, 0, 1], [0, 1, 0], [1, 0, 1], [1, 0, 1]],
			'Y':	[[1, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 0], [0, 1, 0]],
			'Z':	[[1, 1, 1], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 1]]
		};

		const scaleMatrix = (matrix, factor) => {
			const scaled = [];
			for (let row = 0; row < matrix.length; row++) {
				for (let r = 0; r < factor; r++) {
					const newRow = [];
					for (let col = 0; col < matrix[row].length; col++) {
						for (let c = 0; c < factor; c++) {
							newRow.push(matrix[row][col]);
						}
					}
					scaled.push(newRow);
				}
			}
			return scaled;
		};

		let activeFont;
		if (options.font && options.font.toLowerCase() === 'large') {
			activeFont = {};
			for (const key in smallFont) {
				if (smallFont.hasOwnProperty(key)) {
					activeFont[key] = scaleMatrix(smallFont[key], 2);
				}
			}
		} else {
			activeFont = smallFont;
		}

		let cursorX = 0;
		for (let i = 0; i < text.length; i++) {
			const ch = text[i].toUpperCase();
			const charMatrix = activeFont[ch] || activeFont['null'];
			for (let row = 0; row < charMatrix.length; row++) {
				for (let col = 0; col < charMatrix[row].length; col++) {
					if (charMatrix[row][col] === 1) {
						this.setPixel(x + cursorX + col, y + row, color);
					}
				}
			}
			cursorX += (charMatrix[0] ? charMatrix[0].length : 0) + 1;
		}
	}

	/**
	 * Converts a hex color string to an RGBA object.
	 * @param {string} hex - Hex color string (e.g., "ffcc00ff" or "#ffcc00ff").
	 * @returns {object} {r, g, b, a}
	 */
	hexToRgba(hex = "ffcc00ff") {
		if (hex.startsWith('#')) {
			hex = hex.slice(1);
		}
		if (hex.length === 6) {
			hex += "ff";
		}
		if (hex.length !== 8) {
			throw new Error("Invalid hex color format. Expected 6 or 8 hex digits.");
		}
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		const a = parseInt(hex.substring(6, 8), 16);
		return { r, g, b, a };
	}

	/**
	 * Converts RGBA values to a hex color string.
	 * @param {number} r - Red (0-255).
	 * @param {number} g - Green (0-255).
	 * @param {number} b - Blue (0-255).
	 * @param {number} a - Alpha (0-255).
	 * @returns {string} Hex color string (e.g., "7dff2dff").
	 */
	rgbaToHex(r, g, b, a) {
		const toHex = (n) => {
			let hex = n.toString(16);
			return hex.length === 1 ? '0' + hex : hex;
		};
		return toHex(r) + toHex(g) + toHex(b) + toHex(a);
	}

	/**
	 * Sets the pixel at (x, y) to the given color.
	 * In "normal" mode, this performs standard source-over (alpha compositing)
	 * so that drawing over an opaque background results in an opaque pixel.
	 * In "overwrite" mode, the pixel is simply replaced.
	 * @param {number} x - x-coordinate.
	 * @param {number} y - y-coordinate.
	 * @param {object} color - {r, g, b, a} color object.
	 */
	setPixel(x, y, color) {
		x = Math.round(x);
		y = Math.round(y);
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
		const idx = (this.width * y + x) << 2;

		if (this.currentBlendMode === 'normal') {
			// Standard source-over blending
			const srcA = color.a / 255;
			const dstA = this.png.data[idx + 3] / 255;
			const outA = srcA + dstA * (1 - srcA);
			if (outA > 0) {
				const outR = (color.r * srcA + this.png.data[idx] * dstA * (1 - srcA)) / outA;
				const outG = (color.g * srcA + this.png.data[idx + 1] * dstA * (1 - srcA)) / outA;
				const outB = (color.b * srcA + this.png.data[idx + 2] * dstA * (1 - srcA)) / outA;
				this.png.data[idx] = Math.round(outR);
				this.png.data[idx + 1] = Math.round(outG);
				this.png.data[idx + 2] = Math.round(outB);
				this.png.data[idx + 3] = Math.round(outA * 255);
			} else {
				this.png.data[idx] = 0;
				this.png.data[idx + 1] = 0;
				this.png.data[idx + 2] = 0;
				this.png.data[idx + 3] = 0;
			}
		} else {
			// Overwrite mode
			this.png.data[idx] = color.r;
			this.png.data[idx + 1] = color.g;
			this.png.data[idx + 2] = color.b;
			this.png.data[idx + 3] = color.a;
		}
	}
}

module.exports = NodeCanvas;

/*
// Example usage:

// The color below has an alpha of 10 (~4% opacity)
const color = { r: 74, g: 164, b: 154, a: 10 };
const c = new NodeCanvas();
// Create a 500x500 image with a white background
c.init(500, 500);

// Fill the background with opaque black using overwrite mode directly:
for (let y = 0; y < c.height; y++) {
	for (let x = 0; x < c.width; x++) {
		c.png.data[(c.width * y + x) << 2] = 0;
		c.png.data[((c.width * y + x) << 2) + 1] = 0;
		c.png.data[((c.width * y + x) << 2) + 2] = 0;
		c.png.data[((c.width * y + x) << 2) + 3] = 255;
	}
}

// With "normal" mode, drawing with a low-alpha color over opaque black
// results in a blended color (but still fully opaque)
c.line(10, 10, 490, 10, color, 1);
c.rect(10, 15, 490, 10, color, true);
c.save('test01.png');
*/
