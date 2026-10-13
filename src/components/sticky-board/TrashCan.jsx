import React from "react";
import { Trash2 } from "lucide-react";

// Fixed trash can in the corner — the destination for thrown sticky notes.
// Forwards its ref so the parent can read the target position for the throw animation.
const TrashCan = React.forwardRef(function TrashCan(_, ref) {
  return (
    <div
      ref={ref}
      className="fixed bottom-5 right-5 z-40 flex items-center justify-center w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 shadow-lg pointer-events-none"
      style={{ boxShadow: "0 10px 30px -10px rgba(0,0,0,0.35)" }}
    >
      <Trash2 className="w-7 h-7 text-slate-500" />
    </div>
  );
});

export default TrashCan;