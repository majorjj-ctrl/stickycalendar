import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Split } from "lucide-react";
import { COLOR_OPTIONS, NOTE_COLORS } from "./noteColors";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TaskFormDialog({
  open, onClose, onSave, initialDate, editing,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("yellow");
  const [startDate, setStartDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(todayStr());
  const [split, setSplit] = useState(false);
  const [steps, setSteps] = useState(3);

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title || "");
        setDescription(editing.description || "");
        setColor(editing.color || "yellow");
        setDueDate(editing.due_date || todayStr());
        setStartDate(editing.due_date || todayStr());
        setSplit(false);
        setSteps(3);
      } else {
        const d = initialDate || todayStr();
        setTitle("");
        setDescription("");
        setColor("yellow");
        setStartDate(d);
        setDueDate(d);
        setSplit(false);
        setSteps(3);
      }
    }
  }, [open, editing, initialDate]);

  const canSplit = !editing && split && steps >= 2 && startDate && dueDate && startDate <= dueDate;

  const handleSave = () => {
    if (!title.trim() || !dueDate) return;

    if (canSplit) {
      // Spread `steps` sub-tasks evenly across the days from start to due date.
      const total = Math.max(2, Math.min(20, Math.round(steps)));
      const s = new Date(startDate + "T00:00:00");
      const e = new Date(dueDate + "T00:00:00");
      const spanDays = Math.max(1, Math.round((e - s) / 86400000));
      const groupId = `grp_${Date.now()}`;
      const created = [];
      for (let i = 0; i < total; i++) {
        // even distribution incl. both endpoints
        const offset = total === 1 ? 0 : Math.round((spanDays * i) / (total - 1));
        const d = new Date(s.getTime() + offset * 86400000);
        created.push({
          title: `${title.trim()} (${i + 1}/${total})`,
          description: description || "",
          color,
          due_date: d.toISOString().slice(0, 10),
          completed: false,
          step_index: i + 1,
          step_total: total,
          group_id: groupId,
        });
      }
      onSave(created, true);
    } else {
      onSave({
        ...(editing ? { id: editing.id } : {}),
        title: title.trim(),
        description,
        color,
        due_date: dueDate,
        completed: editing?.completed || false,
      }, false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit sticky note" : "New sticky note"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details…" rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((key) => {
                const c = NOTE_COLORS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setColor(key)}
                    className="w-8 h-8 rounded-md border-2 transition-transform"
                    style={{
                      background: c.bg,
                      borderColor: color === key ? c.pin : "transparent",
                      transform: color === key ? "scale(1.12)" : "scale(1)",
                    }}
                    aria-label={key}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-start">Start date</Label>
              <Input id="t-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-due">Due date</Label>
              <Input id="t-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {!editing && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/60">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox checked={split} onCheckedChange={(v) => setSplit(!!v)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Split className="w-3.5 h-3.5" /> Split into steps
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Break this task into multiple sticky notes spread across the days from start to due date.
                  </p>
                </div>
              </label>

              {split && (
                <div className="flex items-center gap-3 pl-7">
                  <Label htmlFor="t-steps" className="text-xs shrink-0">Steps</Label>
                  <Input
                    id="t-steps"
                    type="number"
                    min={2}
                    max={20}
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value) || 2)}
                    className="w-20 h-8"
                  />
                  <span className="text-xs text-slate-500">
                    {canSplit
                      ? `→ ${steps} notes across the range`
                      : "Set a start date before the due date"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || !dueDate}>
            {canSplit ? `Create ${Math.max(2, Math.min(20, Math.round(steps)))} notes` : editing ? "Save changes" : "Pin to board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}