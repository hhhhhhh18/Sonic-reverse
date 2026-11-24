export function Divider({ children = "or" }: { children?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-subtle" role="separator">
      <span className="h-px flex-1 bg-white/20" />
      {children}
      <span className="h-px flex-1 bg-white/20" />
    </div>
  );
}
