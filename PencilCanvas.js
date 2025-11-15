/**
 * PencilCanvas Library for realistic pencil/crayon drawing on HTML Canvas.
 */
class PencilCanvas {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Default and user-defined options
        this.options = {
            color: options.color || '#000000',
            thickness: options.thickness || 3,
            density: options.density || 0.4, // Controls the amount of 'gaps'
            jiggle: options.jiggle || 1.5,    // Controls the randomness of the line
            alpha: options.alpha || 0.9,     // Base transparency
            ...options
        };

        this.isDrawing = false;
        this.isStraightLineMode = false;
        this.lastX = 0;
        this.lastY = 0;
        this.straightLineStartX = 0;
        this.straightLineStartY = 0;

        // Set initial context properties
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this._addEventListeners();
    }

    /**
     * Toggles the straight-line mode ON/OFF.
     */
    toggleStraightLineMode() {
        this.isStraightLineMode = !this.isStraightLineMode;
    }
    
    /**
     * Adds event listeners for mouse/touch drawing.
     */
    _addEventListeners() {
        // Mouse Events
        this.canvas.addEventListener('mousedown', this._startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this._draw.bind(this));
        this.canvas.addEventListener('mouseup', this._stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this._stopDrawing.bind(this));
        
        // Touch Events (Simplified for brevity)
        this.canvas.addEventListener('touchstart', (e) => this._startDrawing(e.touches[0]));
        this.canvas.addEventListener('touchmove', (e) => this._draw(e.touches[0]));
        this.canvas.addEventListener('touchend', this._stopDrawing.bind(this));
    }

    /**
     * Starts a new drawing stroke.
     */
    _startDrawing(e) {
        this.isDrawing = true;
        const { offsetX, offsetY } = this._getCoords(e);
        this.lastX = offsetX;
        this.lastY = offsetY;
        
        // Store start point for straight-line mode
        this.straightLineStartX = offsetX;
        this.straightLineStartY = offsetY;
    }

    /**
     * Stops the current drawing stroke.
     */
    _stopDrawing() {
        this.isDrawing = false;
    }

    /**
     * Gets coordinates from event object (handles mouse and touch).
     */
    _getCoords(e) {
        if (e.offsetX !== undefined && e.offsetY !== undefined) {
            return { offsetX: e.offsetX, offsetY: e.offsetY };
        }
        // Fallback for touch events
        const rect = this.canvas.getBoundingClientRect();
        return { 
            offsetX: e.clientX - rect.left, 
            offsetY: e.clientY - rect.top 
        };
    }

    /**
     * Draws the stroke while moving the cursor.
     */
    _draw(e) {
        if (!this.isDrawing) return;
        
        const { offsetX, offsetY } = this._getCoords(e);
        let currentX = offsetX;
        let currentY = offsetY;

        // --- Straight Line Mode Logic ---
        if (this.isStraightLineMode) {
            const dx = Math.abs(currentX - this.straightLineStartX);
            const dy = Math.abs(currentY - this.straightLineStartY);

            // Restrict motion to the axis with the greater distance
            if (dx > dy) {
                // Horizontal motion is dominant
                currentY = this.straightLineStartY; // Lock Y
            } else {
                // Vertical motion is dominant
                currentX = this.straightLineStartX; // Lock X
            }
        }
        
        this._drawPencilStroke(this.lastX, this.lastY, currentX, currentY);
        
        // Update last coordinates for the next segment
        this.lastX = currentX;
        this.lastY = currentY;
    }

    /**
     * The core function: Draws a textured, randomized line segment.
     * This achieves the "gradiation" and "pencil" look.
     */
    _drawPencilStroke(x1, y1, x2, y2) {
        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        // A minimum step size to ensure even texture on slow and fast strokes
        const step = Math.max(1, dist * this.options.density * 0.1); 

        for (let d = 0; d < dist; d += step) {
            // Calculate the current position along the segment (x1, y1) to (x2, y2)
            const ratio = d / dist;
            let currentX = x1 + (x2 - x1) * ratio;
            let currentY = y1 + (y2 - y1) * ratio;
            
            // Add randomness (jiggle) for the pencil texture
            const jiggleX = (Math.random() - 0.5) * this.options.jiggle * 2;
            const jiggleY = (Math.random() - 0.5) * this.options.jiggle * 2;
            currentX += jiggleX;
            currentY += jiggleY;

            // --- Apply Gradiation/Texture ---
            
            // Randomly vary the line width
            const randomThickness = this.options.thickness * (0.5 + Math.random() * 0.5); 
            
            // Randomly vary the transparency (alpha) to create 'gaps' and 'darker' spots
            const randomAlpha = this.options.alpha * (0.1 + Math.random() * 0.9);
            
            // Randomly vary the color slightly (color jitter) for a more organic feel
            const r = parseInt(this.options.color.substring(1, 3), 16);
            const g = parseInt(this.options.color.substring(3, 5), 16);
            const b = parseInt(this.options.color.substring(5, 7), 16);

            // Jitter the color slightly (e.g., +/- 15)
            const jitterAmount = 15;
            const jitterR = Math.max(0, Math.min(255, r + (Math.random() - 0.5) * jitterAmount));
            const jitterG = Math.max(0, Math.min(255, g + (Math.random() - 0.5) * jitterAmount));
            const jitterB = Math.max(0, Math.min(255, b + (Math.random() - 0.5) * jitterAmount));
            
            // Use HSL/RGB for the final color
            this.ctx.strokeStyle = `rgba(${Math.round(jitterR)}, ${Math.round(jitterG)}, ${Math.round(jitterB)}, ${randomAlpha})`;
            this.ctx.lineWidth = randomThickness;

            // Draw a tiny line segment (or dot)
            this.ctx.beginPath();
            
            // To ensure smooth connections, we draw from the last drawn *jiggle* point 
            // instead of the raw x1, y1. But for simplicity and maximum texture:
            this.ctx.moveTo(currentX, currentY); 
            this.ctx.lineTo(currentX + (Math.random()-0.5) * randomThickness * 0.5, currentY + (Math.random()-0.5) * randomThickness * 0.5);
            
            this.ctx.stroke();
        }
    }
}
