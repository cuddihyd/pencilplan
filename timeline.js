class TimelineRenderer {
    constructor() {
        this.canvas = document.getElementById('timeline-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.pencil = null;
        this.data = null;
        this.margin = { top: 120, bottom: 60, left: 120, right: 60 };
        this.lineHeight = 40;
        this.textHeight = 12;
        this.isPlaying = false;
        this.animationId = null;
        
        this.setupCanvas();
        this.setupEventListeners();
    }



    setupCanvas() {
        // Initial setup with default dimensions
        this.displayWidth = 1200;
        this.displayHeight = 800;
        
        this.resizeCanvas();
        
        this.pencil = new PencilCanvas(this.canvas, {
            color: '#336699',
            thickness: 2,
            density: 0.8,
            alpha: 0.9
        });
    }

    calculateRequiredDimensions() {
        if (!this.data) return { width: 1200, height: 800 };
        
        // Calculate required width (timeline span + margins)
        const requiredWidth = 1200; // Keep timeline width constant
        
        // Calculate required height based on themes
        const themes = this.getUniqueThemes();
        let totalHeight = this.margin.top + this.margin.bottom + 100; // Base height
        
        // Add height for each theme
        themes.forEach(theme => {
            const themeGroup = this.getThemeContent(theme);
            const labelHeight = this.calculateLabelHeight(theme);
            const contentHeight = this.calculateThemeContentHeight(themeGroup.projects, themeGroup.epics);
            const themeHeight = Math.max(labelHeight + 20, contentHeight + 40);
            totalHeight += themeHeight;
        });
        
        // Add extra buffer at the bottom
        const bottomBuffer = 200; // Increased buffer to ensure themes don't get cut off
        totalHeight += bottomBuffer;
        
        const finalHeight = Math.max(800, totalHeight); // Ensure adequate minimum height
        return { width: requiredWidth, height: finalHeight };
    }

    getThemeContent(themeName) {
        const themeGroup = { projects: [], epics: [] };
        
        // Get standalone projects for this theme
        if (this.data && this.data.projectLines && Array.isArray(this.data.projectLines)) {
            this.data.projectLines.forEach(project => {
                if (project && project.theme === themeName) {
                    themeGroup.projects.push(project);
                }
            });
        }
        
        // Get epics for this theme
        if (this.data && this.data.epics && Array.isArray(this.data.epics)) {
            this.data.epics.forEach(epic => {
                if (epic && epic.theme === themeName) {
                    themeGroup.epics.push(epic);
                }
            });
        }
        
        
        return themeGroup;
    }

    resizeCanvas() {
        const dimensions = this.calculateRequiredDimensions();
        this.displayWidth = dimensions.width;
        this.displayHeight = dimensions.height;
        
        // High resolution rendering
        const pixelRatio = window.devicePixelRatio || 1;
        const scaleFactor = 2;
        const totalScale = pixelRatio * scaleFactor;
        
        this.canvas.width = this.displayWidth * totalScale;
        this.canvas.height = this.displayHeight * totalScale;
        this.canvas.style.width = this.displayWidth + 'px';
        this.canvas.style.height = this.displayHeight + 'px';
        
        this.ctx.scale(totalScale, totalScale);
        this.scale = totalScale;
    }

    setupEventListeners() {
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.loadFile(e.target.files[0]);
        });
        
        document.getElementById('play-button').addEventListener('click', () => {
            this.startAnimation();
        });
        
        document.getElementById('stop-button').addEventListener('click', () => {
            this.stopAnimation();
        });
        
        document.getElementById('clear-canvas').addEventListener('click', () => {
            this.stopAnimation();
            this.clearCanvas();
        });

        this.loadDefaultData();
    }

    startAnimation() {
        if (!this.data) {
            alert('Please load a JSON file first');
            return;
        }
        
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        document.getElementById('play-button').disabled = true;
        document.getElementById('stop-button').disabled = false;
        
        const animate = () => {
            if (!this.isPlaying) return;
            
            this.renderTimeline();
            
            // Continue animation at ~10 FPS for visible scintillation
            this.animationId = setTimeout(() => {
                requestAnimationFrame(animate);
            }, 100);
        };
        
        animate();
    }

    stopAnimation() {
        this.isPlaying = false;
        
        if (this.animationId) {
            clearTimeout(this.animationId);
            this.animationId = null;
        }
        
        document.getElementById('play-button').disabled = false;
        document.getElementById('stop-button').disabled = true;
    }

    loadDefaultData() {
        fetch('input1.json')
            .then(response => response.json())
            .then(data => {
                this.data = data;
                // Resize canvas to fit content and render
                this.resizeCanvas();
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
                // Stop any current animation and resize canvas to fit content
                this.stopAnimation();
                this.resizeCanvas();
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
        this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
    }

    calculateTimelinePositions() {
        if (!this.data) return { projects: [], epics: [], themes: [] };

        const startDate = this.parseDate(this.data.tbeg);
        const endDate = this.parseDate(this.data.tend);
        const totalDuration = endDate - startDate;
        const timelineWidth = this.displayWidth - this.margin.left - this.margin.right;
        
        // Collect all unique themes
        const themes = this.getUniqueThemes();
        
        let allProjects = [];
        let epics = [];
        
        // Process standalone projects
        if (this.data.projectLines && Array.isArray(this.data.projectLines)) {
            const standaloneProjects = this.data.projectLines.map(project => 
                this.processProject(project, startDate, totalDuration, timelineWidth, null)
            );
            allProjects.push(...standaloneProjects);
        }
        
        // Process epics and their projects
        if (this.data.epics && Array.isArray(this.data.epics)) {
            this.data.epics.forEach((epic, epicIndex) => {
                if (epic && epic.projectLines && Array.isArray(epic.projectLines)) {
                    const epicProjects = epic.projectLines.map(project => {
                        const processedProject = this.processProject(project, startDate, totalDuration, timelineWidth, epicIndex);
                        // Inherit theme from epic if project doesn't have one
                        if (!processedProject.theme && epic.theme) {
                            processedProject.theme = epic.theme;
                        }
                        return processedProject;
                    });
                    allProjects.push(...epicProjects);
                
                    // Calculate epic boundaries
                    if (epicProjects.length > 0) {
                        const minX = Math.min(...epicProjects.map(p => p.x1));
                        const maxX = Math.max(...epicProjects.map(p => p.x3 || p.x2));
                        
                        epics.push({
                            name: epic.name,
                            theme: epic.theme,
                            projects: epicProjects,
                            x1: minX,
                            x2: maxX,
                            epicIndex: epicIndex,
                            pencilPressure: parseFloat(epic.pencilPressure) || this.data.pencilPressure || 0.85
                        });
                    }
                }
            });
        }
        
        const positionedData = this.resolveCollisionsWithThemes(allProjects, epics, themes);
        
        
        return positionedData;
    }

    getUniqueThemes() {
        const themes = new Set();
        
        // Collect themes from standalone projects
        if (this.data && this.data.projectLines && Array.isArray(this.data.projectLines)) {
            this.data.projectLines.forEach(project => {
                if (project && project.theme) {
                    themes.add(project.theme);
                }
            });
        }
        
        // Collect themes from epics
        if (this.data && this.data.epics && Array.isArray(this.data.epics)) {
            this.data.epics.forEach(epic => {
                if (epic && epic.theme) themes.add(epic.theme);
            });
        }
        
        const themeList = Array.from(themes).sort();
        return themeList;
    }

    processProject(project, startDate, totalDuration, timelineWidth, epicIndex) {
        const projStart = this.parseDate(project.tbeg);
        const projEnd = this.parseDate(project.tend);
        const projTailEnd = project.tailEnd ? this.parseDate(project.tailEnd) : null;
        
        // Validate date ranges
        if (projEnd < projStart) {
            throw new Error(`Invalid date range for project "${project.name}": end date (${project.tend}) is before start date (${project.tbeg})`);
        }
        
        if (projTailEnd && projTailEnd <= projEnd) {
            throw new Error(`Invalid tailEnd for project "${project.name}": tailEnd (${project.tailEnd}) must be after tend (${project.tend})`);
        }
        
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
            tailEndDate: projTailEnd,
            epicIndex: epicIndex
        };
    }

    resolveCollisionsWithThemes(projects, epics, themes) {
        const themeData = [];
        
        
        // First pass: group projects and epics by theme
        const themeGroups = {};
        
        // Group standalone projects by theme
        projects.forEach(project => {
            const theme = project.theme || 'Default';
            if (!themeGroups[theme]) {
                themeGroups[theme] = { projects: [], epics: [] };
            }
            themeGroups[theme].projects.push(project);
        });
        
        // Group epics by theme
        epics.forEach(epic => {
            const theme = epic.theme || 'Default';
            if (!themeGroups[theme]) {
                themeGroups[theme] = { projects: [], epics: [] };
            }
            themeGroups[theme].epics.push(epic);
        });
        
        // Calculate theme heights and positions
        let currentY = this.margin.top;
        
        themes.forEach(theme => {
            const group = themeGroups[theme] || { projects: [], epics: [] };
            // Calculate required height for this theme
            const labelHeight = this.calculateLabelHeight(theme);
            const contentHeight = this.calculateThemeContentHeight(group.projects, group.epics);
            const themeHeight = Math.max(labelHeight + 20, contentHeight + 40); // 40px padding
            
            const themeObj = {
                name: theme,
                y: currentY,
                height: themeHeight,
                projects: [],
                epics: group.epics
            };
            
            // Position projects within this theme
            let projectY = currentY + 20; // Top padding
            group.projects.forEach(project => {
                project.y = projectY;
                projectY += this.lineHeight;
                themeObj.projects.push(project);
            });
            
            // Update epic boundaries for this theme  
            group.epics.forEach(epic => {
                const epicProjects = epic.projects;
                if (epicProjects.length > 0) {
                    // Position epic projects within the theme
                    epicProjects.forEach(epicProject => {
                        // Find the project in allProjects and update its position
                        const projectInAll = projects.find(p => p === epicProject);
                        if (projectInAll) {
                            projectInAll.y = projectY;
                        }
                        epicProject.y = projectY;
                        
                        // Add epic project to theme's project list for rendering
                        themeObj.projects.push(epicProject);
                        
                        projectY += this.lineHeight;
                    });
                    
                    const projectYs = epicProjects.map(p => p.y);
                    epic.minY = Math.min(...projectYs);
                    epic.maxY = Math.max(...projectYs);
                }
            });
            
            themeData.push(themeObj);
            currentY += themeHeight;
        });
        
        // Collect all positioned projects from all themes
        const allPositionedProjects = [];
        themeData.forEach(theme => {
            allPositionedProjects.push(...theme.projects);
        });
        
        
        return { projects: allPositionedProjects, epics, themes: themeData };
    }

    calculateLabelHeight(themeName) {
        // Estimate height needed for vertical label with line breaks
        const words = themeName.split(' ');
        const maxWordsPerLine = 2;
        const lines = Math.ceil(words.length / maxWordsPerLine);
        return lines * 20; // Approximate 20px per line
    }

    calculateThemeContentHeight(projects, epics) {
        let totalLines = Array.isArray(projects) ? projects.length : 0;
        
        // Add lines for epic projects
        if (Array.isArray(epics)) {
            epics.forEach(epic => {
                if (epic && epic.projects && Array.isArray(epic.projects)) {
                    totalLines += epic.projects.length;
                }
            });
        }
        
        return Math.max(80, totalLines * this.lineHeight); // Minimum 80px
    }

    resolveCollisions(projects) {
        const sortedProjects = [...projects].sort((a, b) => a.startDate - b.startDate);
        const lanes = [];
        const epicBoxes = [];
        
        // First pass: place epic projects in consecutive lanes
        const epicGroups = {};
        projects.forEach(project => {
            if (project.epicIndex !== null) {
                if (!epicGroups[project.epicIndex]) {
                    epicGroups[project.epicIndex] = [];
                }
                epicGroups[project.epicIndex].push(project);
            }
        });
        
        // Place epic groups first with spacing between them
        let currentLane = 0;
        Object.keys(epicGroups).forEach(epicIndex => {
            const epicProjects = epicGroups[epicIndex].sort((a, b) => a.startDate - b.startDate);
            let epicStartLane = Math.max(currentLane, this.findAvailableLaneRange(lanes, epicProjects.length));
            
            epicProjects.forEach((project, index) => {
                const laneIndex = epicStartLane + index;
                if (!lanes[laneIndex]) {
                    lanes[laneIndex] = [];
                }
                lanes[laneIndex].push(project);
                project.y = this.margin.top + (laneIndex * this.lineHeight);
            });
            
            // Record epic box boundaries for collision avoidance
            const minX = Math.min(...epicProjects.map(p => p.x1));
            const maxX = Math.max(...epicProjects.map(p => p.x3 || p.x2));
            const minY = this.margin.top + (epicStartLane * this.lineHeight) - 35;
            const maxY = this.margin.top + ((epicStartLane + epicProjects.length - 1) * this.lineHeight) + 15;
            
            epicBoxes.push({ minX, maxX, minY, maxY });
            
            // Leave 2 lanes of space after each epic for separation
            currentLane = epicStartLane + epicProjects.length + 2;
        });
        
        // Second pass: place standalone projects avoiding epic boxes
        const standaloneProjects = projects.filter(p => p.epicIndex === null);
        standaloneProjects.forEach(project => {
            let laneIndex = 0;
            let placed = false;
            
            while (!placed) {
                if (!lanes[laneIndex]) {
                    lanes[laneIndex] = [];
                }
                
                const proposedY = this.margin.top + (laneIndex * this.lineHeight);
                let hasCollision = false;
                
                // Check collision with existing projects in lane
                for (let existingProject of lanes[laneIndex]) {
                    if (this.hasOverlap(project, existingProject)) {
                        hasCollision = true;
                        break;
                    }
                }
                
                // Check collision with epic boxes
                if (!hasCollision) {
                    for (let box of epicBoxes) {
                        if (this.projectCollidesWithEpicBox(project, proposedY, box)) {
                            hasCollision = true;
                            break;
                        }
                    }
                }
                
                if (!hasCollision) {
                    lanes[laneIndex].push(project);
                    project.y = proposedY;
                    placed = true;
                } else {
                    laneIndex++;
                }
            }
        });
        
        return projects;
    }
    
    findAvailableLaneRange(lanes, neededLanes) {
        let startLane = 0;
        while (true) {
            let available = true;
            for (let i = 0; i < neededLanes; i++) {
                if (lanes[startLane + i] && lanes[startLane + i].length > 0) {
                    available = false;
                    break;
                }
            }
            if (available) return startLane;
            startLane++;
        }
    }
    
    projectCollidesWithEpicBox(project, projectY, epicBox) {
        const projectMinX = project.x1;
        const projectMaxX = project.x3 || project.x2;
        const buffer = 10;
        
        // Check horizontal overlap
        const horizontalOverlap = !(projectMaxX + buffer < epicBox.minX || projectMinX - buffer > epicBox.maxX);
        
        // Check vertical overlap
        const verticalOverlap = !(projectY + 15 < epicBox.minY || projectY - 15 > epicBox.maxY);
        
        return horizontalOverlap && verticalOverlap;
    }

    hasOverlap(project1, project2) {
        const buffer = 10;
        const p1End = project1.x3 || project1.x2;
        const p2End = project2.x3 || project2.x2;
        return !(p1End + buffer < project2.x1 || p2End + buffer < project1.x1);
    }

    renderTimeline() {
        this.clearCanvas();
        
        
        if (!this.data) return;

        const { projects, epics, themes } = this.calculateTimelinePositions();
        
        this.drawTopTimeline();
        
        // Draw theme swim lanes
        themes.forEach(theme => {
            this.drawThemeLane(theme);
        });
        
        // Draw epic groupings first (backgrounds)
        epics.forEach(epic => {
            this.drawEpicGrouping(epic);
        });
        
        // Draw project lines
        projects.forEach(project => {
            this.drawProjectLine(project);
            this.drawProjectLabel(project);
        });
        
        // Draw epic labels last (on top)
        epics.forEach(epic => {
            this.drawEpicLabel(epic);
        });
    }

    drawTopTimeline() {
        const startDate = this.parseDate(this.data.tbeg);
        const endDate = this.parseDate(this.data.tend);
        const timelineWidth = this.displayWidth - this.margin.left - this.margin.right;
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
        const timelineWidth = this.displayWidth - this.margin.left - this.margin.right;
        
        const y = this.displayHeight - this.margin.bottom + 20;
        
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

    drawThemeLane(theme) {
        // Draw horizontal line to separate themes
        const y = theme.y;
        const lineY = y - 10;
        
        this.ctx.strokeStyle = '#DDDDDD';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.margin.left, lineY);
        this.ctx.lineTo(this.displayWidth - this.margin.right, lineY);
        this.ctx.stroke();
        
        // Draw vertical theme label
        this.drawVerticalThemeLabel(theme.name, y + theme.height / 2);
    }

    drawVerticalThemeLabel(text, centerY) {
        this.ctx.save();
        
        // Position at left margin
        const x = 50; // Moved further right to accommodate line breaks
        
        this.ctx.translate(x, centerY);
        this.ctx.rotate(-Math.PI / 2); // Rotate 90 degrees counter-clockwise
        
        this.ctx.fillStyle = '#666666';
        this.ctx.font = 'bold 14px "Permanent Marker", cursive';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Break text into lines if needed
        const words = text.split(' ');
        const maxWordsPerLine = 2;
        const lines = [];
        
        for (let i = 0; i < words.length; i += maxWordsPerLine) {
            const line = words.slice(i, i + maxWordsPerLine).join(' ');
            lines.push(line);
        }
        
        // Draw each line
        const lineSpacing = 18;
        const startY = -(lines.length - 1) * lineSpacing / 2;
        
        lines.forEach((line, index) => {
            this.ctx.fillText(line, startY + (index * lineSpacing), 0);
        });
        
        this.ctx.restore();
    }

    drawEpicGrouping(epic) {
        // Draw pencil box with crosshatch fill using epic's pencil pressure
        const padding = 15;
        const x = epic.x1 - padding;
        const y = epic.minY - 35;
        const width = (epic.x2 - epic.x1) + (padding * 2);
        const height = (epic.maxY - epic.minY) + 50;
        
        this.drawPencilBox(x, y, width, height, epic.pencilPressure);
    }

    drawPencilBox(x, y, width, height, pressure = 0.3) {
        // Draw pencil box with crosshatch fill using specified pressure
        
        // First draw the crosshatch fill inside the box
        this.drawPencilCrosshatch(x, y, width, height, pressure);
        
        // Then draw the pencil box outline
        this.drawPencilBoxOutline(x, y, width, height, pressure);
    }

    drawPencilCrosshatch(x, y, width, height, pressure) {
        this.ctx.save();
        
        // Create solid fill with pencil-like texture using canvas fill
        const alpha = Math.max(0.1, pressure * 0.3);
        const grayValue = Math.floor(220 - pressure * 50); // Darker with more pressure
        
        this.ctx.fillStyle = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${alpha})`;
        this.ctx.fillRect(x, y, width, height);
        
        this.ctx.restore();
    }

    drawPencilBoxOutline(x, y, width, height, pressure) {
        const outlineColor = '#AAAAAA';
        const outlineThickness = Math.max(0.5, pressure * 2);
        const outlinePressure = Math.max(0.3, pressure * 0.8);
        
        // Draw pencil box outline
        this.drawPencilLine(x, y, x + width, y, outlineColor, outlineThickness, outlinePressure); // Top
        this.drawPencilLine(x + width, y, x + width, y + height, outlineColor, outlineThickness, outlinePressure); // Right
        this.drawPencilLine(x + width, y + height, x, y + height, outlineColor, outlineThickness, outlinePressure); // Bottom
        this.drawPencilLine(x, y + height, x, y, outlineColor, outlineThickness, outlinePressure); // Left
    }

    drawEpicLabel(epic) {
        // Position epic label above the grouped projects
        const x = epic.x1;
        const y = epic.minY - 40;
        
        this.ctx.fillStyle = '#444444';
        this.ctx.font = 'bold 14px "Permanent Marker", cursive';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(epic.name, x, y);
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
        
        // Get pencil resolution from data
        const resolution = this.data?.pencilResolution || 1.0;
        
        this.pencil.options.color = color;
        this.pencil.options.thickness = Math.max(1, (thickness * 0.5) / resolution); // Smaller dots with higher resolution
        this.pencil.options.alpha = originalAlpha * pressure;
        
        // Adjust stroke count and segments based on resolution
        const baseStrokes = Math.round(16 * resolution); // More strokes with higher resolution
        const numStrokes = Math.max(1, Math.round(baseStrokes * pressure));
        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const segmentLength = Math.min(8 / resolution, distance / (6 * resolution)); // Shorter segments with higher resolution
        
        for (let stroke = 0; stroke < numStrokes; stroke++) {
            const offsetY = (Math.random() - 0.5) * thickness * 0.2 / resolution; // Scale offset with resolution
            const offsetX = (Math.random() - 0.5) * thickness * 0.05 / resolution;
            
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