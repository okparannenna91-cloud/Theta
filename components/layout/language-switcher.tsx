"use client";

import { useI18n } from "@/lib/i18n";
import { Select } from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const { language, setLanguage } = useI18n();

    return (
        <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="w-[120px] h-9 text-xs"
            >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
                <option value="ar">العربية</option>
                <option value="ja">日本語</option>
                <option value="ru">Русский</option>
            </Select>
        </div>
    );
}
