import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Save,
  Download,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Brush,
  Eraser,
  Square,
  Circle as CircleIcon,
  Triangle,
  Minus,
  Undo,
  Redo,
  Image as ImageIcon,
  Sliders,
  Trash2,
  AlertCircle,
  Check,
  Loader,
  MousePointer,
  LayoutGrid,
  Plus,
  X,
  FileEdit,
  Sparkles,
  Globe,
  Search,
  Wand2,
  RefreshCw,
  ImagePlus,
  ZoomIn,
  ZoomOut,
  Maximize,
  Layers,
} from "lucide-react";

// --- UTILS & INDEXEDDB HELPER ---

const DB_NAME = "ImageEditorDB";
const STORE_NAME = "projects";
const DB_VERSION = 1;

const dbHelper = {
  open: () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },
  saveProject: async (projectData) => {
    const db = await dbHelper.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(projectData);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  getProject: async (id) => {
    const db = await dbHelper.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  getAllProjects: async () => {
    const db = await dbHelper.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  deleteProject: async (id) => {
    const db = await dbHelper.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

// --- CONSTANTS ---

const UNSUPPORTED_FORMATS = ["image/tiff", "image/x-tiff", "image/bmp"];
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Filter Definitions with CSS previews
const FILTER_PRESETS = [
  { name: "None", type: "none", css: "none" },
  { name: "Grayscale", type: "grayscale", css: "grayscale(100%)" },
  { name: "Sepia", type: "sepia", css: "sepia(100%)" },
  { name: "Invert", type: "invert", css: "invert(100%)" },
  { name: "Vintage", type: "vintage", css: "sepia(50%) contrast(150%)" },
  { name: "Polaroid", type: "polaroid", css: "opacity(0.8) brightness(1.2)" },
  {
    name: "Kodachrome",
    type: "kodachrome",
    css: "saturate(200%) contrast(120%)",
  },
  { name: "Contrast", type: "contrast", css: "contrast(150%)" },
  { name: "Blur", type: "blur", css: "blur(1px)" },
  { name: "Pixelate", type: "pixelate", css: "none" },
  { name: "Noise", type: "noise", css: "none" },
];

const INITIAL_STOCK_IMAGES = [
  {
    id: "stock1",
    url: "https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=800&q=80",
    title: "Random Object",
  },
  {
    id: "stock2",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    title: "Mountains",
  },
  {
    id: "stock3",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
    title: "Abstract",
  },
  {
    id: "stock4",
    url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
    title: "Nature",
  },
];

const STOCK_CATEGORIES = [
  "Nature",
  "Technology",
  "Architecture",
  "Abstract",
  "Animals",
  "Food",
  "Travel",
  "Art",
];

// --- MAIN COMPONENT ---

export default function App() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTool, setActiveTool] = useState("select");
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [notification, setNotification] = useState(null);
  const [activeFilter, setActiveFilter] = useState("none");
  const [isProcessing, setIsProcessing] = useState(false);

  // Project State
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryTab, setGalleryTab] = useState("projects"); // 'projects', 'stock', 'ai'
  const [galleryMode, setGalleryMode] = useState("project"); // 'project' or 'overlay'
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOverlayMenu, setShowOverlayMenu] = useState(false); // New Overlay Menu
  const [savedProjects, setSavedProjects] = useState([]);

  // Stock Image State
  const [stockImages, setStockImages] = useState(INITIAL_STOCK_IMAGES);
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);

  // History State
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const isHistoryLocked = useRef(false);

  // Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);

  // Load Fabric.js Dynamically
  useEffect(() => {
    if (window.fabric) {
      setIsReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js";
    script.onload = () => setIsReady(true);
    document.body.appendChild(script);
  }, []);

  // Initialize Canvas
  useEffect(() => {
    if (!isReady || !canvasRef.current) return;

    const canvas = new window.fabric.Canvas(canvasRef.current, {
      height: CANVAS_HEIGHT,
      width: CANVAS_WIDTH,
      backgroundColor: "#f3f4f6",
      preserveObjectStacking: true,
    });

    canvas.freeDrawingBrush = new window.fabric.PencilBrush(canvas);

    const saveHistory = () => {
      if (isHistoryLocked.current) return;

      const json = JSON.stringify(canvas.toJSON());

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndexRef.current + 1);
        newHistory.push(json);
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });

      historyIndexRef.current = Math.min(historyIndexRef.current + 1, 19);
      setHistoryIndex(historyIndexRef.current);
    };

    // --- Sync Selection State ---
    const handleSelection = (e) => {
      const activeObj = e.selected ? e.selected[0] : canvas.getActiveObject();

      if (activeObj && activeObj.id === "crop-rect") {
        return;
      }

      setActiveTool("select");
      canvas.isDrawingMode = false;

      if (activeObj) {
        const color = activeObj.get("fill") || activeObj.get("stroke");
        if (color && typeof color === "string" && color !== "transparent") {
          setBrushColor(color);
        }
      }
    };

    // --- ZOOM & PAN LOGIC ---
    canvas.on("mouse:wheel", function (opt) {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;

      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      setZoomLevel(zoom);

      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Handle Panning with Alt Key
    let isDragging = false;
    let lastPosX, lastPosY;

    canvas.on("mouse:down", function (opt) {
      const evt = opt.e;
      if (evt.altKey === true) {
        isDragging = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on("mouse:move", function (opt) {
      if (isDragging) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - lastPosX;
        vpt[5] += e.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = e.clientX;
        lastPosY = e.clientY;
      }
    });

    canvas.on("mouse:up", function (opt) {
      if (isDragging) {
        canvas.setViewportTransform(canvas.viewportTransform);
        isDragging = false;
        canvas.selection = true;
      }
    });

    canvas.on("object:modified", saveHistory);
    canvas.on("object:added", saveHistory);
    canvas.on("object:removed", saveHistory);
    canvas.on("path:created", saveHistory);

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [isReady]);

  // Load projects list when opening gallery
  useEffect(() => {
    if (showGallery && galleryTab === "projects") {
      loadProjectList();
    }
  }, [showGallery, galleryTab]);

  const loadProjectList = async () => {
    try {
      const projects = await dbHelper.getAllProjects();
      projects.sort(
        (a, b) => new Date(b.lastModified) - new Date(a.lastModified)
      );
      setSavedProjects(projects);
    } catch (err) {
      console.error(err);
      showNotification("Failed to load gallery", "error");
    }
  };

  const loadMoreStockImages = () => {
    setIsLoadingStock(true);
    setTimeout(() => {
      const STABLE_MOCKS = [
        "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80",
      ];

      const nextBatch = STABLE_MOCKS.map((url, i) => ({
        id: `stock_stable_${Date.now()}_${i}`,
        url: url,
        title: "Stock Photo",
      }));

      setStockImages((prev) => [...prev, ...nextBatch]);
      setIsLoadingStock(false);
    }, 1000);
  };

  // --- FEATURES ---

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Helper to load image onto canvas from URL (handles CORS)
  const loadImageFromUrl = (url, isBase64 = false, addToExisting = false) => {
    if (!fabricCanvas) return;

    // If adding to existing, we force addToExisting to true
    // This allows the Gallery to work in 'overlay' mode
    const shouldAddLayer = addToExisting;

    if (!shouldAddLayer) {
      fabricCanvas.clear();
      fabricCanvas.setBackgroundColor(
        "#fff",
        fabricCanvas.renderAll.bind(fabricCanvas)
      );
      fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset zoom
      setZoomLevel(1);
    }

    const options = isBase64 ? {} : { crossOrigin: "anonymous" };

    window.fabric.Image.fromURL(
      url,
      (img) => {
        if (!img) {
          showNotification("Failed to load image", "error");
          return;
        }

        if (!shouldAddLayer) {
          const scale = Math.min(
            CANVAS_WIDTH / img.width,
            CANVAS_HEIGHT / img.height
          );

          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: "center",
            originY: "center",
            left: CANVAS_WIDTH / 2,
            top: CANVAS_HEIGHT / 2,
          });
          setCurrentProjectId(null);
        } else {
          // Add as layer - Scale to fit view if huge, or default size
          // Scale to reasonable size (e.g. 1/3 of canvas)
          const scale = Math.min(
            (CANVAS_WIDTH * 0.4) / img.width,
            (CANVAS_HEIGHT * 0.4) / img.height
          );

          // Center in current viewport
          const center = fabricCanvas.getVpCenter();

          img.set({
            scaleX: scale,
            scaleY: scale,
            left: center.x,
            top: center.y,
            originX: "center",
            originY: "center",
          });
        }

        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();

        const json = JSON.stringify(fabricCanvas.toJSON());

        if (!shouldAddLayer) {
          setHistory([json]);
          historyIndexRef.current = 0;
          setHistoryIndex(0);
        } else {
          fabricCanvas.fire("object:added");
        }

        setShowGallery(false);
        setGalleryMode("project"); // Reset mode
        showNotification(shouldAddLayer ? "Layer added!" : "Image loaded!");
      },
      options
    );
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;

    const processFile = (file) => {
      return new Promise((resolve) => {
        if (UNSUPPORTED_FORMATS.includes(file.type)) {
          resolve(false);
          return;
        }

        const reader = new FileReader();
        reader.onload = (f) => {
          const data = f.target.result;
          const tempCanvasEl = document.createElement("canvas");
          tempCanvasEl.width = CANVAS_WIDTH;
          tempCanvasEl.height = CANVAS_HEIGHT;

          const tempCanvas = new window.fabric.StaticCanvas(tempCanvasEl, {
            backgroundColor: "#fff",
          });

          window.fabric.Image.fromURL(data, (img) => {
            const scale = Math.min(
              CANVAS_WIDTH / img.width,
              CANVAS_HEIGHT / img.height
            );

            img.set({
              scaleX: scale,
              scaleY: scale,
              originX: "center",
              originY: "center",
              left: CANVAS_WIDTH / 2,
              top: CANVAS_HEIGHT / 2,
            });

            tempCanvas.add(img);
            tempCanvas.renderAll();

            const json = JSON.stringify(tempCanvas.toJSON());
            const thumb = tempCanvas.toDataURL({
              format: "png",
              multiplier: 0.2,
            });
            const projectId = `proj_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 5)}`;

            const projectData = {
              id: projectId,
              lastModified: new Date().toISOString(),
              data: json,
              thumbnail: thumb,
            };

            dbHelper.saveProject(projectData).then(() => {
              tempCanvas.dispose();
              resolve(true);
            });
          });
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      for (const file of files) {
        const success = await processFile(file);
        if (success) successCount++;
      }

      if (successCount > 0) {
        showNotification(`${successCount} images saved to Gallery!`);
        setGalleryTab("projects");
        setGalleryMode("project");
        setShowGallery(true);
        loadProjectList();
      } else {
        showNotification("No valid images imported.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error importing images", "error");
    } finally {
      setIsProcessing(false);
      e.target.value = null;
    }
  };

  // Handle adding an image as an overlay layer (Local File)
  const handleAddLocalLayer = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (UNSUPPORTED_FORMATS.includes(file.type)) {
      showNotification(`Format ${file.type} is not supported.`, "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target.result;
      loadImageFromUrl(data, true, true);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
    setShowOverlayMenu(false);
  };

  // Zoom Controls
  const handleZoom = (type) => {
    if (!fabricCanvas) return;
    let zoom = fabricCanvas.getZoom();

    if (type === "in") zoom *= 1.1;
    if (type === "out") zoom /= 1.1;
    if (type === "reset") {
      zoom = 1;
      fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    }

    if (zoom > 20) zoom = 20;
    if (zoom < 0.1) zoom = 0.1;

    if (type !== "reset")
      fabricCanvas.zoomToPoint(
        { x: fabricCanvas.width / 2, y: fabricCanvas.height / 2 },
        zoom
      );

    setZoomLevel(zoom);
    fabricCanvas.requestRenderAll();
  };

  // --- AI GENERATION ---
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);

    const apiKey = ""; // Provided by environment
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

    const payload = {
      instances: [{ prompt: aiPrompt }],
      parameters: { sampleCount: 1 },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Generation failed");

      const result = await response.json();
      const base64Data = result.predictions?.[0]?.bytesBase64Encoded;

      if (base64Data) {
        const finalImage = `data:image/png;base64,${base64Data}`;
        setGeneratedImage(finalImage);

        // If active tool is 'ai', add immediately
        if (activeTool === "ai") {
          loadImageFromUrl(finalImage, true, true);
          setGeneratedImage(null);
          setAiPrompt("");
        }
      } else {
        throw new Error("No image data returned");
      }
    } catch (error) {
      console.error("AI Error:", error);
      showNotification("Failed to generate image. Try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAction = async (type) => {
    if (!fabricCanvas) return;

    try {
      const json = JSON.stringify(fabricCanvas.toJSON());
      const thumb = fabricCanvas.toDataURL({ format: "png", multiplier: 0.2 });

      let projectId = currentProjectId;
      if (type === "new" || !projectId) {
        projectId = `proj_${Date.now()}`;
      }

      const projectData = {
        id: projectId,
        lastModified: new Date().toISOString(),
        data: json,
        thumbnail: thumb,
      };

      await dbHelper.saveProject(projectData);
      setCurrentProjectId(projectId);
      setShowSaveModal(false);
      showNotification(
        type === "new" ? "Saved as new project!" : "Project updated!"
      );
    } catch (err) {
      console.error(err);
      showNotification("Failed to save.", "error");
    }
  };

  const loadProject = async (id) => {
    try {
      const project = await dbHelper.getProject(id);
      if (project && project.data) {
        isHistoryLocked.current = true;
        fabricCanvas.clear();
        fabricCanvas.loadFromJSON(project.data, () => {
          fabricCanvas.renderAll();
          fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset zoom on load
          setZoomLevel(1);
          isHistoryLocked.current = false;

          const json = JSON.stringify(fabricCanvas.toJSON());
          setHistory([json]);
          historyIndexRef.current = 0;
          setHistoryIndex(0);

          setCurrentProjectId(project.id);
          setShowGallery(false);
          showNotification("Project loaded!");
        });
      } else {
        showNotification("Project data not found.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotification("Error loading project.", "error");
    }
  };

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project?")) {
      await dbHelper.deleteProject(id);
      loadProjectList();
      if (currentProjectId === id) setCurrentProjectId(null);
    }
  };

  const exportImage = () => {
    if (!fabricCanvas) return;

    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();

    const objects = fabricCanvas.getObjects();
    if (objects.length === 0) {
      showNotification("Canvas is empty", "error");
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    objects.forEach((obj) => {
      const bound = obj.getBoundingRect(true);
      if (bound.left < minX) minX = bound.left;
      if (bound.top < minY) minY = bound.top;
      if (bound.left + bound.width > maxX) maxX = bound.left + bound.width;
      if (bound.top + bound.height > maxY) maxY = bound.top + bound.height;
    });

    const padding = 0;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropW = maxX - minX + padding * 2;
    const cropH = maxY - minY + padding * 2;

    const dataURL = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
      left: cropX,
      top: cropY,
      width: cropW,
      height: cropH,
    });

    const link = document.createElement("a");
    link.download = `edited-image-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- EDITING LOGIC ---

  const undo = () => {
    if (historyIndexRef.current <= 0) return;

    isHistoryLocked.current = true;
    const newIndex = historyIndexRef.current - 1;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);

    fabricCanvas.loadFromJSON(history[newIndex], () => {
      fabricCanvas.renderAll();
      isHistoryLocked.current = false;
    });
  };

  const redo = () => {
    if (historyIndexRef.current >= history.length - 1) return;

    isHistoryLocked.current = true;
    const newIndex = historyIndexRef.current + 1;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);

    fabricCanvas.loadFromJSON(history[newIndex], () => {
      fabricCanvas.renderAll();
      isHistoryLocked.current = false;
    });
  };

  const handleTransform = (type) => {
    const obj = fabricCanvas.getActiveObject();
    if (!obj) return;

    switch (type) {
      case "rotateCw":
        obj.rotate((obj.angle || 0) + 90);
        break;
      case "rotateCcw":
        obj.rotate((obj.angle || 0) - 90);
        break;
      case "flipX":
        obj.set("flipX", !obj.flipX);
        break;
      case "flipY":
        obj.set("flipY", !obj.flipY);
        break;
      default:
        break;
    }
    fabricCanvas.renderAll();
    fabricCanvas.fire("object:modified");
  };

  const applyFilter = (filterType) => {
    const obj = fabricCanvas.getActiveObject();
    if (!obj || !obj.isType("image")) {
      showNotification("Select an image to filter", "error");
      return;
    }

    obj.filters = [];
    setActiveFilter(filterType);

    const f = window.fabric.Image.filters;
    let filter = null;
    let secondaryFilter = null;

    switch (filterType) {
      case "grayscale":
        filter = new f.Grayscale();
        break;
      case "sepia":
        filter = new f.Sepia();
        break;
      case "invert":
        filter = new f.Invert();
        break;
      case "contrast":
        filter = new f.Contrast({ contrast: 0.3 });
        break;
      case "blur":
        filter = new f.Blur({ blur: 0.5 });
        break;
      case "noise":
        filter = new f.Noise({ noise: 100 });
        break;
      case "pixelate":
        filter = new f.Pixelate({ blocksize: 8 });
        break;
      case "vintage":
        filter = new f.Sepia();
        secondaryFilter = new f.Contrast({ contrast: 0.2 });
        break;
      case "polaroid":
        filter = new f.Contrast({ contrast: 0.2 });
        secondaryFilter = new f.Brightness({ brightness: 0.1 });
        break;
      case "kodachrome":
        filter = new f.Saturation({ saturation: 1 });
        secondaryFilter = new f.Contrast({ contrast: 0.2 });
        break;
      default:
        break;
    }

    if (filter) obj.filters.push(filter);
    if (secondaryFilter) obj.filters.push(secondaryFilter);

    obj.applyFilters();
    fabricCanvas.renderAll();
    fabricCanvas.fire("object:modified");
  };

  const addShape = (shape) => {
    let newObj;
    const center = fabricCanvas.getVpCenter(); // Use viewport center
    const common = {
      left: center.x,
      top: center.y,
      fill: brushColor,
      stroke: "#000",
      strokeWidth: 1,
      originX: "center",
      originY: "center",
    };

    if (shape === "rect") {
      newObj = new window.fabric.Rect({ ...common, width: 100, height: 100 });
    } else if (shape === "circle") {
      newObj = new window.fabric.Circle({ ...common, radius: 50 });
    } else if (shape === "triangle") {
      newObj = new window.fabric.Triangle({
        ...common,
        width: 100,
        height: 100,
      });
    } else if (shape === "line") {
      newObj = new window.fabric.Line([50, 50, 200, 50], {
        ...common,
        fill: "transparent",
        stroke: brushColor,
        strokeWidth: brushSize,
      });
    }

    fabricCanvas.add(newObj);
    fabricCanvas.setActiveObject(newObj);

    setActiveTool("select");
    fabricCanvas.isDrawingMode = false;

    fabricCanvas.fire("object:modified");
  };

  const toggleDrawingMode = (mode) => {
    setActiveTool(mode);
    fabricCanvas.isDrawingMode = mode === "draw" || mode === "erase";

    if (mode === "draw") {
      fabricCanvas.freeDrawingBrush = new window.fabric.PencilBrush(
        fabricCanvas
      );
      fabricCanvas.freeDrawingBrush.color = brushColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    } else if (mode === "erase") {
      fabricCanvas.freeDrawingBrush = new window.fabric.PencilBrush(
        fabricCanvas
      );
      fabricCanvas.freeDrawingBrush.color = "white";
      fabricCanvas.freeDrawingBrush.width = brushSize * 2;
    }
  };

  const startCrop = () => {
    const existingRect = fabricCanvas
      .getObjects()
      .find((o) => o.id === "crop-rect");
    if (existingRect) fabricCanvas.remove(existingRect);

    if (activeTool === "crop") {
      setActiveTool("select");
      return;
    }

    setActiveTool("crop");
    fabricCanvas.discardActiveObject();

    const rect = new window.fabric.Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 200,
      fill: "rgba(0,0,0,0.3)",
      stroke: "#ccc",
      strokeDashArray: [5, 5],
      strokeWidth: 2,
      hasRotatingPoint: false,
      id: "crop-rect",
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
  };

  const applyCrop = () => {
    const cropObj = fabricCanvas.getObjects().find((o) => o.id === "crop-rect");
    if (!cropObj) return;

    const { left, top, width, height, scaleX, scaleY } = cropObj;
    const cropW = width * scaleX;
    const cropH = height * scaleY;

    cropObj.visible = false;

    const dataUrl = fabricCanvas.toDataURL({
      left: left,
      top: top,
      width: cropW,
      height: cropH,
      format: "png",
    });

    fabricCanvas.clear();
    fabricCanvas.setBackgroundColor("#fff", null);
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset zoom after crop
    setZoomLevel(1);

    window.fabric.Image.fromURL(dataUrl, (img) => {
      img.set({
        left: CANVAS_WIDTH / 2,
        top: CANVAS_HEIGHT / 2,
        originX: "center",
        originY: "center",
      });
      fabricCanvas.add(img);
      fabricCanvas.renderAll();
      setActiveTool("select");
      fabricCanvas.fire("object:modified");
    });
  };

  const deleteSelected = () => {
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length) {
      fabricCanvas.discardActiveObject();
      activeObjects.forEach((obj) => {
        fabricCanvas.remove(obj);
      });
      fabricCanvas.fire("object:removed");
    }
  };

  if (!isReady)
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white flex-col gap-4">
        <Loader className="animate-spin w-8 h-8" />
        <p>Loading Editor Engine...</p>
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans text-gray-800">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <ImageIcon size={20} />
          </div>
          <h1 className="font-bold text-xl hidden md:block">PixelStudio</h1>
          {currentProjectId && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
              Editing: {currentProjectId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 transition-opacity"
            title="Undo"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 transition-opacity"
            title="Redo"
          >
            <Redo size={18} />
          </button>

          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <label
            className={`flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer text-sm font-medium transition-colors ${
              isProcessing ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {isProcessing ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            <span className="hidden sm:inline">Import</span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
            />
          </label>

          {/* Enhanced Overlay Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOverlayMenu(!showOverlayMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer text-sm font-medium transition-colors"
            >
              <Layers size={16} />
              <span className="hidden sm:inline">Add Overlay</span>
            </button>

            {showOverlayMenu && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col p-1 animate-in slide-in-from-top-2">
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-gray-700">
                  <ImagePlus size={16} className="text-blue-500" />
                  <span>Upload File</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAddLocalLayer}
                  />
                </label>
                <button
                  onClick={() => {
                    setGalleryMode("overlay");
                    setGalleryTab("stock");
                    setShowGallery(true);
                    setShowOverlayMenu(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded text-left text-sm text-gray-700"
                >
                  <Globe size={16} className="text-green-500" />
                  <span>Stock Library</span>
                </button>
                <button
                  onClick={() => {
                    setGalleryMode("overlay");
                    setGalleryTab("ai");
                    setShowGallery(true);
                    setShowOverlayMenu(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded text-left text-sm text-gray-700"
                >
                  <Sparkles size={16} className="text-purple-500" />
                  <span>AI Generator</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setGalleryMode("project");
              setGalleryTab("projects");
              setShowGallery(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-sm font-medium transition-colors"
          >
            <LayoutGrid size={16} />
            <span className="hidden sm:inline">Gallery</span>
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Save size={16} />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={exportImage}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div
        className="flex flex-1 overflow-hidden relative"
        onClick={() => setShowOverlayMenu(false)}
      >
        {/* LEFT TOOLBAR */}
        <div
          className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 overflow-y-auto z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <ToolButton
            icon={MousePointer}
            label="Select"
            active={activeTool === "select"}
            onClick={() => toggleDrawingMode("select")}
          />
          <ToolButton
            icon={Crop}
            label="Crop"
            active={activeTool === "crop"}
            onClick={startCrop}
          />
          <div className="w-10 h-px bg-gray-200" />

          <ToolButton
            icon={Brush}
            label="Draw"
            active={activeTool === "draw"}
            onClick={() => toggleDrawingMode("draw")}
          />
          <ToolButton
            icon={Eraser}
            label="Eraser"
            active={activeTool === "erase"}
            onClick={() => toggleDrawingMode("erase")}
          />
          <div className="w-10 h-px bg-gray-200" />

          <ToolButton
            icon={Sparkles}
            label="AI Gen"
            active={activeTool === "ai"}
            onClick={() => setActiveTool("ai")}
          />
          <div className="w-10 h-px bg-gray-200" />

          <ToolButton
            icon={Square}
            label="Rect"
            onClick={() => addShape("rect")}
          />
          <ToolButton
            icon={CircleIcon}
            label="Circle"
            onClick={() => addShape("circle")}
          />
          <ToolButton
            icon={Triangle}
            label="Triangle"
            onClick={() => addShape("triangle")}
          />
          <ToolButton
            icon={Minus}
            label="Line"
            onClick={() => addShape("line")}
          />
        </div>

        {/* CANVAS WORKSPACE */}
        <div className="flex-1 bg-gray-100 p-8 overflow-hidden relative flex items-center justify-center">
          {/* The Canvas Wrapper needs to capture mouse events properly */}
          <div className="shadow-xl border-4 border-white bg-white relative">
            <canvas ref={canvasRef} />
            {activeTool === "crop" && (
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={applyCrop}
                  className="bg-green-500 text-white px-3 py-1 rounded shadow text-xs font-bold hover:scale-105 transition-transform"
                >
                  APPLY CROP
                </button>
                <button
                  onClick={startCrop}
                  className="bg-red-500 text-white px-3 py-1 rounded shadow text-xs font-bold hover:scale-105 transition-transform"
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>

          {/* Zoom Controls Overlay */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white/90 p-2 rounded-lg shadow-lg border border-gray-200 backdrop-blur-sm z-30">
            <button
              onClick={() => handleZoom("in")}
              className="p-2 hover:bg-gray-100 rounded text-gray-700"
              title="Zoom In"
            >
              <ZoomIn size={20} />
            </button>
            <span className="text-xs text-center font-mono text-gray-500">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom("out")}
              className="p-2 hover:bg-gray-100 rounded text-gray-700"
              title="Zoom Out"
            >
              <ZoomOut size={20} />
            </button>
            <button
              onClick={() => handleZoom("reset")}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 border-t border-gray-200 mt-1"
              title="Reset View"
            >
              <Maximize size={20} />
            </button>
          </div>

          {/* Bottom Bar Logic (Settings) */}
          {(activeTool === "draw" ||
            activeTool === "erase" ||
            activeTool === "select") && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white p-3 rounded-xl shadow-lg border border-gray-200 flex items-center gap-4 animate-in slide-in-from-bottom-5 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs font-bold text-gray-500 uppercase">
                {activeTool === "select" ? "Color" : `${activeTool} Settings`}
              </span>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setBrushColor(newColor);

                  if (fabricCanvas.freeDrawingBrush) {
                    fabricCanvas.freeDrawingBrush.color = newColor;
                  }

                  const activeObj = fabricCanvas.getActiveObject();
                  if (activeObj) {
                    if (
                      activeObj.type === "line" ||
                      activeObj.type === "path"
                    ) {
                      activeObj.set("stroke", newColor);
                    } else {
                      activeObj.set("fill", newColor);
                    }
                    fabricCanvas.renderAll();
                    fabricCanvas.fire("object:modified");
                  }
                }}
                className="w-8 h-8 rounded cursor-pointer border-none"
                disabled={activeTool === "erase"}
              />
              {(activeTool === "draw" || activeTool === "erase") && (
                <div className="flex items-center gap-2">
                  <span className="text-xs">Size: {brushSize}px</span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={brushSize}
                    onChange={(e) => {
                      const size = parseInt(e.target.value);
                      setBrushSize(size);
                      if (fabricCanvas.freeDrawingBrush)
                        fabricCanvas.freeDrawingBrush.width = size;
                    }}
                    className="w-24"
                  />
                </div>
              )}
            </div>
          )}

          {/* AI Generation Bar (Main Page) */}
          {activeTool === "ai" && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex items-center gap-3 w-full max-w-2xl animate-in slide-in-from-bottom-5 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <Wand2 className="text-purple-600" size={24} />
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe an image to add... (e.g. 'A red flying car')"
                className="flex-1 outline-none text-sm bg-transparent"
                onKeyDown={(e) => e.key === "Enter" && handleGenerateAI()}
              />
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating || !aiPrompt.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? (
                  <Loader className="animate-spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                Generate
              </button>
              <button
                onClick={() => setActiveTool("select")}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PROPERTY PANEL */}
        <div
          className="w-72 bg-white border-l border-gray-200 p-4 flex flex-col gap-6 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <PanelSection title="Transform">
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                icon={RotateCcw}
                label="-90°"
                onClick={() => handleTransform("rotateCcw")}
              />
              <ActionButton
                icon={RotateCw}
                label="+90°"
                onClick={() => handleTransform("rotateCw")}
              />
              <ActionButton
                icon={FlipHorizontal}
                label="Flip H"
                onClick={() => handleTransform("flipX")}
              />
              <ActionButton
                icon={FlipVertical}
                label="Flip V"
                onClick={() => handleTransform("flipY")}
              />
            </div>
          </PanelSection>

          <PanelSection title="Filters">
            <div className="grid grid-cols-3 gap-2">
              {FILTER_PRESETS.map((filter) => (
                <button
                  key={filter.type}
                  onClick={() => applyFilter(filter.type)}
                  className={`flex flex-col items-center gap-1 p-1 rounded border transition-all ${
                    activeFilter === filter.type
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className="w-full aspect-square rounded overflow-hidden bg-gray-200 mb-1 relative"
                    title={filter.name}
                  >
                    <div
                      className="w-full h-full absolute inset-0 bg-gradient-to-br from-yellow-200 via-red-300 to-purple-400"
                      style={{ filter: filter.css }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 truncate w-full text-center">
                    {filter.name}
                  </span>
                </button>
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Canvas Settings">
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Width:</span>
                <span className="font-mono">{CANVAS_WIDTH}px</span>
              </div>
              <div className="flex justify-between">
                <span>Height:</span>
                <span className="font-mono">{CANVAS_HEIGHT}px</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Tip: Scroll to Zoom. Alt+Drag to Pan.
              </div>
            </div>
          </PanelSection>

          <div className="mt-auto">
            <button
              onClick={deleteSelected}
              className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 size={16} /> Delete Selected
            </button>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {showGallery && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowGallery(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gallery Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col p-4 gap-2">
              <div className="flex items-center gap-2 mb-6 px-2">
                <LayoutGrid className="text-purple-600" />
                <span className="font-bold text-lg text-gray-800">
                  Creative Hub
                </span>
              </div>

              {/* Conditional Rendering of Sidebar based on Mode */}
              {galleryMode === "project" ? (
                <button
                  onClick={() => setGalleryTab("projects")}
                  className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                    galleryTab === "projects"
                      ? "bg-white shadow-sm border border-gray-200 text-blue-600 font-medium"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <FileEdit size={18} /> My Projects
                </button>
              ) : (
                <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-sm font-medium mb-2">
                  Select an image to overlay
                </div>
              )}

              <button
                onClick={() => setGalleryTab("stock")}
                className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  galleryTab === "stock"
                    ? "bg-white shadow-sm border border-gray-200 text-blue-600 font-medium"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Globe size={18} /> Stock Library
              </button>
              <button
                onClick={() => setGalleryTab("ai")}
                className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  galleryTab === "ai"
                    ? "bg-white shadow-sm border border-gray-200 text-purple-600 font-medium"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Sparkles size={18} /> AI Studio
              </button>

              <div className="mt-auto pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowGallery(false)}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-800"
                >
                  Close Gallery
                </button>
              </div>
            </div>

            {/* Gallery Content Area */}
            <div className="flex-1 bg-white overflow-y-auto p-6 relative">
              <button
                onClick={() => setShowGallery(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>

              {/* TAB: MY PROJECTS */}
              {galleryTab === "projects" && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileEdit size={24} className="text-blue-500" /> Saved
                    Projects
                  </h2>
                  {savedProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2 border-2 border-dashed border-gray-100 rounded-xl">
                      <ImageIcon size={48} className="opacity-20" />
                      <p>No saved projects yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {savedProjects.map((proj) => (
                        <div
                          key={proj.id}
                          onClick={() => loadProject(proj.id)}
                          className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer ring-0 hover:ring-2 ring-blue-100"
                        >
                          <div className="aspect-video bg-gray-100 relative">
                            <img
                              src={proj.thumbnail}
                              alt="Project"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                          <div className="p-3 flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-xs font-mono text-gray-500 truncate w-32">
                                {proj.id}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(
                                  proj.lastModified
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteProject(proj.id, e)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: STOCK LIBRARY */}
              {galleryTab === "stock" && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Globe size={24} className="text-green-500" /> Stock
                      Library
                      <span className="text-xs font-normal text-gray-500 ml-2 bg-gray-100 px-2 py-1 rounded">
                        Powered by Unsplash
                      </span>
                    </h2>
                    <button
                      onClick={loadMoreStockImages}
                      disabled={isLoadingStock}
                      className="text-sm flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RefreshCw
                        size={14}
                        className={isLoadingStock ? "animate-spin" : ""}
                      />
                      Load More
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-10">
                    {stockImages.map((img) => (
                      <div
                        key={img.id}
                        onClick={() =>
                          loadImageFromUrl(
                            img.url,
                            false,
                            galleryMode === "overlay"
                          )
                        }
                        className="relative group rounded-xl overflow-hidden cursor-pointer aspect-[4/3]"
                      >
                        <img
                          src={img.url}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          alt={img.title}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <span className="text-white font-medium text-sm">
                            {img.title}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <Plus size={16} className="text-blue-600" />
                        </div>
                      </div>
                    ))}
                    {isLoadingStock && (
                      <div className="col-span-full flex justify-center py-8">
                        <Loader className="animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: AI STUDIO */}
              {galleryTab === "ai" && (
                <div className="flex flex-col h-full">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Sparkles size={24} className="text-purple-500" /> AI Image
                    Generator
                    <span className="text-xs font-normal text-gray-500 ml-2 bg-purple-50 text-purple-600 px-2 py-1 rounded border border-purple-100">
                      Beta
                    </span>
                  </h2>

                  <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe the image you want to create... (e.g., 'A futuristic city with neon lights', 'A cute cat in space')"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm"
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleGenerateAI()
                        }
                      />
                      <Wand2
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                    </div>
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                      {isGenerating ? (
                        <Loader className="animate-spin" size={20} />
                      ) : (
                        <Sparkles size={20} />
                      )}
                      Generate
                    </button>
                  </div>

                  <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center bg-gray-50/50 relative overflow-hidden">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-4 animate-pulse">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium">
                          Dreaming up your image...
                        </p>
                      </div>
                    ) : generatedImage ? (
                      <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img
                          src={generatedImage}
                          className="max-w-full max-h-full rounded-lg shadow-xl"
                          alt="AI Generated"
                        />
                        <div className="absolute bottom-8 flex gap-4">
                          <button
                            onClick={() =>
                              loadImageFromUrl(
                                generatedImage,
                                true,
                                galleryMode === "overlay"
                              )
                            }
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
                          >
                            <Plus size={20} /> Use This Image
                          </button>
                          <button
                            onClick={() => setGeneratedImage(null)}
                            className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-full shadow-lg flex items-center gap-2"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 max-w-sm">
                        <Sparkles
                          size={64}
                          className="mx-auto mb-4 opacity-20"
                        />
                        <p className="text-lg font-medium text-gray-500">
                          Ready to create
                        </p>
                        <p className="text-sm">
                          Enter a prompt above and let AI generate a unique
                          image for you to edit.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Save size={20} className="text-emerald-600" />
              Save Project
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              How would you like to save your changes? You can overwrite the
              current project or create a new copy in your gallery.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSaveAction("overwrite")}
                disabled={!currentProjectId}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600 group-disabled:bg-gray-100 group-disabled:text-gray-400">
                    <FileEdit size={20} />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-gray-800">
                      Overwrite Existing
                    </span>
                    <span className="block text-xs text-gray-500">
                      Update current file ({currentProjectId || "None"})
                    </span>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleSaveAction("new")}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                    <Plus size={20} />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-gray-800">
                      Save as New
                    </span>
                    <span className="block text-xs text-gray-500">
                      Create a separate copy in gallery
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-white text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 z-50 ${
            notification.type === "error" ? "bg-red-600" : "bg-gray-800"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle size={16} />
          ) : (
            <Check size={16} />
          )}
          {notification.msg}
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTS ---

function ToolButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 w-16 rounded-lg transition-all ${
        active
          ? "bg-blue-50 text-blue-600 ring-2 ring-blue-500 ring-opacity-50"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
      }`}
    >
      <Icon size={24} strokeWidth={1.5} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-700 text-xs transition-colors"
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function PanelSection({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Sliders size={12} />
        {title}
      </h3>
      {children}
    </div>
  );
}
