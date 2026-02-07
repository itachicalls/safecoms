interface TerminalPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function TerminalPanel({ title, children, className = '' }: TerminalPanelProps) {
  return (
    <div className={`terminal-panel ${className}`}>
      <div className="terminal-panel-header">{title}</div>
      <div className="terminal-panel-body">{children}</div>
    </div>
  );
}
