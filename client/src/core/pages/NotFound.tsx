import { ButtonLink } from '../components/Button';

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-bold text-primary-500">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Page introuvable</h1>
      <p className="mt-2 text-slate-600">Cette page n’existe pas ou le module correspondant n’est pas activé.</p>
      <ButtonLink to="/" className="mt-6">
        Retour à l’accueil
      </ButtonLink>
    </div>
  );
}
