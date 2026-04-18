export function TimeDivider({ label }: { label: string }) {
  return (
    <div className="mb-4 flex justify-center sm:mb-6">
      <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-500 sm:px-3.5 sm:text-xs">
        {label}
      </span>
    </div>
  );
}
