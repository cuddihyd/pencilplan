class TimelineRenderer {
    constructor() {
        this.canvas = document.getElementById('timeline-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.pencil = null;
        this.data = null;
        this.margin = { top: 80, bottom: 60, left: 120, right: 60 };
        this.lineHeight = 40;
        this.textHeight = 12;
        
        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        this.canvas.width = 1200;
        this.canvas.height = 800;
        this.pencil = new PencilCanvas(this.canvas, {
            color: '#336699',
            thickness: 4,
            density: 0.5,
            alpha: 0.9
        });
    }

    setupEventListeners() {
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.loadFile(e.target.files[0]);
        });
        
        document.getElementById('render-timeline').addEventListener('click', () => {
            if (this.data) {
                this.renderTimeline();
            } else {
                alert('Please load a JSON file first');
            }
        });
        
        document.getElementById('clear-canvas').addEventListener('click', () => {
            this.clearCanvas();
        });

        this.loadDefaultData();
    }

    loadDefaultData() {
        fetch('input1.json')
            .then(response => response.json())
            .then(data => {
                this.data = data;
                this.renderTimeline();
            })
            .catch(err => {
                console.log('Could not load default input1.json');
            });
    }

    loadFile(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.data = JSON.parse(e.target.result);
                this.renderTimeline();
            } catch (err) {
                alert('Error parsing JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    parseDate(dateStr) {
        return new Date(dateStr);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    calculateTimelinePositions() {
        if (!this.data || !this.data.projectLines) return [];

        const startDate = this.parseDate(this.data.tbeg);
        const endDate = this.parseDate(this.data.tend);
        const totalDuration = endDate - startDate;
        
        const timelineWidth = this.canvas.width - this.margin.left - this.margin.right;
        
        const projects = this.data.projectLines.map(project => {
            const projStart = this.parseDate(project.tbeg);
            const projEnd = this.parseDate(project.tend);
            const projTailEnd = project.tailEnd ? this.parseDate(project.tailEnd) : null;
            
            const startRatio = (projStart - startDate) / totalDuration;
            const endRatio = (projEnd - startDate) / totalDuration;
            const tailEndRatio = projTailEnd ? (projTailEnd - startDate) / totalDuration : null;
            
            const x1 = this.margin.left + (startRatio * timelineWidth);
            const x2 = this.margin.left + (endRatio * timelineWidth);
            const x3 = projTailEnd ? this.margin.left + (tailEndRatio * timelineWidth) : null;
            
            return {
                ...project,
                x1: Math.round(x1),
                x2: Math.round(x2),
                x3: x3 ? Math.round(x3) : null,
                y: 0,
                startDate: projStart,
                endDate: projEnd,
                tailEndDate: projTailEnd
            };
        });

        return this.resolveCollisions(projects);
    }

    resolveCollisions(projects) {
        const sortedProjects = [...projects].sort((a, b) => a.startDate - b.startDate);
        const lanes = [];
        
        sortedProjects.forEach(project => {
            let laneIndex = 0;
            let placed = false;
            
            while (!placed) {
                if (!lanes[laneIndex]) {
                    lanes[laneIndex] = [];
                }
                
                const lane = lanes[laneIndex];
                let hasCollision = false;
                
                for (let existingProject of lane) {
                    if (this.hasOverlap(project, existingProject)) {
                        hasCollision = true;
                        break;
                    }
                }
                
                if (!hasCollision) {
                    lane.push(project);
                    project.y = this.margin.top + (laneIndex * this.lineHeight);
                    placed = true;
                } else {
                    laneIndex++;
                }
            }
        });
        
        return projects;
    }

    hasOverlap(project1, project2) {
        const buffer = 10;
        const p1End = project1.x3 || project1.x2;
        const p2End = project2.x3 || project2.x2;
        return !(p1End + buffer < project2.x1 || p2End + buffer < project1.x1);
    }

    renderTimeline() {
        this.clearCanvas();
        
        if (!this.data || !this.data.projectLines) return;

        const projects = this.calculateTimelinePositions();
        
        this.drawTopTimeline();
        this.drawTimeAxis();
        
        projects.forEach(project => {
            this.drawProjectLine(project);
            this.drawProjectLabel(project);
        });
    }

    drawTopTimeline() {
        const startDate = this.parseDate(this.data.tbeg);
        const endDate = this.parseDate(this.data.tend);
        const timelineWidth = this.canvas.width - this.margin.left - this.margin.right;
        const totalDuration = endDate - startDate;
        
        const y = 30;
        
        // Draw main timeline line
        this.ctx.strokeStyle = '#CCCCCC';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.margin.left, y);
        this.ctx.lineTo(this.margin.left + timelineWidth, y);
        this.ctx.stroke();
        
        // Generate year and quarter markers
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        
        for (let year = startYear; year <= endYear; year++) {
            // Year marker
            const yearStart = new Date(year, 0, 1);
            if (yearStart >= startDate && yearStart <= endDate) {
                const ratio = (yearStart - startDate) / totalDuration;
                const x = this.margin.left + (ratio * timelineWidth);
                
                // Draw year tick (longer)
                this.ctx.strokeStyle = '#CCCCCC';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 8);
                this.ctx.lineTo(x, y + 8);
                this.ctx.stroke();
                
                // Draw year label
                this.ctx.fillStyle = '#666666';
                this.ctx.font = 'bold 11px Arial, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(year.toString(), x, y - 15);
            }
            
            // Quarter markers
            for (let quarter = 1; quarter <= 4; quarter++) {
                const quarterMonth = (quarter - 1) * 3;
                const quarterStart = new Date(year, quarterMonth, 1);
                
                if (quarterStart >= startDate && quarterStart <= endDate && quarter > 1) {
                    const ratio = (quarterStart - startDate) / totalDuration;
                    const x = this.margin.left + (ratio * timelineWidth);
                    
                    // Draw quarter tick (shorter)
                    this.ctx.strokeStyle = '#DDDDDD';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y - 4);
                    this.ctx.lineTo(x, y + 4);
                    this.ctx.stroke();
                    
                    // Draw quarter label
                    this.ctx.fillStyle = '#AAAAAA';
                    this.ctx.font = '9px Arial, sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(`Q${quarter}`, x, y - 8);
                }
            }
        }
    }

    drawTimeAxis() {
        const startDate = this.parseDate(this.data.tbeg);
        const endDate = this.parseDate(this.data.tend);
        const timelineWidth = this.canvas.width - this.margin.left - this.margin.right;
        
        const y = this.canvas.height - this.margin.bottom + 20;
        
        this.drawPencilLine(this.margin.left, y, this.margin.left + timelineWidth, y, '#666666', 1);
        
        const numTicks = 5;
        for (let i = 0; i <= numTicks; i++) {
            const ratio = i / numTicks;
            const x = this.margin.left + (ratio * timelineWidth);
            const tickDate = new Date(startDate.getTime() + ratio * (endDate - startDate));
            
            this.drawPencilLine(x, y - 5, x, y + 5, '#666666', 1);
            
            this.ctx.fillStyle = '#333';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            const dateStr = tickDate.getFullYear() + '-' + 
                          String(tickDate.getMonth() + 1).padStart(2, '0');
            this.ctx.fillText(dateStr, x, y + 20);
        }
    }

    drawProjectLine(project) {
        const color = this.getColorHex(project.color || '#336699');
        const pressure = project.pencilPressure || this.data.pencilPressure || 0.85;
        const thickness = project.pencilThickness || 6;
        
        // Draw main line from start to end
        this.drawPencilLine(project.x1, project.y, project.x2, project.y, color, thickness, pressure);
        
        // Draw fading tail if tailEnd exists
        if (project.x3 && project.x3 > project.x2) {
            this.drawFadingTail(project.x2, project.y, project.x3, project.y, color, thickness, pressure);
        }
    }

    drawProjectLabel(project) {
        const text = project.name;
        const x = project.x1;
        const y = project.y - 8;
        
        this.drawHandwrittenText(text, x, y, '#000000', this.textHeight);
    }

    drawHandwrittenText(text, x, y, color = '#000000', size = 12) {
        this.ctx.save();
        
        const chars = text.split('');
        let currentX = x;
        const charSpacing = size * 0.6;
        
        chars.forEach((char, index) => {
            this.ctx.fillStyle = color;
            this.ctx.font = `${size}px "Permanent Marker", cursive`;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            
            this.ctx.fillText(char, currentX, y);
            currentX += charSpacing;
        });
        
        this.ctx.restore();
    }

    drawFadingTail(x1, y1, x2, y2, color = '#333333', thickness = 2, pressure = 1.0) {
        const tailLength = x2 - x1;
        const numSegments = Math.max(5, Math.floor(tailLength / 10));
        const segmentLength = tailLength / numSegments;
        
        for (let i = 0; i < numSegments; i++) {
            const startX = x1 + (i * segmentLength);
            const endX = x1 + ((i + 1) * segmentLength);
            const progress = i / numSegments;
            
            // Slower fade using square root curve - stays stronger longer
            const fadeRatio = Math.sqrt(1 - progress);
            
            const segmentPressure = pressure * fadeRatio;
            const segmentThickness = thickness * Math.max(0.4, fadeRatio);
            
            this.drawPencilLine(startX, y1, endX, y2, color, segmentThickness, segmentPressure);
        }
    }

    drawPencilLine(x1, y1, x2, y2, color = '#333333', thickness = 2, pressure = 1.0) {
        const originalColor = this.pencil.options.color;
        const originalThickness = this.pencil.options.thickness;
        const originalAlpha = this.pencil.options.alpha;
        
        this.pencil.options.color = color;
        this.pencil.options.thickness = thickness;
        this.pencil.options.alpha = originalAlpha * pressure;
        
        // Adjust number of strokes based on pressure
        const baseStrokes = 8;
        const numStrokes = Math.max(1, Math.round(baseStrokes * pressure));
        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const segmentLength = Math.min(15, distance / 4);
        
        for (let stroke = 0; stroke < numStrokes; stroke++) {
            const offsetY = (Math.random() - 0.5) * thickness * 0.3;
            const offsetX = (Math.random() - 0.5) * thickness * 0.1;
            
            // Skip some strokes randomly at lower pressure for more gaps
            if (Math.random() > pressure * 0.8) continue;
            
            for (let i = 0; i < distance; i += segmentLength) {
                const ratio1 = i / distance;
                const ratio2 = Math.min(1, (i + segmentLength) / distance);
                
                const startX = x1 + (x2 - x1) * ratio1 + offsetX;
                const startY = y1 + (y2 - y1) * ratio1 + offsetY;
                const endX = x1 + (x2 - x1) * ratio2 + offsetX;
                const endY = y1 + (y2 - y1) * ratio2 + offsetY;
                
                this.pencil._drawPencilStroke(startX, startY, endX, endY);
            }
        }
        
        this.pencil.options.color = originalColor;
        this.pencil.options.thickness = originalThickness;
        this.pencil.options.alpha = originalAlpha;
    }

    getColorHex(colorName) {
        const colors = {
            'red': '#CC3333',
            'blue': '#3366CC',
            'green': '#66CC33',
            'darkgreen': '#336633',
            'yellow': '#CCCC33',
            'orange': '#CC9933',
            'purple': '#9933CC',
            'violet': '#9933CC',
            'pink': '#CC3399',
            'brown': '#996633',
            'black': '#333333',
            'gray': '#666666',
            'grey': '#666666'
        };
        
        if (colorName.startsWith('#')) {
            return colorName;
        }
        
        return colors[colorName.toLowerCase()] || '#333333';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TimelineRenderer();
});