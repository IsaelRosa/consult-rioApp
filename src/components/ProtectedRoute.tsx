import { Navigate } from 'react-router-dom';
import { useAuth, usePerfil } from '../contexts/AuthContext';
import { pode } from '../lib/rbac';
import type { PerfilSlug } from '../types';

export default function ProtectedRoute({
  children,
  permissao,
}: {
  children: React.ReactNode;
  permissao?: string;
}) {
  const { user, loading } = useAuth();
  const perfil = usePerfil();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  // Sem permissão vai para o dashboard, não para "/" (que é a landing pública).
  if (permissao && !pode(perfil, permissao)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
