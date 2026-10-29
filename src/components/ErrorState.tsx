/** Shared error panel with retry affordance. */
export function ErrorState({
  title = "We couldn't reach the kitchen",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 rounded-xl border border-bordeaux/20 bg-bordeaux/5 px-8 py-14 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bordeaux/10 text-bordeaux">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <h2 className="font-display text-2xl font-semibold text-forest">{title}</h2>
      <p className="text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
