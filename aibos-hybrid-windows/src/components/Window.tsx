import React, { ElementType, FC } from 'react';
import { Rnd } from 'react-rnd';
import { motion } from 'framer-motion';

interface WindowProps {
  id: string;
  component: ElementType;
  props?: Record<string, unknown>;
  zIndex?: number;
  onClose?: (id: string) => void;
  title?: string;
}

export const Window: FC<WindowProps> = function Window({ id, component: Component, props, zIndex, onClose, title }: WindowProps) {
  return (
    <Rnd
      default={{
        x: 100,
        y: 100,
        width: 600,
        height: 400,
      }}
      bounds="parent"
      style={{ zIndex }}
      minWidth={300}
      minHeight={200}
      dragHandleClassName="window-title-bar"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[#1f2937] rounded-xl shadow-2xl border border-gray-700 h-full flex flex-col"
      >
        <div className="window-title-bar flex items-center justify-between px-4 py-2 bg-[#111827] rounded-t-xl cursor-move">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span>
            <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block"></span>
            <span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span>
          </div>
          <span className="text-xs text-gray-200 font-semibold">
            {title || 'App'}
          </span>
          <button
            type="button"
            className="text-gray-400 hover:text-red-400"
            aria-label="Close window"
            title="Close window"
            onClick={() => onClose && onClose(id)}
          >
            ×
          </button>
        </div>
        <div className="p-4 text-gray-200 flex-1 overflow-auto">
          <Component {...props} />
        </div>
      </motion.div>
    </Rnd>
  );
};
