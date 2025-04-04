import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children?: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div
      className={cn(
        "container mx-auto max-w-5xl px-4 py-6 md:py-10",
        className
      )}
    >
      <div className="grid gap-6">{children}</div>
    </div>
  );
}
