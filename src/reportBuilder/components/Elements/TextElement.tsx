/**
 * Text Element Component
 * Renders text with ProseMirror rich text editing
 */

import React, { useRef, useEffect, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import type { PPTTextElement } from '../../types/slides';
import { createEditorState, exportHTML } from '../../utils/prosemirror';
import { useSlideStore } from '../../store/useSlideStore';

interface TextElementProps {
  element: PPTTextElement;
  isSelected: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

export const TextElement: React.FC<TextElementProps> = ({
  element,
  isSelected,
  isEditing,
  onStartEdit,
  onStopEdit,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorState, setEditorState] = useState<EditorState>(() =>
    createEditorState(element.content)
  );

  const updateElement = useSlideStore(state => state.updateElement);

  // Initialize ProseMirror editor
  useEffect(() => {
    if (isEditing && editorRef.current && !viewRef.current) {
      const view = new EditorView(editorRef.current, {
        state: editorState,
        dispatchTransaction: (transaction) => {
          const newState = view.state.apply(transaction);
          view.updateState(newState);
          setEditorState(newState);

          // Update element content
          const html = exportHTML(newState);
          updateElement(element.id, { content: html });
        },
        attributes: {
          class: 'prose-editor',
        },
      });

      viewRef.current = view;
      view.focus();

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }
  }, [isEditing, element.id, editorState, updateElement]);

  // Handle double-click to edit
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEdit();
  };

  // Handle blur to stop editing
  const handleBlur = () => {
    setTimeout(() => {
      onStopEdit();
    }, 100);
  };

  const textStyle: React.CSSProperties = {
    fontFamily: element.defaultFontName,
    color: element.defaultColor,
    lineHeight: element.lineHeight ?? 1.5,
    letterSpacing: element.wordSpace ? `${element.wordSpace}px` : undefined,
    opacity: element.opacity ?? 1,
    textAlign: 'left',
    padding: '8px',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    wordWrap: 'break-word',
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: element.fill,
    border: element.outline
      ? `${element.outline.width}px ${element.outline.style} ${element.outline.color}`
      : undefined,
    borderRadius: '4px',
    boxShadow: element.shadow
      ? `${element.shadow.h}px ${element.shadow.v}px ${element.shadow.blur}px ${element.shadow.color}`
      : undefined,
  };

  if (isEditing) {
    return (
      <div style={containerStyle}>
        <div
          ref={editorRef}
          style={textStyle}
          onBlur={handleBlur}
          className="prose prose-sm max-w-none"
        />
      </div>
    );
  }

  return (
    <div
      style={containerStyle}
      onDoubleClick={handleDoubleClick}
      className="cursor-text"
    >
      <div
        style={textStyle}
        dangerouslySetInnerHTML={{ __html: element.content }}
        className="prose prose-sm max-w-none pointer-events-none"
      />
    </div>
  );
};
