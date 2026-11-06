import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface SqlUsedPanelProps {
  sql?: string;
  executionMs?: number;
  rowCount?: number;
  title?: string;
  className?: string;
  defaultExpanded?: boolean;
}

export const SqlUsedPanel: React.FC<SqlUsedPanelProps> = ({
  sql,
  executionMs,
  rowCount,
  title = 'SQL Query Executed',
  className = '',
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  if (!sql) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#0B2E5C]" />
          <span className="text-xs font-semibold text-slate-800 tracking-tight">{title}</span>
          {executionMs !== undefined && (
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {executionMs} ms
            </span>
          )}
          {rowCount !== undefined && (
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {rowCount} {rowCount === 1 ? 'row' : 'rows'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">
            {expanded ? 'Hide SQL' : 'Show SQL'}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3 bg-slate-900 text-slate-100 border-t border-slate-200 relative group">
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors"
            title="Copy SQL to Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          <pre className="font-mono text-xs text-sky-300 leading-relaxed overflow-x-auto whitespace-pre-wrap pr-16 select-all">
            {sql.trim()}
          </pre>
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>MySQL 8.0+ / MariaDB 10.4+ Compatible</span>
            {executionMs !== undefined && (
              <span className="tabular-nums">Executed in {executionMs}ms</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
