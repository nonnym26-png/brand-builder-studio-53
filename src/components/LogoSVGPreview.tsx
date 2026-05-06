import { useMemo, useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * Sanitize SVG markup before injecting into the DOM.
 * Blocks: <script>, javascript: URLs, <foreignObject>, <iframe>, <object>,
 * <embed>, external <image> hrefs, external <a> links, on* event handlers.
 * Only inline SVG primitives are allowed.
 */
export function sanitizeSvg(raw: string): string {
  if (typeof raw !== "string") return "";
  let svg = raw.trim();

  // Strip forbidden elements (with their content).
  const forbiddenTags = [
    "script",
    "foreignObject",
    "iframe",
    "object",
    "embed",
    "audio",
    "video",
    "use",
    "animate",
    "animateTransform",
    "animateMotion",
    "set",
  ];
  for (const tag of forbiddenTags) {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi");
    svg = svg.replace(re, "");
    const selfClose = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    svg = svg.replace(selfClose, "");
  }

  // Strip on* event handler attributes.
  svg = svg.replace(/\son[a-z]+\s*=\s*"(?:[^"\\]|\\.)*"/gi, "");
  svg = svg.replace(/\son[a-z]+\s*=\s*'(?:[^'\\]|\\.)*'/gi, "");

  // Strip javascript: / data:text/html / vbscript: URLs in href / xlink:href / src.
  svg = svg.replace(
    /\s(href|xlink:href|src)\s*=\s*(['"])\s*(?:javascript|vbscript|data:text\/html)[^'"]*\2/gi,
    "",
  );

  // Block external resources in <image> / <a> — only allow same-origin/relative
  // by stripping any href that contains "://" (http://, https://, //cdn, etc).
  svg = svg.replace(
    /\s(href|xlink:href|src)\s*=\s*(['"])(?:[a-z]+:)?\/\/[^'"]*\2/gi,
    "",
  );

  return svg;
}

type Variant = "light" | "dark" | "small";

function VariantTile({
  label,
  variant,
  svg,
}: {
  label: string;
  variant: Variant;
  svg: string;
}) {
  const surfaceClass =
    variant === "dark"
      ? "bg-zinc-900"
      : "bg-[#FAFAF7]";
  const sizeClass = variant === "small" ? "aspect-square w-24" : "aspect-[3/2] w-full";

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div
        className={`${sizeClass} overflow-hidden rounded-md border ${surfaceClass} flex items-center justify-center`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export function LogoSVGPreview({
  svgMarkup,
  title = "SVG Markup",
}: {
  svgMarkup: string;
  title?: string;
}) {
  const safe = useMemo(() => sanitizeSvg(svgMarkup), [svgMarkup]);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(safe);
      setCopied(true);
      toast.success("SVG code copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <VariantTile label="Light" variant="light" svg={safe} />
        <VariantTile label="Dark" variant="dark" svg={safe} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <VariantTile label="Small (24px scale)" variant="small" svg={safe} />
        <div className="flex gap-2 pb-1">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Code2 className="mr-1.5 h-4 w-4" /> View SVG Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              <pre className="max-h-[60vh] overflow-auto rounded-md border bg-muted p-3 text-xs">
                <code>{safe}</code>
              </pre>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <Check className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Copy className="mr-1.5 h-4 w-4" />
                  )}
                  Copy SVG Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-1.5 h-4 w-4" />
            ) : (
              <Copy className="mr-1.5 h-4 w-4" />
            )}
            Copy SVG Code
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LogoSVGPreview;