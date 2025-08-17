import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
      <Sidebar />
    </div>
  );
};

export default MainLayout;
