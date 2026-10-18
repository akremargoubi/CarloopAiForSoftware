import { Outlet } from 'react-router-dom';
import { features } from '../features';
import { Navbar } from './Navbar';

const globalWidgets = features.flatMap((f) => f.globalWidgets ?? []);

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} CarLoop · Mini-projet ESPRIT « IA for Software Engineering »</span>
          <span>Les réponses de l’IA sont indicatives et ne remplacent pas l’avis d’un professionnel.</span>
        </div>
      </footer>
      {globalWidgets.map((Widget, i) => (
        <Widget key={i} />
      ))}
    </div>
  );
}
