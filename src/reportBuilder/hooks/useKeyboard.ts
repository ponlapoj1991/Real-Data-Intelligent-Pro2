/**
 * Keyboard Shortcuts Hook
 * Handles global keyboard shortcuts for the editor
 */

import { useEffect } from 'react';
import { useSlideStore } from '../store/useSlideStore';

export const useKeyboardShortcuts = () => {
  const {
    selectedElementIds,
    undo,
    redo,
    copyElements,
    cutElements,
    pasteElements,
    deleteElement,
    selectAll,
    duplicateElement,
    groupElements,
    ungroupElement,
  } = useSlideStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      // Prevent default for handled shortcuts
      const shouldPreventDefault = () => {
        if (isMod && e.key === 'z') return true;
        if (isMod && e.key === 'y') return true;
        if (isMod && isShift && e.key === 'z') return true;
        if (isMod && e.key === 'c') return true;
        if (isMod && e.key === 'x') return true;
        if (isMod && e.key === 'v') return true;
        if (isMod && e.key === 'a') return true;
        if (isMod && e.key === 'd') return true;
        if (isMod && e.key === 'g') return true;
        if (e.key === 'Delete' || e.key === 'Backspace') return true;
        return false;
      };

      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      if (shouldPreventDefault()) {
        e.preventDefault();
      }

      // Undo
      if (isMod && !isShift && e.key === 'z') {
        undo();
        return;
      }

      // Redo
      if ((isMod && e.key === 'y') || (isMod && isShift && e.key === 'z')) {
        redo();
        return;
      }

      // Copy
      if (isMod && e.key === 'c' && selectedElementIds.length > 0) {
        copyElements();
        return;
      }

      // Cut
      if (isMod && e.key === 'x' && selectedElementIds.length > 0) {
        cutElements();
        return;
      }

      // Paste
      if (isMod && e.key === 'v') {
        pasteElements();
        return;
      }

      // Select All
      if (isMod && e.key === 'a') {
        selectAll();
        return;
      }

      // Duplicate
      if (isMod && e.key === 'd' && selectedElementIds.length > 0) {
        selectedElementIds.forEach(id => duplicateElement(id));
        return;
      }

      // Group
      if (isMod && !isShift && e.key === 'g' && selectedElementIds.length >= 2) {
        groupElements(selectedElementIds);
        return;
      }

      // Ungroup
      if (isMod && isShift && e.key === 'g' && selectedElementIds.length === 1) {
        ungroupElement(selectedElementIds[0]);
        return;
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
        selectedElementIds.forEach(id => deleteElement(id));
        return;
      }

      // Arrow keys - move selected elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElementIds.length > 0) {
        e.preventDefault();
        const step = isShift ? 10 : 1;
        let dx = 0;
        let dy = 0;

        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        useSlideStore.getState().moveElements(selectedElementIds, dx, dy);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedElementIds,
    undo,
    redo,
    copyElements,
    cutElements,
    pasteElements,
    deleteElement,
    selectAll,
    duplicateElement,
    groupElements,
    ungroupElement,
  ]);
};
