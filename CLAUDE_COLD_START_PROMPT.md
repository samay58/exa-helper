# Prompt for Building Bobby 2.0 (2x-exa-helper)

Use this prompt when starting with the new empty repository:

---

## Initial Prompt for Claude

I want to build an advanced Chrome extension called Bobby 2.0 that provides AI-powered text analysis when users highlight text on any webpage or PDF. This is a complete rebuild of an existing extension, and I have comprehensive documentation from the previous implementation in the `/plans` folder.

**Your task:**
1. First, thoroughly read and analyze ALL files in the `/plans` folder
2. Spend significant time planning the architecture based on the learnings documented
3. Create a detailed implementation plan that addresses all the issues found in v1
4. Build the extension following modern best practices with TypeScript, React, and Vite

**Key requirements:**
- This is a COMPLETE REBUILD - do not copy old code, but learn from it
- The extension should be 10x better in terms of code quality, performance, and user experience
- Follow all the architectural recommendations in BOBBY_MASTER_BRIEF.md
- Avoid ALL the pitfalls documented in the learnings section

**Please start by:**
1. Reading all files in `/plans` folder
2. Creating a comprehensive `IMPLEMENTATION_PLAN.md` that shows you understand the problems and solutions
3. Setting up the modern project structure with TypeScript, React, and Vite
4. Only then begin implementation

Take your time with planning - a well-thought-out architecture will save significant time later.

---

## Files to Include in /plans Folder

Copy these files from the current project to `/plans` in your new repository:

### Essential Documentation (MUST INCLUDE):
1. **BOBBY_MASTER_BRIEF.md** - The comprehensive guide we just created
2. **RAUNO_DESIGN_AESTHETIC.md** - Complete design system inspired by Rauno Freiberg
3. **CLAUDE.md** - Contains specific instructions for working with the codebase
4. **EXECUTIVE_BRIEF.md** - Detailed architectural analysis and rebuild strategy
5. **logs.md** - All development session logs with learnings
6. **objective-plan.md** - Original objectives and how they evolved

### Reference Files (RECOMMENDED):
7. **README.md** - To understand the user-facing features
8. **CHANGELOG.md** - To see the evolution of fixes
9. **config.example.js** - To understand the configuration structure
10. **manifest.json** - To see required permissions and structure

### Asset Files (REQUIRED):
Create an `/assets` folder inside `/plans` and copy:
- **bobby-typeface-logo.png** - The logo file from `assets/icons/`
- **Icon set** - Copy the highest resolution icons (128.png, 256.png, 512.png) from `assets/icons/highlight-text-icons/`

### Optional but Helpful:
- **scratchpad.md** - Raw improvement notes
- **teenage-engineering-redesign-log.md** - UI design decisions
- **user-inital-plan.md** - Original vision

## Directory Structure for New Project

```
2x-exa-helper/
├── plans/
│   ├── BOBBY_MASTER_BRIEF.md
│   ├── RAUNO_DESIGN_AESTHETIC.md
│   ├── CLAUDE.md
│   ├── EXECUTIVE_BRIEF.md
│   ├── logs.md
│   ├── objective-plan.md
│   ├── README.md
│   ├── CHANGELOG.md
│   ├── config.example.js
│   ├── manifest.json
│   └── assets/
│       ├── bobby-typeface-logo.png
│       └── icons/
│           ├── 128.png
│           ├── 256.png
│           └── 512.png
└── [Claude will create the new structure here]
```

## Additional Context to Provide

When you give Claude the prompt, also mention:

1. **API Keys**: You'll provide API keys when needed (don't include config.js with actual keys)
2. **Design System**: The project should follow the Rauno Freiberg design aesthetic documented in RAUNO_DESIGN_AESTHETIC.md
3. **Timeline**: Let Claude know if you have any time constraints
4. **Testing**: Specify if you want comprehensive tests from the start
5. **Key Design Principles**: 
   - Swiss-inspired grid structure
   - NO blur on text containers (only backgrounds)
   - Single vivid accent color (orange recommended)
   - Animations under 200ms
   - Physics-aware interactions

## Expected Outcomes

Claude should:
1. Create a detailed IMPLEMENTATION_PLAN.md showing deep understanding of both technical and design requirements
2. Set up a modern TypeScript + React + Vite project with proper build system
3. Implement proper module architecture (no global window objects)
4. Use encrypted storage for API keys
5. Build UI following Rauno's design principles:
   - Swiss grid system
   - Depth through layering (blur backgrounds, not text)
   - Choreographed motion sequences
   - Physics-aware interactions
   - Single accent color restraint
6. Implement smart API routing and caching
7. Add proactive storage management
8. Include comprehensive error handling
9. Write tests alongside implementation
10. Document everything clearly

## Success Criteria

The new extension should:
- Load in < 50ms
- Never crash or show module errors
- Have crystal clear text (NO blur on content)
- Handle API rate limits gracefully
- Manage storage proactively
- Follow all design principles in RAUNO_DESIGN_AESTHETIC.md
- Feel inevitable, not designed
- Be maintainable and extensible

## Final Note

Emphasize to Claude that this is not just a technical rebuild but a complete reimagining following Rauno Freiberg's design philosophy. Every pixel should have purpose, every animation should tell a story, and the interface should disappear in service of the content.