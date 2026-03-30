import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ClientsPage } from './pages/ClientsPage';
import { CurrentAccountsPage } from './pages/CurrentAccountsPage';
import { CashboxPage } from './pages/CashboxPage';
import { LabelsPage } from './pages/LabelsPage';
import ReportsPage from './pages/ReportsPage';
import { DatabasePage } from './pages/DatabasePage';
import { UsersPage } from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import GiftCardsPage from './pages/GiftCardsPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    const restrictedPages = ['users', 'database', 'settings'];
    if (restrictedPages.includes(currentPage) && !isAdmin()) {
      setCurrentPage('dashboard');
    }
  }, [currentPage, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-pink-50 to-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'products':
        return <ProductsPage />;
      case 'clients':
        return <ClientsPage />;
      case 'current-accounts':
        return <CurrentAccountsPage />;
      case 'cashbox':
        return <CashboxPage />;
      case 'gift-cards':
        return <GiftCardsPage />;
      case 'labels':
        return <LabelsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'users':
        return <UsersPage />;
      case 'database':
        return <DatabasePage />;
      default:
        return <DashboardPage />;
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
