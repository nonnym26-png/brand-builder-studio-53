import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { deleteBrandProfiles } from "@/api/brandKit.functions";

export type SavedProfileRow = {
  id: string;
  business_name: string | null;
  client_name: string | null;
  updated_at?: string | null;
};

export function SavedProfilesPicker({
  profiles,
  selectedId,
  onSelect,
  onDeleted,
  emptyText = "No saved profiles yet.",
}: {
  profiles: SavedProfileRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  onDeleted: (deletedIds: string[]) => void;
  emptyText?: string;
}) {
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const toggle = (id: string, on: boolean) =>
    setMarked((m) => ({ ...m, [id]: on }));

  const markedIds = Object.keys(marked).filter((k) => marked[k]);

  const onDelete = async () => {
    if (markedIds.length === 0) return;
    const ok = window.confirm(
      `Delete ${markedIds.length} saved profile${markedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteBrandProfiles({ data: { ids: markedIds } });
      toast.success("Selected profile(s) deleted.");
      setMarked({});
      onDeleted(markedIds);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (profiles.length === 0) {
    return <div className="text-xs text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border bg-card">
        {profiles.map((p) => {
          const isSel = p.id === selectedId;
          const date = p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "";
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-2 py-1.5 text-xs ${isSel ? "bg-muted" : ""}`}
            >
              <Checkbox
                checked={!!marked[p.id]}
                onCheckedChange={(v) => toggle(p.id, !!v)}
                aria-label="Mark for deletion"
              />
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="flex-1 text-left truncate hover:underline"
              >
                <div className="font-medium truncate">{p.business_name || "Untitled"}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {p.client_name || "—"}{date ? ` · ${date}` : ""}
                </div>
              </button>
            </div>
          );
        })}
      </div>
      {markedIds.length > 0 && (
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete Selected Profiles ({markedIds.length})
        </Button>
      )}
    </div>
  );
}