import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type CustomFont = {
  id: string;
  family: string;        // CSS font-family name (sanitized)
  label: string;         // human label
  format: string;        // truetype | opentype | woff | woff2
  dataUrl: string;       // persisted base64 data URL
};

const STORAGE_KEY = "ab.customFonts.v1";
const ACCEPT = ".ttf,.otf,.woff,.woff2";

function detectFormat(name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "ttf") return "truetype";
  if (ext === "otf") return "opentype";
  if (ext === "woff") return "woff";
  if (ext === "woff2") return "woff2";
  return "truetype";
}

function sanitizeFamily(name: string): string {
  const base = name.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/i, "");
  return base.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 64) || `Font_${Date.now()}`;
}

function injectFontFace(family: string, dataUrl: string, format: string) {
  const styleId = `cf-${family}`;
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `@font-face{font-family:"${family}";src:url(${dataUrl}) format("${format}");font-display:swap;}`;
  document.head.appendChild(style);
}

function loadStored(): CustomFont[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomFont[];
  } catch {
    return [];
  }
}

export function useCustomFonts() {
  const [fonts, setFonts] = useState<CustomFont[]>([]);

  useEffect(() => {
    const stored = loadStored();
    stored.forEach((f) => injectFontFace(f.family, f.dataUrl, f.format));
    setFonts(stored);
  }, []);

  const persist = (next: CustomFont[]) => {
    setFonts(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {
      toast.error("Browser storage full — remove a font and try again.");
    }
  };

  const add = (font: CustomFont) => {
    injectFontFace(font.family, font.dataUrl, font.format);
    persist([...fonts.filter((f) => f.family !== font.family), font]);
  };

  const remove = (id: string) => {
    const target = fonts.find((f) => f.id === id);
    if (target) document.getElementById(`cf-${target.family}`)?.remove();
    persist(fonts.filter((f) => f.id !== id));
  };

  return { fonts, add, remove };
}

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per font

export function CustomFontUploader({
  fonts,
  onAdd,
  onRemove,
  previewText = "Aa Bb Cc 123 — The quick brown fox",
}: {
  fonts: CustomFont[];
  onAdd: (font: CustomFont) => void;
  onRemove: (id: string) => void;
  previewText?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewSize, setPreviewSize] = useState(28);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setBusy(true);
      try {
        for (const file of list) {
          if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) {
            toast.error(`${file.name} — unsupported format. Use TTF, OTF, WOFF, or WOFF2.`);
            continue;
          }
          if (file.size > MAX_SIZE) {
            toast.error(`${file.name} — file too large (max 5 MB).`);
            continue;
          }
          const dataUrl: string = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(file);
          });
          const family = sanitizeFamily(file.name);
          const format = detectFormat(file.name);
          // Validate by attempting to load it
          try {
            const ff = new FontFace(family, `url(${dataUrl})`);
            await ff.load();
            (document as unknown as { fonts: FontFaceSet }).fonts.add(ff);
          } catch {
            toast.error(`${file.name} — could not be parsed as a valid font.`);
            continue;
          }
          onAdd({
            id: `${family}-${Date.now()}`,
            family,
            label: file.name.replace(/\.(ttf|otf|woff2?)$/i, ""),
            format,
            dataUrl,
          });
          toast.success(`Loaded ${file.name}`);
        }
      } finally {
        setBusy(false);
      }
    },
    [onAdd],
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Type className="h-4 w-4" /> Custom Fonts
      </h3>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40"
        }`}
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <div className="text-sm font-medium">
          {busy ? "Loading…" : "Drop font files here or click to upload"}
        </div>
        <div className="text-xs text-muted-foreground">TTF · OTF · WOFF · WOFF2 — up to 5 MB each</div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {fonts.length > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">Live preview</Label>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Size</span>
              <input
                type="range"
                min={14}
                max={72}
                value={previewSize}
                onChange={(e) => setPreviewSize(Number(e.target.value))}
                className="w-24"
              />
              <span className="w-8 text-right tabular-nums">{previewSize}px</span>
            </div>
          </div>
          <ul className="mt-2 space-y-2">
            {fonts.map((f) => (
              <li key={f.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate font-medium text-foreground">{f.label}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{f.format}</span>
                    </div>
                    <div
                      className="mt-2 break-words leading-tight text-foreground"
                      style={{ fontFamily: `"${f.family}", system-ui, sans-serif`, fontSize: `${previewSize}px` }}
                    >
                      {previewText}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => onRemove(f.id)} aria-label={`Remove ${f.label}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-xs font-medium ${props.className ?? ""}`} />;
}