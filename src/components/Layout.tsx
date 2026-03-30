import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  Wallet,
  FileText,
  UserCog,
  Database,
  Settings,
  Sparkles,
  LogOut,
  Menu,
  X,
  Tag,
  Gift
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard, adminOnly: false },
  { id: 'products', label: 'Productos', icon: Package, adminOnly: false },
  { id: 'clients', label: 'Clientes', icon: Users, adminOnly: false },
  { id: 'current-accounts', label: 'Cuentas Corrientes', icon: CreditCard, adminOnly: false },
  { id: 'cashbox', label: 'Caja', icon: Wallet, adminOnly: false },
  { id: 'gift-cards', label: 'Gift Cards', icon: Gift, adminOnly: false },
  { id: 'labels', label: 'Etiquetas', icon: Tag, adminOnly: false },
  { id: 'reports', label: 'Reportes', icon: FileText, adminOnly: false },
  { id: 'settings', label: 'Configuración', icon: Settings, adminOnly: true },
  { id: 'users', label: 'Usuarios', icon: UserCog, adminOnly: true },
  { id: 'database', label: 'Base de Datos', icon: Database, adminOnly: true },
];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { isAdmin, userProfile, signOut, loading } = useAuth();
  const { showToast, showConfirm } = useNotification();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  console.log('Layout - loading:', loading, 'userProfile:', userProfile, 'isAdmin():', isAdmin());

  const filteredNavItems = navItems.filter(item => {
    if (!item.adminOnly) return true;
    if (loading) return false;
    const adminStatus = isAdmin();
    console.log('Filtering item:', item.id, 'adminOnly:', item.adminOnly, 'isAdmin:', adminStatus);
    return adminStatus;
  });

  async function handleSignOut() {
    const confirmed = await showConfirm({
      title: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      confirmText: 'Sí, Cerrar Sesión',
      cancelText: 'Cancelar',
      variant: 'warning'
    });

    if (!confirmed) return;

    try {
      setLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      showToast('Error al cerrar sesión', 'error');
    } finally {
      setLoggingOut(false);
    }
  }

  function handleNavigate(page: string) {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-gray-50">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-80 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white
        flex flex-col shadow-2xl overflow-hidden
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500 opacity-10 rounded-full blur-3xl -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-600 opacity-10 rounded-full blur-3xl translate-y-32 -translate-x-32" />

        <div className="relative p-6 lg:p-8 border-b border-gray-700/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2.5 lg:p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg shadow-pink-500/30 flex-shrink-0">
                <Sparkles size={24} className="text-white lg:w-7 lg:h-7" />
              </div>
              <div>
                <h1 className="text-lg lg:text-xl font-serif font-bold leading-tight">
                  KIERO QUE <span className="text-pink-400">ME MIRES</span>
                </h1>
                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                  Indumentaria Femenina
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <nav className="relative flex-1 py-4 px-4 overflow-y-auto hide-scrollbar">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`relative w-full flex items-center gap-3 lg:gap-4 px-3 lg:px-4 py-3 lg:py-4 text-left transition-all duration-200 group/item mb-2 rounded-2xl ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg shadow-pink-500/30'
                    : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                }`}
              >
                <div className={`p-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-white/15 shadow-inner'
                    : 'bg-gray-800/50 group-hover/item:bg-gray-700/60'
                }`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="font-semibold text-sm">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute right-5 w-2 h-2 bg-white rounded-full shadow-lg" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="relative p-6 backdrop-blur-sm space-y-4">
          <div className="p-5 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" />
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                Usuario Activo
              </p>
            </div>
            <p className="font-bold text-white text-base mb-2">
              {userProfile?.username || 'Cargando...'}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/20 rounded-full border border-pink-400/30">
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
              <p className="text-xs text-pink-300 font-semibold">
                {userProfile?.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-2xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <LogOut size={20} />
            <span>
              {loggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
            </span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-white/50 backdrop-blur-sm hide-scrollbar">
        <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-pink-600" />
            <span className="font-serif font-bold text-gray-900">KIERO QUE ME MIRES</span>
          </div>
          <div className="w-10" />
        </div>

        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
