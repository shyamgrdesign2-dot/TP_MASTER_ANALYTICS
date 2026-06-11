import isHotkey from 'is-hotkey';
import PropTypes from 'prop-types';
import React, { useCallback, useMemo } from 'react';
import {
  Editor,
  Element as SlateElement,
  Transforms,
  createEditor,
} from 'slate';
import { withHistory } from 'slate-history';
import { Editable, Slate, useSlate, withReact } from 'slate-react';
import { Button, Icon, Toolbar } from './components.jsx';
import './styles.scss';

const DEFAULT_HOTKEYS = {
  'mod+b': 'bold',
};

const DEFAULT_TOOLBAR_BUTTONS = [
  { type: 'mark', format: 'bold', icon: 'format_bold' },
  { type: 'block', format: 'bulleted-list', icon: 'format_list_bulleted' },
  { type: 'block', format: 'numbered-list', icon: 'format_list_numbered' },
];

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(
    editor,
    format,
    isAlignType(format) ? 'align' : 'type'
  );
  const isList = isListType(format);
  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      isListType(n.type) &&
      !isAlignType(format),
    split: true,
  });
  let newProperties;
  if (isAlignType(format)) {
    newProperties = {
      align: isActive ? undefined : format,
    };
  } else {
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    };
  }
  Transforms.setNodes(editor, newProperties);
  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isBlockActive = (editor, format, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;
  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n => {
        if (!Editor.isEditor(n) && SlateElement.isElement(n)) {
          if (blockType === 'align' && isAlignElement(n)) {
            return n.align === format;
          }
          return n.type === format;
        }
        return false;
      },
    })
  );
  return !!match;
};

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

const Element = ({ attributes, children, element }) => {
  const style = {};
  if (isAlignElement(element)) {
    style.textAlign = element.align;
  }
  switch (element.type) {
    case 'bulleted-list':
      return (
        <ul style={style} {...attributes}>
          {children}
        </ul>
      );
    case 'list-item':
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      );
    case 'numbered-list':
      return (
        <ol style={style} {...attributes}>
          {children}
        </ol>
      );
    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      );
  }
};

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  return <span {...attributes}>{children}</span>;
};

const BlockButton = ({ format, icon, onButtonClick }) => {
  const editor = useSlate();

  const handleClick = useCallback(
    event => {
      event.preventDefault();
      event.stopPropagation();

      if (onButtonClick) {
        const handled = onButtonClick('block', format, editor, event);
        if (handled) return;
      }

      toggleBlock(editor, format);
    },
    [format, onButtonClick, editor]
  );

  return (
    <Button
      active={isBlockActive(
        editor,
        format,
        isAlignType(format) ? 'align' : 'type'
      )}
      onMouseDown={handleClick}
    >
      <Icon>{icon}</Icon>
    </Button>
  );
};

const MarkButton = ({ format, icon, onButtonClick }) => {
  const editor = useSlate();

  const handleClick = useCallback(
    event => {
      event.preventDefault();
      event.stopPropagation();

      if (onButtonClick) {
        const handled = onButtonClick('mark', format, editor, event);
        if (handled) return;
      }

      toggleMark(editor, format);
    },
    [format, onButtonClick, editor]
  );

  return (
    <Button active={isMarkActive(editor, format)} onMouseDown={handleClick}>
      <Icon>{icon}</Icon>
    </Button>
  );
};

const isAlignType = format => {
  return TEXT_ALIGN_TYPES.includes(format);
};

const isListType = format => {
  return LIST_TYPES.includes(format);
};

const isAlignElement = element => {
  return 'align' in element;
};

const defaultInitialValue = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const RichTextEditor = ({
  initialValue: customInitialValue,
  value: controlledValue,
  placeholder = 'Enter text…',
  spellCheck = true,
  autoFocus = false,
  hotkeys = DEFAULT_HOTKEYS,
  toolbarButtons = DEFAULT_TOOLBAR_BUTTONS,
  onHotkeyPress,
  onButtonClick,
  onChange,
  readOnly = false,
  showToolbar = true,
  className,
  style,
  ...props
}) => {
  const renderElement = useCallback(props => <Element {...props} />, []);
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  const initialValue = controlledValue || customInitialValue || defaultInitialValue;

  const handleKeyDown = useCallback(
    event => {
      for (const hotkey in hotkeys) {
        if (isHotkey(hotkey, event)) {
          event.preventDefault();
          const mark = hotkeys[hotkey];

          if (onHotkeyPress) {
            const handled = onHotkeyPress(hotkey, mark, editor, event);
            if (handled) return;
          }

          toggleMark(editor, mark);
        }
      }
    },
    [hotkeys, onHotkeyPress, editor]
  );

  const handleChange = useCallback(
    value => {
      if (onChange) {
        onChange(value);
      }
    },
    [onChange]
  );

  return (
    <div className={`richTextEditor ${className || ''}`} style={style} {...props}>
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={handleChange}
      >
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder}
          spellCheck={spellCheck}
          autoFocus={autoFocus}
          readOnly={readOnly}
          onKeyDown={handleKeyDown}
        />
        {showToolbar && (
          <Toolbar>
            {toolbarButtons.map((button, index) => {
              if (button.type === 'mark') {
                return (
                  <MarkButton
                    key={`${button.format}-${index}`}
                    format={button.format}
                    icon={button.icon}
                    onButtonClick={onButtonClick}
                  />
                );
              } else if (button.type === 'block') {
                return (
                  <BlockButton
                    key={`${button.format}-${index}`}
                    format={button.format}
                    icon={button.icon}
                    onButtonClick={onButtonClick}
                  />
                );
              }
              return null;
            })}
          </Toolbar>
        )}
      </Slate>
    </div>
  );
};

RichTextEditor.propTypes = {
  initialValue: PropTypes.arrayOf(PropTypes.object),
  value: PropTypes.arrayOf(PropTypes.object),
  placeholder: PropTypes.string,
  spellCheck: PropTypes.bool,
  autoFocus: PropTypes.bool,
  hotkeys: PropTypes.object,
  toolbarButtons: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['mark', 'block']).isRequired,
      format: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
    })
  ),
  onHotkeyPress: PropTypes.func,
  onButtonClick: PropTypes.func,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  showToolbar: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default RichTextEditor;
