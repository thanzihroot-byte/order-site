"use client";

/**
 * Category filter pills derived from the ACTUAL product data (never a static
 * list). Matches the Stitch pill styling: active pill in forest green.
 */
export function FoodCategoryFilters({
  categories,
  selected,
  onSelect,
  resultLabel,
}: {
  categories: { name: string; count: number }[];
  selected: string;
  onSelect: (category: string) => void;
  resultLabel: string;
}) {
  const pills = [{ name: "All", count: -1 }, ...categories];

  return (
    <div className="flex w-full items-center justify-between gap-3 overflow-x-auto pb-6 no-scrollbar">
      <div className="flex items-center gap-1 rounded-full bg-hairline/60 p-1.5 backdrop-blur-md">
        {pills.map((pill) => {
          const active = selected === pill.name;
          return (
            <button
              key={pill.name}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(pill.name)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
                active
                  ? "bg-forest text-white shadow-sm"
                  : "text-muted hover:bg-card hover:text-forest"
              }`}
            >
              {pill.name === "All" && (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              )}
              {pill.name === "All" ? "All Items" : pill.name}
            </button>
          );
        })}
      </div>
      <p className="hidden pl-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted lg:flex lg:items-center lg:gap-2">
        <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
        {resultLabel}
      </p>
    </div>
  );
}
