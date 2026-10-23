"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { locale, toggleLocale } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      className="h-11 gap-1.5 font-semibold"
      aria-label="Switch language"
    >
      <Languages className="size-4" />
      {locale === "ar" ? "EN" : "ع"}
    </Button>
  );
}
