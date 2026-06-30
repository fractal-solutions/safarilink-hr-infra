export const THEMES: Record<string, Record<string, string>> = {
  safari: {
    "--color-sf-brown": "#5C3A1E",
    "--color-sf-brown-dark": "#4A2E17",
    "--color-sf-brown-light": "#7A5230",
    "--color-sf-gold": "#C8A951",
    "--color-sf-gold-light": "#D4BA6A",
    "--color-sf-gold-dark": "#B89A3E",
    "--color-sf-cream": "#FDF8F0",
    "--color-sf-cream-dark": "#F5EDE0",
  },
  ocean: {
    "--color-sf-brown": "#0E4D64",
    "--color-sf-brown-dark": "#0A3A4D",
    "--color-sf-brown-light": "#1A6E8A",
    "--color-sf-gold": "#38BDF8",
    "--color-sf-gold-light": "#7DD3FC",
    "--color-sf-gold-dark": "#0EA5E9",
    "--color-sf-cream": "#F0F9FF",
    "--color-sf-cream-dark": "#E0F2FE",
  },
  forest: {
    "--color-sf-brown": "#1B5E20",
    "--color-sf-brown-dark": "#144518",
    "--color-sf-brown-light": "#2E7D32",
    "--color-sf-gold": "#66BB6A",
    "--color-sf-gold-light": "#A5D6A7",
    "--color-sf-gold-dark": "#4CAF50",
    "--color-sf-cream": "#F1F8E9",
    "--color-sf-cream-dark": "#DCEDC8",
  },
  sunset: {
    "--color-sf-brown": "#BF360C",
    "--color-sf-brown-dark": "#A32B0A",
    "--color-sf-brown-light": "#D84315",
    "--color-sf-gold": "#FF8A65",
    "--color-sf-gold-light": "#FFAB91",
    "--color-sf-gold-dark": "#FF7043",
    "--color-sf-cream": "#FFF3E0",
    "--color-sf-cream-dark": "#FFE0B2",
  },
  royal: {
    "--color-sf-brown": "#4A148C",
    "--color-sf-brown-dark": "#380E6E",
    "--color-sf-brown-light": "#6A1B9A",
    "--color-sf-gold": "#CE93D8",
    "--color-sf-gold-light": "#E1BEE7",
    "--color-sf-gold-dark": "#AB47BC",
    "--color-sf-cream": "#F3E5F5",
    "--color-sf-cream-dark": "#EDE7F6",
  },
  midnight: {
    "--color-sf-brown": "#1E293B",
    "--color-sf-brown-dark": "#0F172A",
    "--color-sf-brown-light": "#334155",
    "--color-sf-gold": "#38BDF8",
    "--color-sf-gold-light": "#7DD3FC",
    "--color-sf-gold-dark": "#0EA5E9",
    "--color-sf-cream": "#F8FAFC",
    "--color-sf-cream-dark": "#F1F5F9",
  },
  rose: {
    "--color-sf-brown": "#880E4F",
    "--color-sf-brown-dark": "#6D0B3E",
    "--color-sf-brown-light": "#AD1457",
    "--color-sf-gold": "#F48FB1",
    "--color-sf-gold-light": "#F8BBD0",
    "--color-sf-gold-dark": "#EC407A",
    "--color-sf-cream": "#FCE4EC",
    "--color-sf-cream-dark": "#F8BBD0",
  },
  emerald: {
    "--color-sf-brown": "#00695C",
    "--color-sf-brown-dark": "#004D40",
    "--color-sf-brown-light": "#00897B",
    "--color-sf-gold": "#4DB6AC",
    "--color-sf-gold-light": "#80CBC4",
    "--color-sf-gold-dark": "#26A69A",
    "--color-sf-cream": "#E0F2F1",
    "--color-sf-cream-dark": "#B2DFDB",
  },
};

export function applyTheme(themeId: string) {
  const root = document.documentElement;
  const theme = THEMES[themeId] || THEMES.safari;
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(key, value);
  }
  root.className = root.className.replace(/theme-\S+/g, "").trim();
  root.classList.add(`theme-${themeId}`);
}

export const THEME_META: { id: string; name: string; desc: string; colors: string[] }[] = [
  { id: "safari", name: "Safari", desc: "Classic Safarilink brown & gold", colors: ["#5C3A1E", "#C8A951", "#FDF8F0"] },
  { id: "ocean", name: "Ocean", desc: "Deep teal with sky blue accents", colors: ["#0E4D64", "#38BDF8", "#F0F9FF"] },
  { id: "forest", name: "Forest", desc: "Rich green with natural tones", colors: ["#1B5E20", "#66BB6A", "#F1F8E9"] },
  { id: "sunset", name: "Sunset", desc: "Warm coral with amber glow", colors: ["#BF360C", "#FF8A65", "#FFF3E0"] },
  { id: "royal", name: "Royal", desc: "Deep purple with lavender highlights", colors: ["#4A148C", "#CE93D8", "#F3E5F5"] },
  { id: "midnight", name: "Midnight", desc: "Slate navy with cool blue", colors: ["#1E293B", "#38BDF8", "#F8FAFC"] },
  { id: "rose", name: "Rose", desc: "Deep pink with blush accents", colors: ["#880E4F", "#F48FB1", "#FCE4EC"] },
  { id: "emerald", name: "Emerald", desc: "Teal green with mint freshness", colors: ["#00695C", "#4DB6AC", "#E0F2F1"] },
];
