/**
 * Context Menu Component
 * Right-click menu for element actions
 */

import React, { useEffect, useRef } from 'react';
import { Copy, Scissors, Trash2, Lock, Unlock, Layers, Group, Ungroup } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  selectedCount: number;
  isGroup: boolean;
  isLocked: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDelete: () => void;
  onLock: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  selectedCount,
  isGroup,
  isLocked,
  onClose,
  onCopy,
  onCut,
  onDelete,
  onLock,
  onGroup,
  onUngroup,
  onBringToFront,
  onSendToBack,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const MenuItem = ({
    icon: Icon,
    label,
    shortcut,
    onClick,
    disabled = false,
  }: {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
      }`}
      onClick={() => {
        if (!disabled) {
          onClick();
          onClose();
        }
      }}
      disabled={disabled}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} />
        <span>{label}</span>
      </div>
      {shortcut && (
        <span className="text-xs text-gray-400">{shortcut}</span>
      )}
    </button>
  );

  const Divider = () => <div className="h-px bg-gray-200 my-1" />;

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[200px]"
      style={{
        left: x,
        top: y,
      }}
    >
      <MenuItem icon={Copy} label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
      <MenuItem icon={Scissors} label="Cut" shortcut="Ctrl+X" onClick={onCut} />
      <MenuItem
        icon={Trash2}
        label="Delete"
        shortcut="Del"
        onClick={onDelete}
      />

      <Divider />

      {selectedCount >= 2 && !isGroup && (
        <MenuItem
          icon={Group}
          label="Group"
          shortcut="Ctrl+G"
          onClick={onGroup}
        />
      )}

      {isGroup && (
        <MenuItem
          icon={Ungroup}
          label="Ungroup"
          shortcut="Ctrl+Shift+G"
          onClick={onUngroup}
        />
      )}

      <Divider />

      <MenuItem
        icon={Layers}
        label="Bring to Front"
        onClick={onBringToFront}
      />
      <MenuItem
        icon={Layers}
        label="Send to Back"
        onClick={onSendToBack}
      />

      <Divider />

      <MenuItem
        icon={isLocked ? Unlock : Lock}
        label={isLocked ? 'Unlock' : 'Lock'}
        onClick={onLock}
      />
    </div>
  );
};
