import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

import './style.css';
import './store/useThemeStore'; // Import to initialize theme logic

import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import VouchersPage from './pages/VouchersPage';
import AccountsPage from './pages/AccountsPage';
import PartiesPage from './pages/PartiesPage';
import PartnersPage from './pages/PartnersPage';
import ExpensesPage from './pages/ExpensesPage';
import SettlementRulesPage from './pages/SettlementRulesPage';
import ReportsPage from './pages/ReportsPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'vouchers', element: <VouchersPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'parties', element: <PartiesPage /> },
      { path: 'partners', element: <PartnersPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'settlement-rules', element: <SettlementRulesPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
