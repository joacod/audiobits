import { workspaceStatus } from "audiobits";

const status = document.querySelector<HTMLParagraphElement>("#status");
if (!status) throw new Error("Missing consumer status element");
status.textContent = workspaceStatus;
