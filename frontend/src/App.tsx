import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UserProvider, useUsers } from './context/UserContext';
import { Layout } from './components/Layout';
import { ChatPage } from './pages/ChatPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { AdminPage } from './pages/AdminPage';
import { Spinner } from './components/ui';
import { UserSwitcher } from './components/UserSwitcher';
import { SparkleIcon } from './components/icons';

function Gate({ children }: { children: React.ReactNode }) {
  const { loading, currentUser, users } = useUsers();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!currentUser || users.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <SparkleIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Welcome to GGI Backend Test</h1>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Create a user to start chatting and managing subscription bundles.
          </p>
        </div>
        <UserSwitcher />
      </div>
    );
  }

  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUsers();
  if (currentUser?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Gate>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<ChatPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminPage />
                  </RequireAdmin>
                }
              />
            </Route>
          </Routes>
        </Gate>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
