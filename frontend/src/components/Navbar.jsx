import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Radio, Link2, FileText, Sun, Moon } from "lucide-react";
import useTheme from "../context/useTheme";

const MotionHeader = motion.header;
const MotionDiv = motion.div;

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/radio", label: "Radio", icon: Radio },
    { path: "/url", label: "URL", icon: Link2 },
    { path: "/summarize", label: "Summarize", icon: FileText },
  ];

  return (
    <MotionHeader
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 22 }}
      className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        
        {/* Brand typographic wordmark (Option A) */}
        <MotionDiv
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center"
        >
          <NavLink to="/" className="text-2xl font-black tracking-tight text-[var(--text-primary)] font-display hover:opacity-90 transition-all">
            Saaram<span className="text-[var(--primary)] font-black">.</span>
          </NavLink>
        </MotionDiv>

        {/* Navigation & Theme Toggle Section */}
        <div className="flex items-center gap-4.5">
          {/* Navigation items */}
          <nav className="flex items-center gap-1.5">
            {navItems.map((item, index) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200 sm:px-4 sm:text-sm ${
                    isActive
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <MotionDiv
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="relative z-10 flex items-center gap-2"
                    >
                      <item.icon className="h-[14px] w-[14px] flex-shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </MotionDiv>

                    {isActive && (
                      <MotionDiv
                        layoutId="nav-pill-saaram"
                        className="absolute inset-0 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/8"
                        transition={{ type: "spring", stiffness: 350, damping: 32 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)] hover:border-[var(--primary)]/35"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              <Moon className="h-4.5 w-4.5" />
            ) : (
              <Sun className="h-4.5 w-4.5" />
            )}
          </button>
        </div>

      </div>
    </MotionHeader>
  );
}

export default Navbar;
