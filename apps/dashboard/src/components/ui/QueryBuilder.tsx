export type QueryBuilderOperator = "=" | "!=" | "=~" | ">" | ">=" | "<" | "<=";

export interface QueryBuilderTerm {
  id: string;
  field: string;
  value: string;
  operator?: QueryBuilderOperator;
  label?: string;
  onRemove: () => void;
}

interface QueryBuilderProps {
  resource: string;
  terms: QueryBuilderTerm[];
  total: number;
  resultNoun?: string;
  onAddFilter?: () => void;
}

function quoted(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

export function QueryBuilder({
  resource,
  terms,
  total,
  resultNoun = "results",
  onAddFilter,
}: QueryBuilderProps) {
  const expression = `${resource}{${terms
    .map((term) => `${term.field}${term.operator ?? "="}${quoted(term.value)}`)
    .join(", ")}}`;

  return (
    <div className="flex min-w-[680px] flex-col items-stretch gap-2.5 border-b border-line px-4 py-2.5">
      <span className="overflow-x-auto whitespace-nowrap font-mono text-[11.5px] text-fg-4">
        {expression}
      </span>

      <div className="flex min-w-0 items-center gap-3 border-t border-line-soft pt-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {terms.map((term) => (
            <span
              key={term.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-4 py-0.5 pr-1 pl-2.5 text-[11px] text-fg-3"
            >
              {term.label ??
                `${term.field} ${term.operator ?? "="} ${term.value}`}
              <button
                type="button"
                onClick={term.onRemove}
                aria-label={`Remove ${term.label ?? term.field} filter`}
                className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-0 bg-fill-2 text-[9px] leading-none text-fg-4 transition-colors hover:text-fg"
              >
                ×
              </button>
            </span>
          ))}

          {onAddFilter ? (
            <button
              type="button"
              onClick={onAddFilter}
              className="cursor-pointer rounded-full border border-dashed border-line-strong bg-transparent px-2.5 py-1 text-[11px] text-dim transition-colors hover:bg-hover hover:text-fg-4"
            >
              + Add filter
            </button>
          ) : null}
        </div>

        <span className="shrink-0 text-[11px] text-faint">
          {total.toLocaleString()} {resultNoun}
        </span>
      </div>
    </div>
  );
}
