import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Token } from "@/lib/tokens";

interface TokenSelectorProps {
  open: boolean;
  onClose: () => void;
  tokens: Token[];
  onSelectToken: (token: Token) => void;
}

export default function TokenSelector({
  open,
  onClose,
  tokens,
  onSelectToken,
}: TokenSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(search.toLowerCase()) ||
      token.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (token: Token) => {
    onSelectToken(token);
    onClose();
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-card-border text-card-foreground max-w-md mx-3 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-foreground">Select Token</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or symbol"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-token-search"
            className="pl-9 sm:pl-10 bg-muted border-border focus-visible:ring-primary text-sm sm:text-base"
          />
        </div>

        <div className="max-h-80 sm:max-h-96 overflow-y-auto space-y-1">
          {filteredTokens.map((token) => (
            <button
              key={token.address}
              onClick={() => handleSelect(token)}
              data-testid={`button-token-${token.symbol.toLowerCase()}`}
              className="w-full flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl hover-elevate active-elevate-2 transition-all text-left"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm sm:text-base">
                  {token.symbol.slice(0, 1)}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm sm:text-base">{token.symbol}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{token.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-foreground text-sm sm:text-base">
                  {token.isLoadingBalance ? '...' : token.balance || '0.00'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
