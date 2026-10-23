"use client";

import * as React from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";

type GuideLauncherProps = {
  label: string;
  onOpen: () => void;
};

export const GuideLauncher = React.forwardRef<HTMLButtonElement, GuideLauncherProps>(
  function GuideLauncher({ label, onOpen }, ref) {
    return (
      <Button
        ref={ref}
        type="button"
        onClick={onOpen}
        aria-label={label}
        variant="outline"
        title={label}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-3 z-50 size-12 rounded-full bg-background px-0 text-teal shadow-md sm:end-6"
      >
        <CircleHelp className="size-5 shrink-0" aria-hidden />
      </Button>
    );
  }
);
