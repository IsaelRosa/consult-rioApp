import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, usePerfil } from '../contexts/AuthContext';
import { pode } from '../lib/rbac';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  ClipboardList,
  Smile,
  FileText,
  CreditCard,
  DollarSign,
  BarChart3,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import type { PerfilSlug } from '../types';

const navItems: { to: string; label: string; icon: React.ElementType; permissao: string }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permissao: 'dashboard' },
  { to: '/pacientes', label: 'Pacientes', icon: Users, permissao: 'pacientes' },
  { to: '/dentistas', label: 'Dentistas', icon: Stethoscope, permissao: 'dentistas' },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, permissao: 'agenda' },
  { to: '/prontuarios', label: 'Prontuários', icon: ClipboardList, permissao: 'prontuario' },
  { to: '/odontograma', label: 'Odontograma', icon: Smile, permissao: 'odontograma' },
  { to: '/orcamentos', label: 'Orçamentos', icon: FileText, permissao: 'orcamentos' },
  { to: '/pagamentos', label: 'Pagamentos', icon: CreditCard, permissao: 'pagamentos' },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSign, permissao: 'financeiro' },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, permissao: 'relatorios' },
  { to: '/usuarios', label: 'Usuários', icon: Shield, permissao: 'usuarios' },
  { to: '/planos', label: 'Plano e assinatura', icon: CreditCard, permissao: 'usuarios' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const perfil = usePerfil();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => pode(perfil, item.permissao));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-xl font-bold text-sky-400">
            <Smile className="h-7 w-7" />
            <span>OdontoClinic</span>
          </div>
          <button onClick={() => setMenuOpen(false)} className="lg:hidden">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="space-y-1 px-3">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-4">
          <div className="mb-3 text-sm">
            <p className="font-medium text-white">{user?.nome || user?.email}</p>
            <p className="text-xs text-slate-400">{user?.perfil?.nome}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm lg:px-8">
          <button onClick={() => setMenuOpen(true)} className="lg:hidden">
            <Menu className="h-6 w-6 text-slate-700" />
          </button>
          <h2 className="hidden text-lg font-semibold text-slate-800 lg:block">
            Sistema de Gestão Odontológica
          </h2>
          <div className="text-sm text-slate-500">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
