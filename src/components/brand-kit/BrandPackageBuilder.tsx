import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Plus, Check, Sparkles, Package, Truck, Shirt, Printer, Globe, Square, Tag, Stamp, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { loadBrandPackages, saveBrandPackages, type BrandPackage, type PackageItem } from "@/api/brandPackages.functions";

const TIERS: BrandPackage[] = [
  {
    id: "starter",
    tier: "starter",
    name: "Starter Visibility Package",
    bestFor: "New or small businesses needing basic credibility and a polished first impression.",
    rationale: "Covers the absolute essentials so the business can hand someone a card, look the part in person, and show up consistently online.",
    priceRange: "$$",
    items: [
      { id: "biz-cards", label: "Business cards", why: "Essential offline handoff that signals legitimacy." },
      { id: "shirt", label: "One branded shirt or uniform option", why: "Owner/staff look professional in front of customers." },
      { id: "social-basics", label: "Basic social media profile graphics", why: "Profile + cover images so the brand looks intentional online." },
      { id: "flyer-basic", label: "Simple flyer or service card", why: "A printable leave-behind that explains what they do." },
    ],
  },
  {
    id: "local",
    tier: "local",
    name: "Local Presence Package",
    bestFor: "Service businesses that need to look established in their local market and win neighborhood trust.",
    rationale: "Adds the visibility pieces that make a business feel like it's everywhere — in person, on the road, and in the neighborhood.",
    priceRange: "$$$",
    items: [
      { id: "biz-cards", label: "Business cards", why: "Always carry them. Foundation of in-person trust." },
      { id: "shirts", label: "Branded shirts (crew set)", why: "Uniformed team = trusted team on every job." },
      { id: "vehicle", label: "Vehicle magnet or decal", why: "A truck on the road is a billboard. Cheap, repeated impressions." },
      { id: "yard-sign", label: "Yard sign or small signage", why: "Marks completed jobs and storefronts in the local area." },
      { id: "door-hanger", label: "Flyer or door hanger", why: "Targeted local outreach that's easy to scale block by block." },
      { id: "social-promo", label: "Social media promo graphic", why: "One reusable promo template for offers and announcements." },
    ],
  },
  {
    id: "launch",
    tier: "launch",
    name: "Full Brand Launch Package",
    bestFor: "Businesses opening, rebranding, or scaling — they need to look fully professional from day one.",
    rationale: "A complete, consistent rollout across every customer touchpoint. This is what makes a small business feel like a real brand.",
    priceRange: "$$$$",
    items: [
      { id: "production-files", label: "Logo production files (vector + raster)", why: "Future-proof the brand. Print, web, embroidery, signage all start here." },
      { id: "biz-cards", label: "Business cards", why: "Premium first impression at every meeting." },
      { id: "uniforms", label: "Shirts / uniforms set", why: "Branded team across the launch period." },
      { id: "signage", label: "Exterior or interior signage recommendation", why: "Anchor the brand in physical space." },
      { id: "brochure", label: "Flyer or brochure", why: "A polished sales tool for prospects and partners." },
      { id: "banner", label: "Banner", why: "Events, grand opening, sponsorships, trade shows." },
      { id: "social-set", label: "Social media graphics set", why: "Launch content + ongoing templates." },
      { id: "web-direction", label: "Website visual direction", why: "Aligns the digital home with the printed brand." },
      { id: "usage-summary", label: "Brand usage summary", why: "One-page do/don't guide so the brand stays consistent." },
    ],
  },
];

const CUSTOM_CATEGORIES: { id: string; label: string; icon: React.ReactNode; suggestions: string[] }[] = [
  { id: "apparel", label: "Apparel", icon: <Shirt className="h-3.5 w-3.5" />, suggestions: ["T-shirts", "Polos", "Hats", "Hoodies", "Hi-vis vests"] },
  { id: "signage", label: "Signage", icon: <Square className="h-3.5 w-3.5" />, suggestions: ["Storefront sign", "A-frame", "Yard signs", "Window decals"] },
  { id: "printing", label: "Business Printing", icon: <Printer className="h-3.5 w-3.5" />, suggestions: ["Business cards", "Letterhead", "Invoices", "Brochures"] },
  { id: "digital", label: "Digital Media", icon: <Globe className="h-3.5 w-3.5" />, suggestions: ["Email signature", "Web banner", "Slide deck template"] },
  { id: "vehicle", label: "Vehicle Graphics", icon: <Truck className="h-3.5 w-3.5" />, suggestions: ["Magnet", "Truck decal", "Full vehicle wrap"] },
  { id: "decals", label: "Decals", icon: <Tag className="h-3.5 w-3.5" />, suggestions: ["Window cling", "Bumper sticker", "Equipment label"] },
  { id: "banners", label: "Banners", icon: <Square className="h-3.5 w-3.5" />, suggestions: ["Vinyl banner", "Retractable banner", "Event backdrop"] },
  { id: "embroidery", label: "Embroidery", icon: <Stamp className="h-3.5 w-3.5" />, suggestions: ["Embroidered polo", "Beanie", "Patch"] },
  { id: "social", label: "Web/Social Assets", icon: <Sparkles className="h-3.5 w-3.5" />, suggestions: ["Profile pack", "Promo templates", "Story templates"] },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

export function BrandPackageBuilder({ brandProfileId }: { brandProfileId: string | null }) {
  const [packages, setPackages] = useState<BrandPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [context, setContext] = useState<{ business_name: string | null; industry: string | null; direction: string | null }>({ business_name: null, industry: null, direction: null });

  useEffect(() => {
    if (!brandProfileId) return;
    setLoading(true);
    loadBrandPackages({ data: { brandProfileId } })
      .then((r) => { setPackages(r.packages); setContext(r.context); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load packages"))
      .finally(() => setLoading(false));
  }, [brandProfileId]);

  const persist = async (next: BrandPackage[]) => {
    setPackages(next);
    if (!brandProfileId) return;
    setSaving(true);
    try { await saveBrandPackages({ data: { brandProfileId, packages: next } }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const addToProposal = (tpl: BrandPackage) => {
    if (packages.find((p) => p.id === tpl.id && p.tier === tpl.tier)) {
      toast.message("Already in proposal", { description: tpl.name });
      return;
    }
    persist([...packages, { ...tpl, id: tpl.tier, inProposal: true }]);
    toast.success(`${tpl.name} added to proposal`);
  };

  const customize = (tpl: BrandPackage) => {
    const id = uid();
    const copy: BrandPackage = { ...tpl, id, tier: "custom", name: `${tpl.name} (Custom)`, customizedAt: new Date().toISOString(), items: tpl.items.map((i) => ({ ...i })) };
    persist([...packages, copy]);
    setEditingId(id);
  };

  const startCustom = () => {
    const id = uid();
    const draft: BrandPackage = {
      id, tier: "custom", name: "Custom Branding Package",
      bestFor: context.business_name ? `Tailored recommendations for ${context.business_name}.` : "Tailored recommendations for this client.",
      rationale: "A right-sized mix of materials chosen for this business's goals and industry.",
      items: [], priceRange: "",
    };
    persist([...packages, draft]);
    setEditingId(id);
  };

  const updatePackage = (id: string, patch: Partial<BrandPackage>) => persist(packages.map((p) => p.id === id ? { ...p, ...patch } : p));
  const removePackage = (id: string) => persist(packages.filter((p) => p.id !== id));

  const proposalCount = packages.length;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Brand Package Builder
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Now that the logo is approved{context.business_name ? ` for ${context.business_name}` : ""}, recommend the right real-world branding rollout. These aren't products in a cart — they're a strategy for visibility, trust, and consistency.
          </p>
        </div>
        <div className="text-[11px] text-muted-foreground inline-flex items-center gap-2">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {proposalCount > 0 && <Badge variant="secondary">{proposalCount} in proposal</Badge>}
        </div>
      </div>

      {!brandProfileId && (
        <p className="mt-4 text-xs text-muted-foreground rounded-md border border-dashed border-border p-3">
          Pick a saved brand profile (top left) to start building branding packages.
        </p>
      )}

      {/* Recommended tiers */}
      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Recommended Tiers</h3>
        {loading ? (
          <div className="text-xs text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {TIERS.map((tpl) => (
              <TierCard key={tpl.id} tpl={tpl} inProposal={!!packages.find((p) => p.tier === tpl.tier && p.tier !== "custom")} onAdd={() => addToProposal(tpl)} onCustomize={() => customize(tpl)} disabled={!brandProfileId} />
            ))}
          </div>
        )}
      </div>

      {/* Proposal */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Client-Facing Proposal</h3>
          <Button size="sm" variant="outline" disabled={!brandProfileId} onClick={startCustom}><Plus className="h-3 w-3" /> New Custom Package</Button>
        </div>
        {packages.length === 0 ? (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border p-3">Add a tier above or build a custom package — the proposal preview will appear here.</p>
        ) : (
          <div className="space-y-3">
            {packages.map((p) => (
              <ProposalCard
                key={p.id}
                pkg={p}
                editing={editingId === p.id}
                onEdit={() => setEditingId(p.id)}
                onDone={() => setEditingId(null)}
                onChange={(patch) => updatePackage(p.id, patch)}
                onRemove={() => removePackage(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TierCard({ tpl, inProposal, onAdd, onCustomize, disabled }: { tpl: BrandPackage; inProposal: boolean; onAdd: () => void; onCustomize: () => void; disabled: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold tracking-tight">{tpl.name}</div>
        {tpl.priceRange && <Badge variant="outline" className="text-[10px]">{tpl.priceRange}</Badge>}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1"><strong className="text-foreground">Best for:</strong> {tpl.bestFor}</p>
      <ul className="mt-3 space-y-1.5 text-xs flex-1">
        {tpl.items.map((i) => (
          <li key={i.id} className="flex gap-2">
            <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">{i.label}</div>
              {i.why && <div className="text-[11px] text-muted-foreground">{i.why}</div>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-foreground/80 italic border-t border-border pt-2">{tpl.rationale}</p>
      <div className="mt-3 flex gap-1.5">
        <Button size="sm" variant="default" disabled={disabled || inProposal} onClick={onAdd}>
          {inProposal ? <><Check className="h-3 w-3" /> In Proposal</> : <><Plus className="h-3 w-3" /> Add to Proposal</>}
        </Button>
        <Button size="sm" variant="outline" disabled={disabled} onClick={onCustomize}><Pencil className="h-3 w-3" /> Customize</Button>
      </div>
    </div>
  );
}

function ProposalCard({ pkg, editing, onEdit, onDone, onChange, onRemove }: { pkg: BrandPackage; editing: boolean; onEdit: () => void; onDone: () => void; onChange: (patch: Partial<BrandPackage>) => void; onRemove: () => void }) {
  const addItem = (label: string) => {
    if (!label.trim()) return;
    onChange({ items: [...pkg.items, { id: uid(), label: label.trim() }] });
  };
  const removeItem = (id: string) => onChange({ items: pkg.items.filter((i) => i.id !== id) });
  const updateItem = (id: string, patch: Partial<PackageItem>) => onChange({ items: pkg.items.map((i) => i.id === id ? { ...i, ...patch } : i) });

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input value={pkg.name} onChange={(e) => onChange({ name: e.target.value })} className="h-8 text-sm font-semibold" />
          ) : (
            <div className="text-sm font-semibold tracking-tight inline-flex items-center gap-2">
              {pkg.name}
              <Badge variant="secondary" className="text-[10px] capitalize">{pkg.tier}</Badge>
              {pkg.priceRange && <Badge variant="outline" className="text-[10px]">{pkg.priceRange}</Badge>}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {editing ? (
            <Button size="sm" variant="default" onClick={onDone}><Save className="h-3 w-3" /> Done</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3 w-3" /> Edit</Button>
          )}
          <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <div>
            <Label className="text-[11px]">Best for</Label>
            <Textarea rows={2} className="mt-1 text-xs" value={pkg.bestFor} onChange={(e) => onChange({ bestFor: e.target.value })} />
          </div>
          <div>
            <Label className="text-[11px]">Why this works (client-facing)</Label>
            <Textarea rows={2} className="mt-1 text-xs" value={pkg.rationale} onChange={(e) => onChange({ rationale: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Estimated price range</Label>
              <Input className="mt-1 h-8 text-xs" placeholder="e.g. $1,500–$2,500" value={pkg.priceRange || ""} onChange={(e) => onChange({ priceRange: e.target.value })} />
            </div>
          </div>

          <div className="rounded-md border border-border p-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Items</div>
            <ul className="space-y-1.5">
              {pkg.items.map((i) => (
                <li key={i.id} className="grid grid-cols-[1fr_2fr_auto] gap-1.5 items-center">
                  <Input className="h-7 text-xs" value={i.label} onChange={(e) => updateItem(i.id, { label: e.target.value })} placeholder="Item name" />
                  <Input className="h-7 text-xs" value={i.why || ""} onChange={(e) => updateItem(i.id, { why: e.target.value })} placeholder="Why it helps the business" />
                  <Button size="sm" variant="ghost" onClick={() => removeItem(i.id)}><Trash2 className="h-3 w-3" /></Button>
                </li>
              ))}
            </ul>

            <div className="mt-3 border-t border-border pt-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Add by category</div>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_CATEGORIES.map((cat) => (
                  <details key={cat.id} className="group">
                    <summary className="list-none cursor-pointer text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:border-foreground/40">
                      {cat.icon} {cat.label}
                    </summary>
                    <div className="mt-1 flex flex-wrap gap-1 pl-1">
                      {cat.suggestions.map((s) => (
                        <Button key={s} size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => addItem(s)}>
                          <Plus className="h-3 w-3" /> {s}
                        </Button>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-muted-foreground"><strong className="text-foreground">Best for:</strong> {pkg.bestFor}</p>
          {pkg.items.length > 0 && (
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {pkg.items.map((i) => (
                <li key={i.id} className="flex gap-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">{i.label}</div>
                    {i.why && <div className="text-[11px] text-muted-foreground">{i.why}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] italic text-foreground/80 border-t border-border pt-2">{pkg.rationale}</p>
        </div>
      )}
    </div>
  );
}