import { Link } from "react-router-dom";
import { Video, BookOpen } from "lucide-react";
import { MC } from "./base.js";

const CARDS = [
  { to: "/classes", icon: Video, text: "Click here to join or view all your live and upcoming classes", btn: "View Classes/Meetings" },
  { to: "/courses", icon: BookOpen, text: "Click here to view all your courses/subjects", btn: "Courses" },
];

export default function MyClassHome() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {CARDS.map(({ to, icon: Icon, text, btn }) => (
        <Link key={to} to={MC(to)} className="group overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl">
          <div className="flex flex-col items-center px-6 pb-8 pt-10 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-orange-500"><Icon size={38} /></span>
            <p className="mt-6 text-lg text-slate-700">{text}</p>
          </div>
          <div className="bg-slate-800 py-4 text-center text-lg font-medium text-white group-hover:bg-slate-700">{btn}</div>
        </Link>
      ))}
    </div>
  );
}