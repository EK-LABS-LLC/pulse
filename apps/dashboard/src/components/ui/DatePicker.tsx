import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatLocalDateKey, parseLocalDateKey } from "../../lib/date";

export interface CalendarDateRange {
  from: string;
  to: string;
}

interface DatePickerProps {
  value: CalendarDateRange;
  onChange: (value: CalendarDateRange) => void;
  onOpen?: () => void;
  label?: string;
  applyLabel?: string;
  min?: string;
  max?: string;
  children?: ReactNode;
  align?: "start" | "end";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
      />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}
      />
    </svg>
  );
}

function formatFullDate(value: string): string {
  return parseLocalDateKey(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTriggerLabel(value: CalendarDateRange): string {
  const from = parseLocalDateKey(value.from);
  const to = parseLocalDateKey(value.to);
  const fromLabel = from.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(from.getFullYear() !== to.getFullYear() ? { year: "numeric" } : {}),
  });
  const toLabel = to.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fromLabel} – ${toLabel}`;
}

function startOfMonth(value: string): Date {
  const date = parseLocalDateKey(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function DatePicker({
  value,
  onChange,
  onOpen,
  label = "Choose date",
  applyLabel = "Apply date",
  min,
  max = formatLocalDateKey(new Date()),
  children,
  align = "start",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [activeBoundary, setActiveBoundary] = useState<"from" | "to">("from");
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(value.from),
  );
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const open = () => {
    setDraftValue(value);
    setActiveBoundary("from");
    setVisibleMonth(startOfMonth(value.from));
    onOpen?.();
    setIsOpen(true);
  };
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from(
    { length: firstWeekday + daysInMonth },
    (_, index) => (index < firstWeekday ? null : index - firstWeekday + 1),
  );
  const previousMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const minMonth = min ? startOfMonth(min) : null;
  const maxMonth = max ? startOfMonth(max) : null;
  const canGoPrevious = !minMonth || previousMonth >= minMonth;
  const canGoNext = !maxMonth || nextMonth <= maxMonth;

  const selectDate = (dateKey: string) => {
    if (activeBoundary === "from") {
      setDraftValue((current) => ({
        from: dateKey,
        to: dateKey > current.to ? dateKey : current.to,
      }));
      setActiveBoundary("to");
      return;
    }

    setDraftValue((current) => ({
      from: dateKey < current.from ? dateKey : current.from,
      to: dateKey,
    }));
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3 text-[11.5px] font-medium text-fg-3 shadow-[0_1px_3px_var(--shadow-c)] transition-colors hover:bg-hover hover:text-fg"
      >
        <CalendarIcon />
        <span>{formatTriggerLabel(value)}</span>
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={label}
          className={`absolute top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-3rem)] rounded-xl border border-line-strong bg-surface-4 p-4 shadow-[0_18px_48px_var(--shadow-c)] ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          <div className="mb-1 text-sm font-semibold text-fg">{label}</div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onChange(draftValue);
              setIsOpen(false);
            }}
          >
            <p className="mb-3 text-xs text-dim">
              Choose the first and last date to include.
            </p>

            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["from", "to"] as const).map((boundary) => (
                <button
                  key={boundary}
                  type="button"
                  onClick={() => {
                    setActiveBoundary(boundary);
                    setVisibleMonth(startOfMonth(draftValue[boundary]));
                  }}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    activeBoundary === boundary
                      ? "border-blue bg-blue-tint"
                      : "border-line bg-surface-2 hover:bg-hover"
                  }`}
                >
                  <span className="block text-[10.5px] font-medium uppercase tracking-[0.06em] text-faint">
                    {boundary}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-fg">
                    {formatFullDate(draftValue[boundary])}
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-line bg-surface-3 p-3">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous month"
                  disabled={!canGoPrevious}
                  onClick={() => setVisibleMonth(previousMonth)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface-2 text-dim transition-colors hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronIcon direction="left" />
                </button>
                <div className="text-sm font-semibold text-fg">
                  {visibleMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <button
                  type="button"
                  aria-label="Next month"
                  disabled={!canGoNext}
                  onClick={() => setVisibleMonth(nextMonth)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface-2 text-dim transition-colors hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronIcon direction="right" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="pb-1 text-center text-[10.5px] font-medium text-faint"
                  >
                    {weekday}
                  </div>
                ))}
                {cells.map((day, index) => {
                  if (day === null) return <span key={`blank-${index}`} />;
                  const dateKey = formatLocalDateKey(
                    new Date(year, month, day),
                  );
                  const selected =
                    dateKey === draftValue.from || dateKey === draftValue.to;
                  const inRange =
                    dateKey > draftValue.from && dateKey < draftValue.to;
                  const disabled = Boolean(
                    (min && dateKey < min) || (max && dateKey > max),
                  );
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={disabled}
                      aria-label={formatFullDate(dateKey)}
                      aria-pressed={selected}
                      onClick={() => selectDate(dateKey)}
                      className={`h-9 cursor-pointer rounded-lg text-xs font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
                        selected
                          ? "bg-blue text-white shadow-[0_2px_6px_var(--shadow-c)]"
                          : inRange
                            ? "bg-blue-tint text-fg"
                            : "text-fg-3 hover:bg-fill-2 hover:text-fg"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {children ? (
              <div className="mt-3 border-t border-line pt-3">{children}</div>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  selectDate(max);
                  setVisibleMonth(startOfMonth(max));
                }}
                className="cursor-pointer rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-xs font-medium text-fg-3 transition-colors hover:bg-hover hover:text-fg"
              >
                Today
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer rounded-lg border border-line-strong bg-transparent px-3 py-2 text-xs font-medium text-dim transition-colors hover:bg-hover hover:text-fg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg border-0 bg-blue px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_7px_var(--shadow-c)] transition-opacity hover:opacity-90"
                >
                  {applyLabel}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
