export const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;
export const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export const fmtDay = (d) => {
  const diff = Math.round((new Date(d).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 864e5);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : fmtDate(d);
};
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
export const clock = (secs) => { const s = Math.max(0, Math.floor(secs)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? `${h}:` : "") + `${String(m).padStart(h ? 2 : 1, "0")}:${String(x).padStart(2, "0")}`; };
export const initials = (n = "") => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
