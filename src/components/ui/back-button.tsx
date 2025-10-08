import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function BackButton({
  onClick,
  label = "戻る",
  variant = "ghost",
  size = "sm",
  className = "",
}: BackButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={`hover:bg-muted/60 transition-colors p-2 -ml-2 ${className}`}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" />
      {variant !== "ghost" && <span className="ml-2">{label}</span>}
    </Button>
  );
}
