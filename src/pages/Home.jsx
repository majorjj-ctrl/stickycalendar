import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  format, isSameMonth, isSameDay, isToday, addMonths, parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import StickyNote from "@/components/sticky-board/StickyNote";
import TaskFormDialog from "@/components/sticky-board/TaskFormDialog";
import TrashCan from "@/components/sticky-board/TrashCan";
import { NOTE_COLORS } from "@/components/sticky-board/noteColors";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Home() {
  const [viewDate, setViewDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [presetDate, setPresetDate] = useState(null);
  const [trashing, setTrashing] = useState(null); // { task, rect, rotate }
  const trashRef = useRef(null);

  // Load tasks for the visible month (plus the leading/trailing days of the grid).
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfWeek(startOfMonth(viewDate));
      const end = endOfWeek(endOfMonth(viewDate));
      const { items } = await base44.entities.Task.filter(
        {
          due_date: {
            $gte: format(start, "yyyy-MM-dd"),
            $lte: format(end, "yyyy-MM-dd"),
          },
        },
        { sort: "due_date", limit: 300 }
      );
      setTasks(items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [viewDate]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Build the 6-week grid of days.
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [viewDate]);

  const tasksByDate = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      (map[t.due_date] ||= []).push(t);
    }
    return map;
  }, [tasks]);

  const monthLabel = format(viewDate, "MMMM yyyy");

  // ---- CRUD ----
  const openNew = (dateStr) => {
    setEditing(null);
    setPresetDate(dateStr);
    setDialogOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setPresetDate(task.due_date);
    setDialogOpen(true);
  };

  const handleSave = async (data, isBulk) => {
    if (isBulk) {
      const created = await base44.entities.Task.bulkCreate(data);
      setTasks((prev) => [...created, ...prev]);
    } else {
      if (data.id) {
        const updated = await base44.entities.Task.update(data.id, {
          title: data.title, description: data.description,
          color: data.color, due_date: data.due_date, completed: data.completed,
        });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const created = await base44.entities.Task.create(data);
        setTasks((prev) => [...prev, created]);
      }
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const toggleComplete = async (task) => {
    const updated = await base44.entities.Task.update(task.id, { completed: !task.completed });
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // ---- Trash-throw delete ----
  // Capture the note's screen position, animate a flying copy into the trash can,
  // then delete the record once it lands.
  const requestDelete = (task, el) => {
    const rect = el.getBoundingClientRect();
    setTrashing({ task, rect, rotate: (Math.random() * 30 - 15) });
  };

  const confirmDelete = async () => {
    const task = trashing?.task;
    setTrashing(null);
    if (!task) return;
    // optimistic removal
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await base44.entities.Task.delete(task.id);
    } catch (e) {
      console.error(e);
      loadTasks(); // restore on failure
    }
  };

  const trashCenter = useMemo(() => {
    if (!trashing || !trashRef.current) return null;
    const r = trashRef.current.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [trashing]);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        // whiteboard surface
        background:
          "linear-gradient(180deg,#fbfbf7 0%,#f4f3ec 100%)",
      }}
    >
      {/* faint grid lines for the board */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(#e7e5dc 1px,transparent 1px),linear-gradient(90deg,#e7e5dc 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-slate-500" />
              {monthLabel}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? "Loading your board…" : `${tasks.length} sticky note${tasks.length === 1 ? "" : "s"} this view`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewDate(new Date())}>
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setViewDate((d) => addMonths(d, -1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setViewDate((d) => addMonths(d, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button size="sm" onClick={() => openNew(format(new Date(), "yyyy-MM-dd"))}>
              <Plus className="w-4 h-4 mr-1" /> New note
            </Button>
          </div>
        </header>

        {/* Calendar grid */}
        <div className="rounded-xl border border-slate-200 bg-white/40 backdrop-blur-[1px] shadow-sm overflow-hidden">
          {/* weekday header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-white/60">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">
                {d}
              </div>
            ))}
          </div>

          {/* day cells */}
          <div className="grid grid-cols-7 grid-rows-6">
            {days.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayTasks = tasksByDate[dateStr] || [];
              const inMonth = isSameMonth(day, viewDate);
              const today = isToday(day);

              return (
                <div
                  key={i}
                  onClick={() => openNew(dateStr)}
                  className="relative min-h-[112px] sm:min-h-[132px] border-b border-r border-slate-200/70 p-1.5 cursor-pointer hover:bg-amber-50/40 transition-colors group"
                  style={{ opacity: inMonth ? 1 : 0.45 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold " +
                        (today
                          ? "bg-slate-800 text-white"
                          : "text-slate-600")
                      }
                    >
                      {format(day, "d")}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="space-y-1.5">
                    <AnimatePresence>
                      {dayTasks.slice(0, 4).map((t) => (
                        <StickyNoteWrapper key={t.id} task={t} onEdit={openEdit} onDelete={requestDelete} onToggleComplete={toggleComplete} />
                      ))}
                    </AnimatePresence>
                    {dayTasks.length > 4 && (
                      <p className="text-[10px] text-slate-500 pl-1">+{dayTasks.length - 4} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TrashCan ref={trashRef} />

      {/* Flying sticky note heading to the trash */}
      {trashing && trashCenter && (
        <FlyingNote
          trashing={trashing}
          target={trashCenter}
          onComplete={confirmDelete}
        />
      )}

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSave={handleSave}
        initialDate={presetDate}
        editing={editing}
      />
    </div>
  );
}

// Wrapper so StickyNote's delete handler receives the DOM element for the throw.
function StickyNoteWrapper({ task, onEdit, onDelete, onToggleComplete }) {
  const ref = useRef(null);
  return (
    <div ref={ref}>
      <StickyNote
        task={task}
        onEdit={onEdit}
        onToggleComplete={onToggleComplete}
        onDelete={(t) => onDelete(t, ref.current)}
      />
    </div>
  );
}

// The animated copy that flies from the note's old spot into the trash can.
function FlyingNote({ trashing, target, onComplete }) {
  const { task, rect, rotate } = trashing;
  const c = NOTE_COLORS[task.color] || NOTE_COLORS.yellow;
  const startX = rect.left;
  const startY = rect.top;
  const endX = target.x - rect.width / 2;
  const endY = target.y - rect.height / 2;

  return (
    <motion.div
      className="fixed top-0 left-0 z-50 pointer-events-none"
      style={{
        width: rect.width,
        height: rect.height,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        boxShadow: "0 10px 24px -8px rgba(0,0,0,0.45)",
      }}
      initial={{ x: startX, y: startY, rotate, scale: 1, opacity: 1 }}
      animate={{
        x: endX,
        y: endY,
        rotate: rotate + 540,
        scale: 0.12,
        opacity: 0,
      }}
      transition={{ duration: 0.55, ease: [0.5, 0, 0.75, 0] }}
      onAnimationComplete={onComplete}
    >
      <div className="px-2.5 pt-2.5 pb-2">
        <p className="font-semibold leading-tight text-[13px]">{task.title}</p>
      </div>
    </motion.div>
  );
}