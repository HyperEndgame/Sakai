import { Logo } from "./Logo";
import { MoonIcon, SunIcon } from "./icons";

export function Header({ theme, onToggleTheme }: { theme: "light" | "dark"; onToggleTheme: () => void }) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <Logo />
        <span>Rohtak</span>
      </div>
      <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
