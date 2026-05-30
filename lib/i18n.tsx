"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import en from "../locales/en.json";
import es from "../locales/es.json";
import ar from "../locales/ar.json";
import fr from "../locales/fr.json";
import de from "../locales/de.json";
import zh from "../locales/zh.json";
import ja from "../locales/ja.json";
import ru from "../locales/ru.json";

type Language = "en" | "es" | "fr" | "de" | "zh" | "ar" | "ja" | "ru";

const translations: Record<Language, any> = {
    en,
    es,
    ar,
    fr,
    de,
    zh,
    ja,
    ru,
};

interface I18nContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    isRtl: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const RTL_LANGUAGES: Language[] = ["ar"];

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("en");
    const [isRtl, setIsRtl] = useState(false);

    // Initial load
    useEffect(() => {
        const saved = localStorage.getItem("language") as Language;
        if (saved && Object.keys(translations).includes(saved)) {
            setLanguage(saved);
        }
    }, []);

    // Handle direction and persistence
    useEffect(() => {
        const isRtlLang = RTL_LANGUAGES.includes(language);
        setIsRtl(isRtlLang);
        document.documentElement.dir = isRtlLang ? "rtl" : "ltr";
        document.documentElement.lang = language;
        localStorage.setItem("language", language);
    }, [language]);

    const t = (key: string) => {
        return translations[language]?.[key] || translations["en"]?.[key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, setLanguage, t, isRtl }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (context === undefined) {
        throw new Error("useI18n must be used within an I18nProvider");
    }
    return context;
}
