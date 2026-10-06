"use client";

import { useState } from "react";
import { Button } from "@base-ui/react/button";

export function WorkspaceDetails() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        aria-expanded={open}
        aria-controls="workspace-details"
        onClick={() => setOpen(!open)}
      >
        Workspace details
      </Button>
      <p id="workspace-details" hidden={!open}>
        This site imports the local library through its public package exports.
      </p>
    </>
  );
}
