import React from "react";
import { motion } from "framer-motion";
import { Trash2, Check } from "lucide-react";
import { NOTE_COLORS } from "./noteColors";

// Slight per-note rotation so the board feels hand-pinned.
const rotateFor = (id) => {
  if (!id) return 0;
  const seed = id.charCodeAt(id.length - 1) + id.charCodeAt(0);
  return ((seed % 7) - 3) * 1.4; // -4.2deg .. +4.2deg
};

export default function StickyNote({ task, onEdit, onDelete, onToggleComplete, compact }) {
  const c = NOTE_COLORS[task.color] || NOTE_COLORS.yellow;
  const rotate = rotateFor(task.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(task);
      }}
      className="relative cursor-pointer select-none group"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        boxShadow: "0 6px 14px -6px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      {/* push-pin */}
      <span
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
        style={{ background: c.pin, boxShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
      />

      <div className="px-2.5 pt-2.5 pb-2">
        <div className="flex items-start gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task);
            }}
            className="mt-0.5 shrink-0 w-4 h-4 rounded-sm border flex items-center justify-center transition-colors"
            style={{
              borderColor: c.text,
              background: task.completed ? c.pin : "transparent",
            }}
            aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          >
            {task.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>

          <div className="min-w-0 flex-1">
            <p
              className="font-semibold leading-tight text-[13px]"
              style={{
                textDecoration: task.completed ? "line-through" : "none",
                opacity: task.completed ? 0.6 : 1,
              }}
            >
              {task.title}
            </p>
            {task.step_total > 1 && (
              <p className="text-[10px] mt-0.5 opacity-70">
                Step {task.step_index}/{task.step_total}
              </p>
            )}
            {!compact && task.description && (
              <p className="text-[11px] mt-1 leading-snug line-clamp-3 opacity-80 whitespace-pre-wrap">
                {task.description}
              </p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/5"
            style={{ color: c.text }}
            aria-label="Throw in trash"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}