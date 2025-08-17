import React from 'react';
import { NavLink } from 'react-router-dom';
import { useThemeStore } from '@/store/useThemeStore';
import {
  LayoutDashboard,
  Book,
  Sun,
  Moon,
  Laptop,
  Users,
  Library,
  FileText,
  Receipt,
  UsersRound,
  PercentSquare,
  BarChart,
  ClipboardCheck,
  History,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/vouchers', label: 'سندات الخزينة', icon: FileText },
  { to: '/accounts', label: 'شجرة الحسابات', icon: Library },
  { to: '/parties', label: 'العملاء والموردون', icon: Users },
  { to: '/partners', label: 'الشركاء', icon: UsersRound },
  { to: '/expenses', label: 'إدارة المصروفات', icon: Receipt },
  { to: '/settlement-rules', label: 'قواعد التسوية', icon: PercentSquare },
  { to: '/reports', label: 'التقارير', icon: BarChart },
  { to: '/audit', label: 'السجلات المدققة', icon: History },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

const ThemeToggle = () => {
    const { theme, setTheme } = useThemeStore();

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark');
        else if (theme === 'dark') setTheme('system');
        else setTheme('light');
    };

    return (
        <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label="Toggle theme">
            {theme === 'light' && <Sun className="h-5 w-5" />}
            {theme === 'dark' && <Moon className="h-5 w-5" />}
            {theme === 'system' && <Laptop className="h-5 w-5" />}
        </Button>
    )
}


const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-100 dark:bg-gray-800 p-4 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="flex items-center mb-8">
        <Book className="w-8 h-8 text-blue-600 dark:text-blue-500" />
        <h1 className="text-xl font-bold mr-2">الخزينة</h1>
      </div>
      <nav className="flex-1">
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center p-2 my-1 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                    {
                      'bg-blue-500 text-white dark:bg-blue-600 dark:text-white hover:bg-blue-500/90 dark:hover:bg-blue-600/90': isActive,
                    }
                  )
                }
              >
                <item.icon className="w-5 h-5 ml-3" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto flex justify-center">
        <ThemeToggle />
      </div>
    </aside>
  );
};

export default Sidebar;
