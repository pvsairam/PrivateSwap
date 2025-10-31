export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Built with</span>
            <span className="text-red-500">♥</span>
            <span>by</span>
            <a 
              href="https://x.com/xtestnet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
              data-testid="link-xtestnet"
            >
              xtestnet
            </a>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <a
              href="https://zama.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-primary transition-colors"
              data-testid="link-zama"
            >
              Zama
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
