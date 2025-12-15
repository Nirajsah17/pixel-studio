# 🎨 PixelStudio - AI-Powered Image Editor

PixelStudio is a robust, web-based image editing application built with React and Fabric.js. It bridges the gap between traditional photo manipulation and modern AI generation, allowing users to edit photos, create composite artwork, and generate assets using text prompts—all within the browser.

## ✨ Key Features

### 🖌️ Advanced Editing Tools
- Drawing & Shapes: Freehand brush with adjustable size and color, plus vector shapes (Rectangle, Circle, Triangle, Line)
- Smart Eraser: Pixel-perfect erasing capabilities
- Transformations: Resize, Rotate, Flip (Horizontal / Vertical)
- Crop Tool: Non-destructive cropping with an interactive overlay

### 🤖 AI Studio (Powered by Google Imagen)
- Text-to-Image: Generate unique assets directly onto your canvas using natural language prompts
- Integrated Workflow: Generated images can be added as new layers or used as the base for a new project

### 🖼️ Creative Hub & Gallery
- Project Management: Auto-saves your work to IndexedDB, bypassing LocalStorage limits and allowing resume-anytime editing
- Stock Library: Built-in access to high-quality Unsplash stock photos with infinite scrolling/loading
- Overlay System: Import local files, stock photos, or AI-generated images as layers on top of your current composition

### 💎 Professional Filters
- Instant preset filters including Grayscale, Sepia, Vintage, Polaroid, Kodachrome, and Blur
- Real-time CSS-based previews in the sidebar

### 🔍 Workspace Controls
- Zoom & Pan: Mouse wheel zooming and Alt + Drag panning
- History: Robust Undo / Redo stack to track every change
- Smart Export: Exports high-resolution PNGs, automatically cropping to the content’s bounding box

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

Clone the repository
```bash
git clone https://github.com/yourusername/pixel-studio.git
cd pixel-studio

npm install
```

### Run the development server


```bash
npm run dev
```

* Open your browser to http://localhost:5173.


### 🎮 Usage Guide

#### Navigation & Tools
Left Sidebar contains primary tools (Select, Crop, Draw, Shapes, AI Gen).
Right Sidebar contains transformations, filters, and layer management.
Bottom Bar shows context-aware settings like brush size and color picker.

#### Zooming & Panning
Zoom using the mouse wheel.
Pan by holding the Alt (or Option) key and dragging the canvas.
Reset using the UI controls in the bottom-right corner.

#### Using AI Generation
Click the Sparkles icon in the toolbar or open Gallery > AI Studio.
Type a prompt such as "A neon cyberpunk city at night".
Click Generate and then Use Image to place it on the canvas.

🛠️ Technology Stack

Frontend Framework: React 18

Build Tool: Vite

Canvas Engine: Fabric.js v5

Styling: Tailwind CSS and Lucide React

Storage: Native IndexedDB

AI Model: Google imagen-4.0-generate-001 via REST API

📂 Project Structure
src/
├── App.jsx
├── main.jsx
├── index.css
└── assets/

📄 License

This project is open-source and available under the MIT License.

Made with ❤️ and ☕ by [Niraj Kumar Sah]