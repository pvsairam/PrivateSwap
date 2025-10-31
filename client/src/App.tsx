import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { config } from './lib/wagmi';
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import '@rainbow-me/rainbowkit/styles.css';

function Router() {
  return (
    <>
      <Header />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
      <Footer />
    </>
  );
}

function RainbowKitWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  
  return (
    <RainbowKitProvider
      theme={theme === 'dark' ? darkTheme({
        accentColor: '#06b6d4',
        borderRadius: 'medium',
      }) : lightTheme({
        accentColor: '#06b6d4',
        borderRadius: 'medium',
      })}
    >
      {children}
    </RainbowKitProvider>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <RainbowKitWrapper>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </RainbowKitWrapper>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
