"use client";

import { useI18n } from "@/lib/i18n";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const { language, setLanguage } = useI18n();

    return (
        <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Select
                value={language}
                onValueChange={(val: any) => setLanguage(val)}
            >
                <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ru">Русский</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
