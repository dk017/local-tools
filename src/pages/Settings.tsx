import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Monitor, Check, Key, Shield, Calendar, Cpu, LogOut, Loader2, ExternalLink } from 'lucide-react';
import { useLicense } from '../hooks/useLicense';
import { usePython } from '../hooks/usePython';

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
    const { valid, status, data, refresh } = useLicense();
    const { execute } = usePython();
    const [deactivating, setDeactivating] = React.useState(false);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const handleDeactivate = async () => {
        if (!confirm('Are you sure you want to deactivate this license? You will need to re-enter your license key to use the app.')) {
            return;
        }

        setDeactivating(true);
        try {
            await execute('licensing', 'deactivate', {});
            window.location.reload();
        } catch (error) {
            console.error('Deactivation failed:', error);
            alert('Failed to deactivate license. Please try again.');
        } finally {
            setDeactivating(false);
        }
    };

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'Lifetime';
        try {
            return new Date(dateStr).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'grace_period': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'expired': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-muted-foreground bg-white/5 border-white/10';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Active';
            case 'grace_period': return 'Grace Period';
            case 'expired': return 'Expired';
            default: return 'Unknown';
        }
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

                {/* License Settings */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                            <Key className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">License</h2>
                            <p className="text-sm text-muted-foreground">Manage your license activation</p>
                        </div>
                    </div>

                    <div className="pl-0 md:pl-12 space-y-4">
                        {/* License Status Card */}
                        <div className="p-5 rounded-xl bg-card/40 border border-white/5 space-y-4">
                            {/* Status Badge */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                                    {getStatusLabel(status)}
                                </span>
                            </div>

                            {/* License Details */}
                            {valid && data && (
                                <>
                                    <div className="w-full h-px bg-white/5" />

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {/* Provider */}
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Provider</span>
                                        </div>
                                        <span className="text-right capitalize">{data.provider || 'LemonSqueezy'}</span>

                                        {/* Expiry */}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Expires</span>
                                        </div>
                                        <span className="text-right">{formatDate(data.expires_at)}</span>

                                        {/* Device */}
                                        <div className="flex items-center gap-2">
                                            <Cpu className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Device</span>
                                        </div>
                                        <span className="text-right font-mono text-xs">{data.instance_id?.slice(0, 8) || 'N/A'}...</span>

                                        {/* Activation Usage (if available) */}
                                        {data.activation_limit && (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <Key className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">Devices</span>
                                                </div>
                                                <span className="text-right">
                                                    {data.activation_usage || 1} / {data.activation_limit}
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {/* Grace Period Warning */}
                                    {status === 'grace_period' && (
                                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-400">
                                            Your license has expired. You have a 7-day grace period to renew.
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={refresh}
                                    className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all"
                                >
                                    Refresh Status
                                </button>
                                {valid && (
                                    <button
                                        onClick={handleDeactivate}
                                        disabled={deactivating}
                                        className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-medium text-red-400 transition-all disabled:opacity-50"
                                    >
                                        {deactivating ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <LogOut className="w-4 h-4" />
                                        )}
                                        Deactivate
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Manage License Link */}
                        {data?.provider === 'polar' && (
                            <a
                                href="https://polar.sh/purchases"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-all"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Manage License on Polar
                            </a>
                        )}
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
