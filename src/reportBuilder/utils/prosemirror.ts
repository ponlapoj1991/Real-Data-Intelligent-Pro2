/**
 * ProseMirror Setup & Configuration
 * Rich text editor for Text elements
 */

import { Schema } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { EditorState, Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { inputRules, wrappingInputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import { gapCursor } from 'prosemirror-gapcursor';
import { dropCursor } from 'prosemirror-dropcursor';

// ============================================
// Schema Configuration
// ============================================

const listNodes = addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block');

export const textSchema = new Schema({
  nodes: listNodes,
  marks: basicSchema.spec.marks,
});

// ============================================
// Input Rules (Markdown-style shortcuts)
// ============================================

function buildInputRules(schema: Schema) {
  const rules = [];

  // Bullet list: "- " or "* "
  const bulletListRule = wrappingInputRule(
    /^\s*([-*])\s$/,
    schema.nodes.bullet_list
  );
  rules.push(bulletListRule);

  // Ordered list: "1. "
  const orderedListRule = wrappingInputRule(
    /^(\d+)\.\s$/,
    schema.nodes.ordered_list,
    match => ({ order: +match[1] }),
    (match, node) => node.childCount + node.attrs.order === +match[1]
  );
  rules.push(orderedListRule);

  // Heading: "# ", "## ", "### "
  for (let i = 1; i <= 6; i++) {
    const headingRule = textblockTypeInputRule(
      new RegExp(`^(#{${i}})\\s$`),
      schema.nodes.heading,
      { level: i }
    );
    rules.push(headingRule);
  }

  // Code block: "```"
  const codeBlockRule = textblockTypeInputRule(
    /^```$/,
    schema.nodes.code_block
  );
  rules.push(codeBlockRule);

  return inputRules({ rules });
}

// ============================================
// Custom Keymap
// ============================================

function buildKeymap(schema: Schema) {
  const keys: { [key: string]: any } = { ...baseKeymap };

  // Undo/Redo
  keys['Mod-z'] = undo;
  keys['Mod-y'] = redo;
  keys['Mod-Shift-z'] = redo;

  // Bold
  keys['Mod-b'] = (state: EditorState, dispatch: any) => {
    const { strong } = schema.marks;
    const { $from, $to } = state.selection;
    const mark = strong.create();

    if (dispatch) {
      if (state.selection.empty) {
        dispatch(state.tr.addStoredMark(mark));
      } else {
        dispatch(state.tr.addMark($from.pos, $to.pos, mark));
      }
    }
    return true;
  };

  // Italic
  keys['Mod-i'] = (state: EditorState, dispatch: any) => {
    const { em } = schema.marks;
    const { $from, $to } = state.selection;
    const mark = em.create();

    if (dispatch) {
      if (state.selection.empty) {
        dispatch(state.tr.addStoredMark(mark));
      } else {
        dispatch(state.tr.addMark($from.pos, $to.pos, mark));
      }
    }
    return true;
  };

  // Code
  keys['Mod-`'] = (state: EditorState, dispatch: any) => {
    const { code } = schema.marks;
    const { $from, $to } = state.selection;
    const mark = code.create();

    if (dispatch) {
      if (state.selection.empty) {
        dispatch(state.tr.addStoredMark(mark));
      } else {
        dispatch(state.tr.addMark($from.pos, $to.pos, mark));
      }
    }
    return true;
  };

  return keymap(keys);
}

// ============================================
// Create Editor State
// ============================================

export function createEditorState(content?: string): EditorState {
  let doc;

  if (content) {
    try {
      // Parse HTML content
      const parser = new DOMParser();
      const dom = parser.parseFromString(content, 'text/html');
      doc = textSchema.nodeFromDOM(dom.body);
    } catch (e) {
      doc = textSchema.node('doc', null, [
        textSchema.node('paragraph', null, content ? [textSchema.text(content)] : []),
      ]);
    }
  } else {
    doc = textSchema.node('doc', null, [
      textSchema.node('paragraph'),
    ]);
  }

  return EditorState.create({
    doc,
    plugins: [
      buildInputRules(textSchema),
      buildKeymap(textSchema),
      history(),
      gapCursor(),
      dropCursor(),
      // Custom placeholder plugin
      new Plugin({
        props: {
          attributes: { class: 'prose-editor' },
        },
      }),
    ],
  });
}

// ============================================
// Export HTML from Editor State
// ============================================

export function exportHTML(state: EditorState): string {
  const div = document.createElement('div');
  const fragment = state.doc.content;

  fragment.forEach((node) => {
    const dom = node.type.spec.toDOM?.(node);
    if (dom) {
      if (Array.isArray(dom)) {
        const element = document.createElement(dom[0]);
        if (dom[1] && typeof dom[1] === 'object' && !Array.isArray(dom[1])) {
          Object.entries(dom[1]).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
          });
        }
        element.textContent = node.textContent;
        div.appendChild(element);
      }
    }
  });

  return div.innerHTML;
}

// ============================================
// Formatting Commands
// ============================================

export const toggleMark = (markType: string) => (state: EditorState, dispatch?: any) => {
  const mark = textSchema.marks[markType];
  if (!mark) return false;

  const { from, to } = state.selection;
  const hasMark = state.doc.rangeHasMark(from, to, mark);

  if (dispatch) {
    if (hasMark) {
      dispatch(state.tr.removeMark(from, to, mark));
    } else {
      dispatch(state.tr.addMark(from, to, mark.create()));
    }
  }

  return true;
};

export const setBlockType = (nodeType: string, attrs?: any) => (
  state: EditorState,
  dispatch?: any
) => {
  const node = textSchema.nodes[nodeType];
  if (!node) return false;

  const { $from, $to } = state.selection;

  if (dispatch) {
    dispatch(state.tr.setBlockType($from.pos, $to.pos, node, attrs));
  }

  return true;
};
