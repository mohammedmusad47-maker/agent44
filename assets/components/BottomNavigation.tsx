import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Don't show bottom nav on splash screen
  if (location.pathname === '/') return null;

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/orders', icon: ClipboardList, label: 'Orders' },
    { path: '/cart', icon: ShoppingBag, label: 'Cart' },
    { path: '/profile', icon: User, label: 'Profile' }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-foodgo-lg z-50">
      <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || 
            (path === '/home' && location.pathname.startsWith('/category')) ||
            (path === '/home' && location.pathname.startsWith('/restaurant'));
          
          return (
            <button
              key={path}
              onClick={() => handleNavigation(path)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-smooth min-w-[60px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export { BottomNavigation };