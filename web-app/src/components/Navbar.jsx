import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('stage');

  const navLinks = [
    { label: t('nav.stage'), href: '#stage', id: 'stage' },
    { label: t('nav.archive'), href: '#archive', id: 'archive' },
    { label: t('nav.choice'), href: '#choice', id: 'choice' },
    { label: t('nav.request'), href: '#request', id: 'request' },
  ];

  // Track active section with IntersectionObserver
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ['stage', 'archive', 'choice', 'request'];
      const scrollY = window.scrollY + 120; // offset for sticky nav

      let current = 'stage';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) {
          current = id;
        }
      }
      setActiveSection(current);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNavClick = useCallback((id) => {
    setActiveSection(id);
    setMobileOpen(false);
  }, []);

  return (
    <nav className="bg-slate-950/80 backdrop-blur-xl docked full-width top-0 sticky z-50">
      <div className="flex justify-between items-center w-full px-6 md:px-8 py-4 md:py-6 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <a href="#" className="text-xl md:text-2xl font-serif italic text-primary tracking-tighter">
          {t('nav.title')}
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex gap-10 items-center">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={() => handleNavClick(link.id)}
              className={`font-serif italic tracking-tight text-lg transition-all duration-300 hover:scale-105 relative pb-1 ${
                activeSection === link.id
                  ? 'text-primary font-semibold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {link.label}
              {activeSection === link.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-primary/50" />
              )}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {/* Language switcher */}
          <div className="flex gap-2 items-center text-xs md:text-sm font-semibold tracking-wide text-on-surface-variant font-body">
            <button onClick={() => i18n.changeLanguage('tr')} className={`hover:text-primary transition-colors ${i18n.language === 'tr' ? 'text-primary' : ''}`}>TR</button>
            <span className="opacity-50">|</span>
            <button onClick={() => i18n.changeLanguage('en')} className={`hover:text-primary transition-colors ${i18n.language === 'en' || i18n.language === 'en-US' ? 'text-primary' : ''}`}>EN</button>
            <span className="opacity-50">|</span>
            <button onClick={() => i18n.changeLanguage('it')} className={`hover:text-primary transition-colors ${i18n.language === 'it' ? 'text-primary' : ''}`}>IT</button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-on-surface p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-400 ease-in-out ${
          mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-1 px-6 pb-6 pt-4">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={() => handleNavClick(link.id)}
              className={`font-serif italic text-lg py-3 px-2 transition-all duration-200 ${
                activeSection === link.id
                  ? 'text-primary bg-primary/5 font-semibold'
                  : 'text-on-surface-variant hover:text-primary hover:bg-slate-900/50'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
