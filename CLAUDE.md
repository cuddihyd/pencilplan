# Pencil Timeline Renderer - Context Summary

## Project Overview
A realistic pencil drawing timeline visualization that renders project timelines with authentic pencil textures using HTML5 Canvas and the PencilCanvas library.

## Key Files
- **timeline.html** - Main HTML file with Play/Stop controls and canvas element
- **timeline.js** - Core timeline renderer class with all rendering logic
- **input1.json** - Data file containing projects, epics, and theme assignments
- **PencilCanvas.js** - External library for realistic pencil drawing textures (not modified)
- **pencil.html** - Reference implementation showing pencil drawing capabilities

## Core Features Implemented

### 1. Realistic Pencil Drawing
- Uses PencilCanvas library for authentic pencil textures
- Configurable pencil pressure (global and per-project)
- Configurable pencil thickness (default 6px)
- High-resolution rendering with devicePixelRatio + 2x scaling
- Pencil resolution parameter for texture detail control

### 2. Timeline Structure
- **Standalone Projects**: Individual project lines with themes
- **Epic Groupings**: Collections of projects with visual backgrounds
- **Theme-based Swim Lanes**: Vertical organization by theme with labels
- **Fading Tails**: Optional tailEnd parameter with gradual fade effect

### 3. Theme Organization
- Projects automatically grouped by theme attribute
- Themes sorted alphabetically: Business Platform → Infrastructure → Supportability
- Vertical theme labels with line-breaking for long names
- Horizontal separator lines between themes

### 4. Animation System
- Play/Stop controls for continuous redrawing
- Scintillating effect at ~10 FPS for visible pencil texture variation
- Animation loop with proper cleanup

### 5. Auto-sizing Canvas
- Dynamic height calculation based on content
- Collision detection and positioning within theme swim lanes
- Bottom buffer of 200px to prevent theme truncation
- Minimum canvas height of 800px

## Data Structure (input1.json)
```json
{
  "tbeg": "start-date",
  "tend": "end-date", 
  "pencilPressure": 0.6,        // Global pressure (0.0-1.0)
  "pencilResolution": 4.0,      // Texture detail level
  "projectLines": [             // Standalone projects
    {
      "name": "project-name",
      "theme": "theme-name",      // Required for swim lane grouping
      "tbeg": "start-date",
      "tend": "end-date",
      "tailEnd": "fade-end-date", // Optional fading tail
      "color": "darkGreen",       // Color name or hex
      "pencilPressure": 0.7,     // Optional override
      "pencilThickness": 4       // Optional override
    }
  ],
  "epics": [                    // Epic groupings
    {
      "name": "epic-name",
      "theme": "theme-name",      // Required for swim lane grouping
      "pencilPressure": "0.3",   // For epic background shading
      "projectLines": [          // Projects within this epic
        // ... same structure as standalone projects
      ]
    }
  ]
}
```

## Critical Implementation Details

### Canvas Height Issue (Major Bug Fixed)
**Problem**: Supportability theme was positioned off-screen due to inadequate canvas height
**Root Cause**: Canvas height calculation didn't account for all theme content
**Solution**: Increased bottom buffer to 200px and minimum height to 800px

### Epic Project Rendering (Major Bug Fixed)
**Problem**: Epic projects weren't being included in final rendering
**Root Cause**: Epic projects were positioned but not added to theme project lists
**Solution**: Ensure epic projects are added to `themeObj.projects` during positioning

### Theme Processing Pipeline
1. `getUniqueThemes()` - Collects all themes from projects and epics
2. `calculateTimelinePositions()` - Processes all projects and creates positioning data
3. `resolveCollisionsWithThemes()` - Groups by theme and calculates positions
4. `renderTimeline()` - Draws themes, epics, and projects in correct order

### Rendering Order (Important)
1. Top timeline with year/quarter markers
2. Theme swim lanes (horizontal separators + vertical labels)
3. Epic background groupings (pencil-filled boxes)
4. Project lines (main content)
5. Epic labels (on top)

## Key Methods in TimelineRenderer Class

### Core Processing
- `calculateTimelinePositions()` - Main orchestration method
- `resolveCollisionsWithThemes()` - Theme grouping and positioning
- `processProject()` - Individual project processing with date validation

### Rendering Methods
- `renderTimeline()` - Main render loop
- `drawProjectLine()` - Renders individual project with pencil texture
- `drawThemeLane()` - Draws theme separators and labels
- `drawEpicGrouping()` - Renders epic background boxes
- `drawFadingTail()` - Handles tailEnd fade effects

### Utility Methods
- `getUniqueThemes()` - Theme detection from data
- `calculateRequiredDimensions()` - Canvas sizing
- `getColorHex()` - Color name to hex conversion

## Configuration Parameters

### Pencil Rendering
- `pencilPressure`: 0.0-1.0, controls line darkness/intensity
- `pencilThickness`: pixels, default 6
- `pencilResolution`: detail level, higher = finer texture
- `lineHeight`: 40px spacing between project lines

### Canvas & Layout  
- `margin`: {top: 120, bottom: 60, left: 120, right: 60}
- `displayWidth`: 1200px (fixed)
- `displayHeight`: auto-calculated with 800px minimum
- Bottom buffer: 200px to prevent theme truncation

### Color Support
Supports both color names and hex codes:
- Named colors: red, blue, green, darkGreen, yellow, orange, purple, violet, pink, brown, black, gray
- Hex codes: #RRGGBB format

## Common Issues & Solutions

### Theme Not Showing
- **Cause**: Canvas height truncation
- **Check**: Increase bottom buffer or minimum canvas height
- **Debug**: Look for themes positioned beyond canvas bounds

### Projects Missing
- **Cause**: Epic projects not added to theme project lists
- **Check**: Verify `themeObj.projects.push(epicProject)` in `resolveCollisionsWithThemes()`

### Pencil Lines Too Light/Heavy
- **Adjust**: `pencilPressure` values (global or per-project)
- **Consider**: Multiple overlapping strokes create darker appearance

### Performance Issues
- **Animation**: Runs at 10 FPS for visible scintillation
- **Resolution**: Higher `pencilResolution` = more computation
- **Canvas**: High DPI scaling can impact performance

## Development Notes
- Font used: "Permanent Marker" from Google Fonts for handwritten feel
- High-resolution rendering uses `devicePixelRatio * 2` scaling
- Epic backgrounds use pencil crosshatch fill with configurable pressure
- Timeline spans are calculated proportionally within fixed 1200px width
- Collision detection ensures proper theme-based positioning

## Future Enhancement Ideas
- Color themes/palettes
- Project dependencies/connections
- Interactive hover effects
- Export to image formats
- Multiple timeline views
- Zoom/pan functionality