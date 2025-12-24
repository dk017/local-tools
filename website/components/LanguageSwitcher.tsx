'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Globe, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'jp', label: '日本語' },
    { code: 'kr', label: '한국어' },
];

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const switchLocale = (newLocale: string) => {
        // Pathname is like /en/tools or /en
        // Regex to replace the locale prefix
        // Matches start of string, slash, 2 letter code, and either end or another slash
        // Actually, just replacing the first segment is safer given next-intl structure
        const segments = pathname.split('/');
        // segments[0] is empty string (split on /)
        // segments[1] is the locale (e.g. 'en')
        segments[1] = newLocale;
        const newPath = segments.join('/');

        router.push(newPath);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"
                aria-label="Change Language"
            >
                <Globe className="w-4 h-4" />
                <span className="uppercase">{locale}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-background/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-50">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => switchLocale(lang.code)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 flex items-center justify-between transition-colors"
                        >
                            <span>{lang.label}</span>
                            {locale === lang.code && <Check className="w-3 h-3 text-primary" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
