import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Moon, Sun, Lock, Shield, Home } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useAccount } from 'wagmi';

const ADMIN_ADDRESS = "0xF9810b951d45D19754435D8e44b7761aA1635D72";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { address } = useAccount();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation('/')}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold text-foreground">PrivateSwap</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Privacy-First DEX</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2 ml-2 sm:ml-4">
            <Button
              variant={location === '/' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setLocation('/')}
              data-testid="button-nav-home"
              className="gap-1 sm:gap-2"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Swap</span>
            </Button>
            {address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase() && (
              <Button
                variant={location === '/admin' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setLocation('/admin')}
                data-testid="button-nav-admin"
                className="gap-1 sm:gap-2"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-testid="button-theme-toggle"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* Wallet Connect */}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
