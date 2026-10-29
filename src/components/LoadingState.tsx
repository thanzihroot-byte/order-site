/** Shared skeleton grid shown while products load. */
export function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading the menu"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-xl border border-hairline bg-card"
        >
          <div className="aspect-[4/3] bg-hairline/70" />
          <div className="flex flex-col gap-3 p-4">
            <div className="h-4 w-2/3 rounded-full bg-hairline" />
            <div className="h-3 w-1/3 rounded-full bg-hairline/70" />
            <div className="mt-2 flex items-center justify-between">
              <div className="h-5 w-16 rounded-full bg-hairline/70" />
              <div className="h-7 w-24 rounded-full bg-hairline/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
