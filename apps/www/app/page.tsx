import Link from "next/link";
import { workspaceStatus } from "audiobits";
import { ConfirmationDemo } from "./confirmation-demo";
import { WorkspaceDetails } from "./workspace-details";

export default function Home() {
  return (
    <main className="foundation">
      <p>Unreleased · Workspace foundation</p>
      <h1>AudioBits</h1>
      <p>Procedural sound for interactive web experiences.</p>
      <ConfirmationDemo />
      <p data-testid="workspace-status">{workspaceStatus}</p>
      <p>
        <Link href="/docs">Development docs</Link>
      </p>
      <WorkspaceDetails />
    </main>
  );
}
