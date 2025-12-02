/**
 * Zustand Store for Report Builder v2
 * Manages slides, elements, selection, and history
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Slide, PPTElement, SlideTheme, MasterSlide, Presentation } from '../types/slides';

// ============================================
// Store State Interface
// ============================================

interface SlideStore {
  // Presentation Data
  presentation: Presentation | null;
  currentSlideId: string | null;

  // Selection State
  selectedElementIds: string[];
  hoveredElementId: string | null;

  // Canvas State
  canvasScale: number;
  canvasViewport: { x: number; y: number };
  showGrid: boolean;
  showRuler: boolean;
  snapToGrid: boolean;

  // Clipboard
  clipboard: PPTElement[];

  // History (for undo/redo)
  history: Presentation[];
  historyIndex: number;

  // Actions - Presentation
  createPresentation: (title: string, width?: number, height?: number) => void;
  loadPresentation: (presentation: Presentation) => void;
  updatePresentationTitle: (title: string) => void;

  // Actions - Slides
  addSlide: (afterId?: string) => void;
  deleteSlide: (id: string) => void;
  duplicateSlide: (id: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setCurrentSlide: (id: string) => void;
  updateSlideBackground: (id: string, background: Slide['background']) => void;
  getCurrentSlide: () => Slide | null;

  // Actions - Elements
  addElement: (element: Omit<PPTElement, 'id'>) => void;
  updateElement: (id: string, updates: Partial<PPTElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;

  // Actions - Selection
  selectElement: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setHoveredElement: (id: string | null) => void;

  // Actions - Clipboard
  copyElements: () => void;
  cutElements: () => void;
  pasteElements: () => void;

  // Actions - Transform
  moveElements: (ids: string[], dx: number, dy: number) => void;
  resizeElement: (id: string, width: number, height: number) => void;
  rotateElement: (id: string, rotate: number) => void;

  // Actions - Layer
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  moveElementToTop: (id: string) => void; // Alias for bringToFront
  moveElementToBottom: (id: string) => void; // Alias for sendToBack

  // Actions - Grouping
  groupElements: (ids: string[]) => void;
  ungroupElement: (groupId: string) => void;
  moveElementUp: (id: string) => void; // Alias for bringForward
  moveElementDown: (id: string) => void; // Alias for sendBackward

  // Actions - Canvas
  setCanvasScale: (scale: number) => void;
  setCanvasViewport: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleRuler: () => void;
  toggleSnap: () => void;

  // Actions - History
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Actions - Master Slides
  addMasterSlide: (master: MasterSlide) => void;
  updateMasterSlide: (id: string, updates: Partial<MasterSlide>) => void;
  deleteMasterSlide: (id: string) => void;
}

// ============================================
// Default Values
// ============================================

const DEFAULT_THEME: SlideTheme = {
  backgroundColor: '#FFFFFF',
  themeColors: ['#2F88FF', '#52C41A', '#FA8C16', '#F5222D', '#722ED1', '#13C2C2'],
  fontColor: '#000000',
  fontName: 'Arial',
  outline: {
    width: 2,
    color: '#000000',
    style: 'solid',
  },
  shadow: {
    h: 0,
    v: 0,
    blur: 10,
    color: 'rgba(0, 0, 0, 0.5)',
  },
};

// ============================================
// Store Implementation
// ============================================

export const useSlideStore = create<SlideStore>((set, get) => ({
  // Initial State
  presentation: null,
  currentSlideId: null,
  selectedElementIds: [],
  hoveredElementId: null,
  canvasScale: 1,
  canvasViewport: { x: 0, y: 0 },
  showGrid: true,
  showRuler: true,
  snapToGrid: true,
  clipboard: [],
  history: [],
  historyIndex: -1,

  // ============================================
  // Presentation Actions
  // ============================================

  createPresentation: (title, width = 960, height = 540) => {
    const presentation: Presentation = {
      id: nanoid(),
      title,
      slides: [{
        id: nanoid(),
        elements: [],
        background: { type: 'solid', color: '#FFFFFF' },
      }],
      theme: DEFAULT_THEME,
      masterSlides: [],
      width,
      height,
    };

    set({
      presentation,
      currentSlideId: presentation.slides[0].id,
      history: [presentation],
      historyIndex: 0,
    });
  },

  loadPresentation: (presentation) => {
    set({
      presentation,
      currentSlideId: presentation.slides[0]?.id || null,
      selectedElementIds: [],
      history: [presentation],
      historyIndex: 0,
    });
  },

  updatePresentationTitle: (title) => {
    const { presentation } = get();
    if (!presentation) return;

    set({
      presentation: { ...presentation, title },
    });
    get().saveHistory();
  },

  // ============================================
  // Slide Actions
  // ============================================

  addSlide: (afterId) => {
    const { presentation } = get();
    if (!presentation) return;

    const newSlide: Slide = {
      id: nanoid(),
      elements: [],
      background: { type: 'solid', color: '#FFFFFF' },
    };

    const slides = [...presentation.slides];
    if (afterId) {
      const index = slides.findIndex(s => s.id === afterId);
      slides.splice(index + 1, 0, newSlide);
    } else {
      slides.push(newSlide);
    }

    set({
      presentation: { ...presentation, slides },
      currentSlideId: newSlide.id,
    });
    get().saveHistory();
  },

  deleteSlide: (id) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || presentation.slides.length === 1) return;

    const slides = presentation.slides.filter(s => s.id !== id);
    const newCurrentId = currentSlideId === id ? slides[0].id : currentSlideId;

    set({
      presentation: { ...presentation, slides },
      currentSlideId: newCurrentId,
    });
    get().saveHistory();
  },

  duplicateSlide: (id) => {
    const { presentation } = get();
    if (!presentation) return;

    const index = presentation.slides.findIndex(s => s.id === id);
    if (index === -1) return;

    const original = presentation.slides[index];
    const duplicate: Slide = {
      ...original,
      id: nanoid(),
      elements: original.elements.map(el => ({
        ...el,
        id: nanoid(),
      })),
    };

    const slides = [...presentation.slides];
    slides.splice(index + 1, 0, duplicate);

    set({
      presentation: { ...presentation, slides },
      currentSlideId: duplicate.id,
    });
    get().saveHistory();
  },

  reorderSlides: (fromIndex, toIndex) => {
    const { presentation } = get();
    if (!presentation) return;

    const slides = [...presentation.slides];
    const [moved] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, moved);

    set({
      presentation: { ...presentation, slides },
    });
    get().saveHistory();
  },

  setCurrentSlide: (id) => {
    set({ currentSlideId: id, selectedElementIds: [] });
  },

  updateSlideBackground: (id, background) => {
    const { presentation } = get();
    if (!presentation) return;

    const slides = presentation.slides.map(slide =>
      slide.id === id ? { ...slide, background } : slide
    );

    set({
      presentation: { ...presentation, slides },
    });
    get().saveHistory();
  },

  getCurrentSlide: () => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return null;
    return presentation.slides.find(slide => slide.id === currentSlideId) || null;
  },

  // ============================================
  // Element Actions
  // ============================================

  addElement: (element) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const newElement: PPTElement = {
      ...element,
      id: nanoid(),
    } as PPTElement;

    const slides = presentation.slides.map(slide =>
      slide.id === currentSlideId
        ? { ...slide, elements: [...slide.elements, newElement] }
        : slide
    );

    set({
      presentation: { ...presentation, slides },
      selectedElementIds: [newElement.id],
    });
    get().saveHistory();
  },

  updateElement: (id, updates) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const slides = presentation.slides.map(slide =>
      slide.id === currentSlideId
        ? {
            ...slide,
            elements: slide.elements.map(el =>
              el.id === id ? { ...el, ...updates } : el
            ),
          }
        : slide
    );

    set({
      presentation: { ...presentation, slides },
    });
  },

  deleteElement: (id) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const slides = presentation.slides.map(slide =>
      slide.id === currentSlideId
        ? { ...slide, elements: slide.elements.filter(el => el.id !== id) }
        : slide
    );

    set({
      presentation: { ...presentation, slides },
      selectedElementIds: get().selectedElementIds.filter(eid => eid !== id),
    });
    get().saveHistory();
  },

  duplicateElement: (id) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const currentSlide = presentation.slides.find(s => s.id === currentSlideId);
    if (!currentSlide) return;

    const element = currentSlide.elements.find(el => el.id === id);
    if (!element) return;

    const duplicate: PPTElement = {
      ...element,
      id: nanoid(),
      left: element.left + 20,
      top: element.top + 20,
    };

    const slides = presentation.slides.map(slide =>
      slide.id === currentSlideId
        ? { ...slide, elements: [...slide.elements, duplicate] }
        : slide
    );

    set({
      presentation: { ...presentation, slides },
      selectedElementIds: [duplicate.id],
    });
    get().saveHistory();
  },

  // ============================================
  // Selection Actions
  // ============================================

  selectElement: (id, multi = false) => {
    const { selectedElementIds } = get();

    if (multi) {
      const newSelection = selectedElementIds.includes(id)
        ? selectedElementIds.filter(eid => eid !== id)
        : [...selectedElementIds, id];
      set({ selectedElementIds: newSelection });
    } else {
      set({ selectedElementIds: [id] });
    }
  },

  clearSelection: () => {
    set({ selectedElementIds: [] });
  },

  selectAll: () => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const currentSlide = presentation.slides.find(s => s.id === currentSlideId);
    if (!currentSlide) return;

    const allIds = currentSlide.elements.map(el => el.id);
    set({ selectedElementIds: allIds });
  },

  setHoveredElement: (id) => {
    set({ hoveredElementId: id });
  },

  // ============================================
  // Clipboard Actions
  // ============================================

  copyElements: () => {
    const { presentation, currentSlideId, selectedElementIds } = get();
    if (!presentation || !currentSlideId) return;

    const currentSlide = presentation.slides.find(s => s.id === currentSlideId);
    if (!currentSlide) return;

    const elements = currentSlide.elements.filter(el =>
      selectedElementIds.includes(el.id)
    );

    set({ clipboard: elements });
  },

  cutElements: () => {
    get().copyElements();
    const { selectedElementIds } = get();
    selectedElementIds.forEach(id => get().deleteElement(id));
  },

  pasteElements: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;

    clipboard.forEach(element => {
      get().addElement({
        ...element,
        left: element.left + 20,
        top: element.top + 20,
      });
    });
  },

  // ============================================
  // Transform Actions
  // ============================================

  moveElements: (ids, dx, dy) => {
    ids.forEach(id => {
      const { presentation, currentSlideId } = get();
      if (!presentation || !currentSlideId) return;

      const currentSlide = presentation.slides.find(s => s.id === currentSlideId);
      if (!currentSlide) return;

      const element = currentSlide.elements.find(el => el.id === id);
      if (!element) return;

      get().updateElement(id, {
        left: element.left + dx,
        top: element.top + dy,
      });
    });
    get().saveHistory();
  },

  resizeElement: (id, width, height) => {
    get().updateElement(id, { width, height });
    get().saveHistory();
  },

  rotateElement: (id, rotate) => {
    get().updateElement(id, { rotate });
    get().saveHistory();
  },

  // ============================================
  // Layer Actions
  // ============================================

  bringToFront: (id) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const slides = presentation.slides.map(slide => {
      if (slide.id !== currentSlideId) return slide;

      const elements = [...slide.elements];
      const index = elements.findIndex(el => el.id === id);
      if (index === -1 || index === elements.length - 1) return slide;

      const [element] = elements.splice(index, 1);
      elements.push(element);

      return { ...slide, elements };
    });

    set({ presentation: { ...presentation, slides } });
    get().saveHistory();
  },

  sendToBack: (id) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const slides = presentation.slides.map(slide => {
      if (slide.id !== currentSlideId) return slide;

      const elements = [...slide.elements];
      const index = elements.findIndex(el => el.id === id);
      if (index === -1 || index === 0) return slide;

      const [element] = elements.splice(index, 1);
      elements.unshift(element);

      return { ...slide, elements };
    });

    set({ presentation: { ...presentation, slides } });
    get().saveHistory();
  },

  bringForward: (id) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const slides = presentation.slides.map(slide => {
      if (slide.id !== currentSlideId) return slide;

      const elements = [...slide.elements];
      const index = elements.findIndex(el => el.id === id);
      if (index === -1 || index === elements.length - 1) return slide;

      [elements[index], elements[index + 1]] = [elements[index + 1], elements[index]];

      return { ...slide, elements };
    });

    set({ presentation: { ...presentation, slides } });
    get().saveHistory();
  },

  sendBackward: (id) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const slides = presentation.slides.map(slide => {
      if (slide.id !== currentSlideId) return slide;

      const elements = [...slide.elements];
      const index = elements.findIndex(el => el.id === id);
      if (index === -1 || index === 0) return slide;

      [elements[index - 1], elements[index]] = [elements[index], elements[index - 1]];

      return { ...slide, elements };
    });

    set({ presentation: { ...presentation, slides } });
    get().saveHistory();
  },

  // Aliases for layer functions (Inspector panel compatibility)
  moveElementToTop: (id) => get().bringToFront(id),
  moveElementToBottom: (id) => get().sendToBack(id),
  moveElementUp: (id) => get().bringForward(id),
  moveElementDown: (id) => get().sendBackward(id),

  // ============================================
  // Grouping Actions
  // ============================================

  groupElements: (ids) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId || ids.length < 2) return;

    const currentSlide = presentation.slides.find(s => s.id === currentSlideId);
    if (!currentSlide) return;

    // Get elements to group
    const elementsToGroup = currentSlide.elements.filter(el => ids.includes(el.id));
    if (elementsToGroup.length < 2) return;

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elementsToGroup.forEach(el => {
      const elMaxX = el.left + el.width;
      const elMaxY = el.top + ('height' in el ? el.height : 0);
      minX = Math.min(minX, el.left);
      minY = Math.min(minY, el.top);
      maxX = Math.max(maxX, elMaxX);
      maxY = Math.max(maxY, elMaxY);
    });

    // Create group element
    const groupId = nanoid(10);
    const groupElement: PPTElement = {
      id: groupId,
      type: 'group',
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotate: 0,
      elements: elementsToGroup.map(el => ({
        ...el,
        left: el.left - minX,
        top: el.top - minY,
      })),
    };

    // Remove grouped elements and add group
    const newElements = currentSlide.elements.filter(el => !ids.includes(el.id));
    newElements.push(groupElement);

    const slides = presentation.slides.map(slide =>
      slide.id === currentSlideId
        ? { ...slide, elements: newElements }
        : slide
    );

    set({
      presentation: { ...presentation, slides },
      selectedElementIds: [groupId],
    });
    get().saveHistory();
  },

  ungroupElement: (groupId) => {
    const { presentation, currentSlideId } = get();
    if (!presentation || !currentSlideId) return;

    const currentSlide = presentation.slides.find(s => s.id === currentSlideId);
    if (!currentSlide) return;

    const groupElement = currentSlide.elements.find(el => el.id === groupId);
    if (!groupElement || groupElement.type !== 'group') return;

    // Restore elements with absolute positions
    const restoredElements = groupElement.elements.map(el => ({
      ...el,
      left: el.left + groupElement.left,
      top: el.top + groupElement.top,
      id: nanoid(10), // Generate new IDs
    }));

    // Remove group and add restored elements
    const newElements = currentSlide.elements.filter(el => el.id !== groupId);
    newElements.push(...restoredElements);

    const slides = presentation.slides.map(slide =>
      slide.id === currentSlideId
        ? { ...slide, elements: newElements }
        : slide
    );

    set({
      presentation: { ...presentation, slides },
      selectedElementIds: restoredElements.map(el => el.id),
    });
    get().saveHistory();
  },

  // ============================================
  // Canvas Actions
  // ============================================

  setCanvasScale: (scale) => {
    set({ canvasScale: Math.max(0.1, Math.min(3, scale)) });
  },

  setCanvasViewport: (x, y) => {
    set({ canvasViewport: { x, y } });
  },

  toggleGrid: () => {
    set({ showGrid: !get().showGrid });
  },

  toggleRuler: () => {
    set({ showRuler: !get().showRuler });
  },

  toggleSnap: () => {
    set({ snapToGrid: !get().snapToGrid });
  },

  // ============================================
  // History Actions
  // ============================================

  saveHistory: () => {
    const { presentation, history, historyIndex } = get();
    if (!presentation) return;

    // Remove any history after current index
    const newHistory = history.slice(0, historyIndex + 1);

    // Add current state
    newHistory.push(JSON.parse(JSON.stringify(presentation)));

    // Limit history to 50 items
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      set({ historyIndex: historyIndex + 1 });
    }

    set({ history: newHistory });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    set({
      presentation: JSON.parse(JSON.stringify(history[newIndex])),
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    set({
      presentation: JSON.parse(JSON.stringify(history[newIndex])),
      historyIndex: newIndex,
    });
  },

  // ============================================
  // Master Slide Actions
  // ============================================

  addMasterSlide: (master) => {
    const { presentation } = get();
    if (!presentation) return;

    set({
      presentation: {
        ...presentation,
        masterSlides: [...presentation.masterSlides, master],
      },
    });
    get().saveHistory();
  },

  updateMasterSlide: (id, updates) => {
    const { presentation } = get();
    if (!presentation) return;

    const masterSlides = presentation.masterSlides.map(master =>
      master.id === id ? { ...master, ...updates } : master
    );

    set({
      presentation: { ...presentation, masterSlides },
    });
    get().saveHistory();
  },

  deleteMasterSlide: (id) => {
    const { presentation } = get();
    if (!presentation) return;

    const masterSlides = presentation.masterSlides.filter(m => m.id !== id);

    set({
      presentation: { ...presentation, masterSlides },
    });
    get().saveHistory();
  },
}));
