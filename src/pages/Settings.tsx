import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Monitor, Check } from 'lucide-react';

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'jp', label: '日本語 (Japanese)' },
    { code: 'kr', label: '한국어 (Korean)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'it', label: 'Italiano (Italian)' },
    { code: 'es', label: 'Español (Spanish)' },
];

export const Settings: React.FC = () => {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-y-auto">
            {/* Header */}
            <div className="h-16 shrink-0 border-b border-white/5 flex items-center px-8 bg-background/40 backdrop-blur-md sticky top-0 z-50">
                <h1 className="text-xl font-bold tracking-tight">{t('settings.title')}</h1>
            </div>

            <div className="p-8 max-w-4xl mx-auto w-full space-y-8">

                {/* Language Settings */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">{t('settings.language')}</h2>
                            <p className="text-sm text-muted-foreground">{t('settings.language_desc')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 md:pl-12">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`
                                    flex items-center justify-between p-4 rounded-xl border transition-all
                                    ${i18n.language === lang.code
                                        ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/20'
                                        : 'bg-card/40 border-white/5 hover:bg-card/60 hover:border-white/10'
                                    }
                                `}
                            >
                                <span className={`font-medium ${i18n.language === lang.code ? 'text-primary' : 'text-foreground'}`}>
                                    {lang.label}
                                </span>
                                {i18n.language === lang.code && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                <div className="w-full h-px bg-white/5" />

                {/* Theme Settings (Placeholder for now) */}
                <section className="space-y-4 opacity-70 cursor-not-allowed grayscale">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Appearance</h2>
                            <p className="text-sm text-muted-foreground">Customize the look and feel (Coming Soon)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pl-0 md:pl-12 pointer-events-none">
                        {['Light', 'Dark', 'System'].map((theme) => (
                            <div key={theme} className="p-4 rounded-xl bg-card/40 border border-white/5 text-center text-sm font-medium text-muted-foreground">
                                {theme}
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
};
