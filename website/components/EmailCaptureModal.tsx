'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function EmailCaptureModal() {
  const t = useTranslations('EmailCapture');
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Check if user has already dismissed or submitted
    const dismissed = localStorage.getItem('email_capture_dismissed');
    const submitted = localStorage.getItem('email_capture_submitted');

    if (dismissed || submitted) {
      return;
    }

    // Exit intent detection
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setIsOpen(true);
        setHasShown(true);
      }
    };

    // Time-based trigger (after 30 seconds on page)
    const timer = setTimeout(() => {
      if (!hasShown) {
        setIsOpen(true);
        setHasShown(true);
      }
    }, 30000);

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [hasShown]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('email_capture_dismissed', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with your actual email capture endpoint
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        localStorage.setItem('email_capture_submitted', 'true');

        // Auto-close after 3 seconds
        setTimeout(() => {
          setIsOpen(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Email capture error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return null;
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-gradient-to-b from-gray-900 to-black border border-primary/20 rounded-2xl p-8 shadow-2xl shadow-primary/10 relative">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {!isSubmitted ? (
                <>
                  {/* Icon */}
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>

                  {/* Headline */}
                  <h3 className="text-2xl font-bold text-center mb-2">
                    {t('title')}
                  </h3>

                  <p className="text-muted-foreground text-center mb-6">
                    {t('subtitle')}
                  </p>

                  {/* Benefits */}
                  <ul className="space-y-2 mb-6">
                    {[1, 2, 3].map((num) => (
                      <li key={num} className="flex items-start gap-2 text-sm">
                        <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-gray-300">{t(`benefit${num}`)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('email_placeholder')}
                        required
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-primary hover:bg-cyan-400 text-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? t('submitting') : t('submit_button')}
                    </button>
                  </form>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    {t('privacy_note')}
                  </p>
                </>
              ) : (
                // Success state
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Zap className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{t('success_title')}</h3>
                  <p className="text-muted-foreground">{t('success_message')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
