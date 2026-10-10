import { Monitor, FileSpreadsheet, Globe, Server, Code2, Network, Brain } from "lucide-react";
const map = { Monitor, FileSpreadsheet, Globe, Server, Code2, Network, Brain };
export default function CategoryIcon({ name, ...p }) { const I = map[name] || Code2; return <I {...p} />; }
