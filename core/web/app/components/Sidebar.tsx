"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppLanguage } from "../lib/i18n";
import { useTheme } from "../lib/theme";

export default function Sidebar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useAppLanguage();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { name: t("Compiler", "Derleyici"), path: "/", icon: "C" },
    { name: t("Optimizer", "Optimize"), path: "/optimizer", icon: "O" },
    { name: t("Offline", "Çevrimdışı"), path: "/offline", icon: "F" },
  ];

  return (
    <div className="sidebar-glass w-16 md:w-20 h-screen flex flex-col items-center py-6 gap-4 z-50">
      {/* Logo */}
      <div className="relative group mb-4">
        <div className="absolute inset-0 bg-[var(--apple-blue)] blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 rounded-2xl" />
        <div className="relative h-11 w-11 bg-gradient-to-br from-[#0A84FF] to-[#5E5CE6] rounded-[14px] flex items-center justify-center font-bold text-white shadow-lg hover-lift">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 18l6-6-6-6" />
            <path d="M8 6l-6 6 6 6" />
          </svg>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 stagger-children">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
              title={item.name}
            >
              {item.icon}

              {/* Tooltip */}
              <div className="absolute left-[calc(100%+8px)] glass-light px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 shadow-lg">
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="btn-icon mb-2 group"
        title={t("Toggle Theme", "Tema Değiştir")}
      >
        {theme === "dark" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:rotate-45">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-rotate-12">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        )}
      </button>

      {/* Language Toggle */}
      <button
        onClick={() => setLang(lang === "tr" ? "en" : "tr")}
        className="btn-icon group"
        title={t("Switch Language", "Dili Değiştir")}
      >
        <span className="text-[11px] font-semibold tracking-wide group-hover:scale-110 transition-transform">
          {lang.toUpperCase()}
        </span>
      </button>
    </div>
  );
}
