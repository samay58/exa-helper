Lets build a Chrome extension t let users highlight any text on a webpage or PDF and get quick AI‑generated insights—clear explanations, summaries, fact checks, and more. Key features include smart analysis, multiple analysis modes, follow‑up questions, fact verification, a draggable/resizable interface, dark mode, and history tracking.

The extension works by integrating APIs such as OpenAI GPT for content analysis and Exa for verifying sources

We'll need to creating a config.js with your API keys, loading the extension via Chrome’s “Load unpacked,” and then highlighting text to see results.

The code is organized around modules in components/modules/, such as PromptManager.js for prompt templates, ButtonManager.js for UI buttons, and APIClient.js for communicating with OpenAI and other APIs. The styles, including the UI elements and color themes, live in styles.css. The extension loads the sleek “Geist” font (line 1) and defines the pop‑up’s layout from line 82 onward, with a maximum width of 480px, a subtle box shadow and flexible column layout

## Why users would use it ##

By selecting a snippet of text, users can get an explanation, summary, pros and cons, or even source verification. The extension’s flexible window makes it easy to move or resize, and dark mode keeps it comfortable to read in any setting. Overall, it serves as an instant reading assistant that works across websites and PDFs.

## High Level Architecture ##

The project follows a modular JavaScript structure for maintainability and uses modern CSS for responsive design. It relies on a background script for API requests, a content script for injecting UI elements and managing user interactions, and a set of modules for prompts, UI components, and API communication.

background.js handles API requests and processing, content.js controls the webpage UI, and components/modules/ hosts core functionality such as PromptManager, ButtonManager, and APIClient. State persists in Chrome’s storage API, and the extension is designed to work in both web pages and PDF contexts

## Implementation Plan ##

Copy config.example.js to config.js and add API keys
Load the extension in Chrome using the “Load unpacked” option.

Background Processing

Implement a service worker (background.js) to handle API requests to services like OpenAI, Exa, and Perplexity. This script listens for messages from the content script and returns results.

Content Script

Inject a floating button when the user highlights text. This button opens a pop-up where users select an analysis mode. The UI should be responsive, support dark mode, and work on PDFs as well.

Modular Components

Create modules for prompt templates, API communication, UI components, and history management. 

The modules should follow the coding style guidelines -- camelCase for variables, two-space indentation, consistent error handling, etc.

## User Interface ##

Use modern CSS to style a translucent, draggable, and resizable window. The interface can draw on warm, clean colors and sleek typography such as the “Geist” font, as noted in the existing styles.

## Design System (Modern UI Inspiration) ##

Building on the existing design, a refined style can borrow ideas from tools like Antinote, Godspeed, Warp, Spark, ChatGPT, Granola, and Claude.ai. These inspirations emphasize minimalism, warm tones, and smooth transitions. Key concepts for a polished interface:

Warm Minimal Palette

Use soft neutrals with occasional vibrant accents inspired by Antinote and Spark. Backgrounds remain muted (#f9fafb and subtle grays) while active buttons or headers feature a warm gradient or a single accent color.

The existing prompt buttons show this idea: they use light tints for each prompt type and a hover lift effect that adds a drop shadow and translation.

Translucent Layers

The pop-up currently uses solid white with a shadow. Consider adding a slightly translucent background (e.g., background: rgba(255, 255, 255, 0.85) with backdrop-filter: blur(10px)), giving a sense of depth like Claude.ai’s chat interface.

Typography and Icons

Keep the “Geist” font (already imported at line 1 of styles.css). Pair it with consistent 13–15px sizes for readability and friendly tone. The prompt buttons combine icon and text, aligning with minimal UI guidelines.

Use simple icons or emoji, similar to ChatGPT’s UI, to convey each mode quickly.

Smooth Motion

Fade-in animations exist for the pop-up (keyframes fadeIn around lines 102–109). Extend these with micro-interactions—small scale or color changes on button hover or when switching prompts—mirroring the responsive feel of Warp or Spark.

Dark Mode and Responsiveness

The CSS already defines dark-mode overrides at several points, adjusting backgrounds, text colors and shadows for readability. Keep these but refine them with cohesive color choices so dark mode feels intentionally designed, not just inverted.

The prompt bar uses flexbox and horizontal scrolling for narrow widths, ensuring the layout stays usable on small windows or touch devices.

Polished Controls

Buttons should have subtle radius, consistent padding and clear focus states (lines 2267–2269 add a blue focus ring). Add gentle corners and soft drop shadows for a “friendly but professional” look.

## Why Rebuild ##

Rebuilding Bobby from scratch can clarify the architecture and allow deeper customization. Adopting a modern design language boosts usability and trust:

Clarity: Clean typographic hierarchy and balanced whitespace make the AI responses easier to digest.

Consistency: Unified button styles, hover states and color palettes across light and dark modes create a seamless user experience.

Performance: Rewriting offers a chance to streamline code, minimize DOM manipulations and ensure smooth drag/resize behaviors.

Why Build Bobby?
Instant Understanding – Users can highlight confusing passages and get immediate, context‑aware explanations.

Multiple Perspectives – Modes like “ELI5,” “Technical,” “Examples,” and “Pros & Cons” let readers choose the style that best matches their need.

Fact Checking – Integration with research APIs (Exa and Perplexity) allows verifying claims with credible sources.

Portable Across Sites and PDFs – Special handling in the content script ensures the popup works with Chrome’s PDF viewer, PDF.js, and embedded PDFs.

Clean, Resizable Interface – The UI is designed to be unobtrusive: it appears next to your selection, can be dragged anywhere, and resized via a subtle handle.

Designing a Modern UI
Drawing inspiration from apps like Antinote, Godspeed, Warp Terminal, Spark Email, ChatGPT, Granola, and Claude.ai, the extension can adopt a fresh design system while retaining the clean aesthetic already present in the repository.

Color & Typography
Geist is already imported and used throughout the styles, giving text a crisp, modern appearance.

Adopt a warm palette of soft oranges and purples for headers and buttons, similar to Spark Email’s welcoming tones. Example gradient for headers: #FF9472 → #F2709C.

Use subtle backgrounds with mild translucency (rgba(255, 245, 236, 0.9)) and apply backdrop-filter: blur(10px); for a glassy look reminiscent of Claude.ai.

Maintain strong contrast for dark mode; the CSS already defines dark-mode variants via media queries.

Buttons & Interactions
Prompt buttons are styled with padding, subtle hover states, and a compact shape in the existing CSS. Retain this feel but enhance with a soft drop shadow and a slight scale effect on hover—ideas drawn from the smooth interactions of Warp and ChatGPT.

Include clear icons or emoji next to prompt labels to make each mode visually distinct; PromptManager already sets up icon text for each prompt type.

Provide quick-access “Follow Up” and “Fact Check” buttons at the bottom of the popup (already structured as .context-buttons in the CSS) for continuity.

Popup Layout
The popout window uses a fixed position, rounded corners, and fade‑in animation, defined in styles.css.

Introduce a soft translucent backdrop and drop shadow akin to Granola or Spark. Add a subtle border accent in warm hues.

Keep the drag handle minimal (⋮⋮) and place it in the header for a tidy look; the draggable script already prepends this handle and manages user interactions.

The resize handle uses a small bottom‑right “grip,” enabling smooth resizing without clutter.

Dark Mode
Dark‑mode rules ensure readability on dark backgrounds, mirroring the approach in ChatGPT and Claude’s interfaces. These are handled via @media (prefers-color-scheme: dark) in the CSS.

Rebuilding Step by Step
Set Up the Manifest
Mirror the manifest.json structure: define the service worker, register content.js, draggable.js, and other modules, and ensure permissions for API access and file URLs. This establishes the extension’s foundation.

Create the Background Worker
Implement a background script that listens for messages such as "searchExa" and "perplexityQuery", then fetch results from the respective APIs, as shown in background.js.

Develop the Content Script

Detect text selections, then show a floating action button (FAB) near the selection. The script already adds custom CSS for prompt buttons and dark‑mode adjustments.

Build the popout using the modern styles from styles.css. Inject prompt buttons and call the background worker when the user requests an explanation.

Design Modular Components

Use PromptManager to define prompt templates and create prompt buttons dynamically.

APIClient handles OpenAI and Perplexity requests with caching for efficiency.

UIComponents provides reusable controls for loaders, collapsible sections, and standard buttons.

Implement History and Options

HistoryManager stores recent analyses locally so users can revisit them from the popup or dedicated page.

options.html and options.js allow users to save their API keys, ensuring all API calls succeed.

Polish the Visual Design

Utilize the warm color palette and translucent backgrounds for a polished look, taking cues from Antinote and Spark. Add smooth animations for popup appearance and button interactions.

Ensure the drag and resize behaviors remain fluid; the draggable.js script manages dragging with bounds checks to keep the window visible.

How Users Interact
Install the Extension – Clone the repository, add your API keys to config.js, then load the unpacked extension in Chrome. Enable “Allow access to file URLs” for local PDF support.

Highlight Text – On any webpage or PDF, select a passage. A small icon (the FAB) appears near the selection.

Open the Popup – Click the FAB to display the popout window. Choose an analysis mode (e.g., Explain, Key Points, Fact Check) from the row of modern buttons.

Read the Response – Bobby sends your text to the chosen AI service and displays the formatted response. You can drag the window to reposition it or resize it using the bottom‑right handle.

Follow Up or Verify Claims – Use follow‑up or fact-check buttons for deeper insight. History of your interactions is stored locally and viewable from the popup or the extension’s history page.

Modern Design System

Drawing inspiration from apps such as Antinote, Godspeed, Warp terminal, Spark email, ChatGPT, Granola and Claude.ai, a refreshed UI can present Bobby as a polished tool with a minimal yet inviting look:

Warm, vibrant palette
Use soft oranges and warm purples as accent colors—similar to Spark email’s vibrant buttons—on a clean off‑white base. For dark mode, adopt deep purples and charcoal backgrounds. Keep the text highly legible and rely on translucent overlays for popups. Smooth gradients (à la Warp terminal or Godspeed) can accent headers and buttons.

Typography
Continue using the Geist typeface for a crisp, modern feel. Pair medium-weight headings with lighter body text for readability. Ensure adequate line height (around 1.5) and subtle letter spacing.

Translucent, resizable popup
Implement the popout with a frosted-glass effect (backdrop-filter: blur(10px)) and subtle drop shadows. Provide a bottom-right resize handle so the user can adjust the size. Use sleek rounded corners to echo design cues from ChatGPT and Granola.

Prompt buttons
Present each analysis mode as a pill-shaped button with a gentle color gradient when selected. Add small icons or emoji, reminiscent of the playful touches in Claude.ai. On hover, raise the button slightly for tactile feedback.

Layout
Place the action bar at the top with a drag handle for repositioning. Use collapsible sections in the output area for long responses, inspired by the smooth transitions of Antinote and Warp.

Overall tone
Aim for a calm, friendly vibe—use warm colors and soft transitions rather than harsh animations. Keep the interface simple to allow the text content to be the focus.