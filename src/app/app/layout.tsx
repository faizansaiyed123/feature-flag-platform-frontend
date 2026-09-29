import { ConsoleShell } from "@/components/app/console-shell";
import { WorkspaceProvider } from "@/components/app/workspace-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider><ConsoleShell>{children}</ConsoleShell></WorkspaceProvider>;
}
