import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDownUp, Settings, Lock, ChevronDown, RefreshCw, Info, AlertCircle } from "lucide-react";
import { Token } from "@/lib/tokens";
import { usePoolReserves } from "@/hooks/usePoolReserves";
import { CONTRACTS } from "@/lib/contracts";

interface SwapCardProps {
  tokenA: Token;
  tokenB: Token;
  onSwap?: (amountIn: string, minAmountOut: string) => void;
  onSelectTokenA?: () => void;
  onSelectTokenB?: () => void;
  onFlipTokens?: () => void;
  isConnected?: boolean;
}

export default function SwapCard({
  tokenA,
  tokenB,
  onSwap,
  onSelectTokenA,
  onSelectTokenB,
  onFlipTokens,
  isConnected = false,
}: SwapCardProps) {
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState(0.5); // 0.5%
  const [settingsOpen, setSettingsOpen] = useState(false);
  const priceImpact = 0.1; // 0.1%
  const gasEstimateUSD = 2.15;
  const gasEstimateETH = 0.000842;

  // Get USD prices from token objects
  const tokenAPrice = tokenA.price;
  const tokenBPrice = tokenB.price;
  
  // Get actual pool reserves and calculation function
  const { reserveA, reserveB, calculateSwapOutput, hasLiquidity, isLoading } = usePoolReserves();
  
  // Determine swap direction (PUSD = tokenA, PETH = tokenB)
  const isAtoB = tokenA.address === CONTRACTS.PUSD;

  const handleAmountInChange = (value: string) => {
    setAmountIn(value);
    if (value && !isNaN(parseFloat(value)) && parseFloat(value) > 0) {
      // Use REAL pool reserves to calculate output
      const calculated = calculateSwapOutput(value, isAtoB);
      setAmountOut(calculated || "0");
    } else {
      setAmountOut("");
    }
  };

  const handleMaxClick = () => {
    if (tokenA.balance) {
      setAmountIn(tokenA.balance);
      const calculated = calculateSwapOutput(tokenA.balance, isAtoB);
      setAmountOut(calculated || "0");
    }
  };

  const handleSwapClick = () => {
    if (onSwap && amountIn && amountOut) {
      // Calculate minimum received with slippage tolerance
      const minReceived = (parseFloat(amountOut) * (1 - slippageTolerance / 100)).toFixed(6);
      onSwap(amountIn, minReceived);
    }
  };

  const handleFlipTokens = () => {
    // Swap the amounts
    const tempAmountIn = amountIn;
    setAmountIn(amountOut);
    setAmountOut(tempAmountIn);
    
    // Notify parent to swap token selections
    if (onFlipTokens) {
      onFlipTokens();
    }
  };

  const calculateUSDValue = (amount: string, price: number | undefined) => {
    if (!amount || isNaN(parseFloat(amount)) || !price || price === 0) return "$0.00";
    const value = parseFloat(amount) * price;
    if (value > 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value > 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const minimumReceived = amountOut ? (parseFloat(amountOut) * (1 - slippageTolerance / 100)).toFixed(6) : "0";

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-2xl sm:rounded-3xl bg-card border border-card-border shadow-lg p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Swap</h2>
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                data-testid="button-settings"
                className="hover-elevate active-elevate-2 h-9 w-9"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Transaction Settings</h4>
                  <p className="text-xs text-muted-foreground">Customize your swap preferences</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Slippage Tolerance</label>
                  <div className="flex gap-2">
                    {[0.1, 0.5, 1.0].map((value) => (
                      <Button
                        key={value}
                        size="sm"
                        variant={slippageTolerance === value ? "default" : "outline"}
                        onClick={() => setSlippageTolerance(value)}
                        data-testid={`button-slippage-${value}`}
                        className="flex-1"
                      >
                        {value}%
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Custom"
                      value={slippageTolerance}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 50) {
                          setSlippageTolerance(val);
                        }
                      }}
                      step="0.1"
                      min="0"
                      max="50"
                      data-testid="input-custom-slippage"
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  {slippageTolerance > 5 && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      High slippage tolerance may result in unfavorable trades
                    </p>
                  )}
                  {slippageTolerance < 0.1 && slippageTolerance > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      Low slippage tolerance may cause transaction to fail
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Mode Toggle */}
        <div className="mb-4">
          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl border border-border w-fit" data-testid="mode-toggle">
            <Button
              size="sm"
              variant={!isPrivateMode ? "default" : "ghost"}
              onClick={() => setIsPrivateMode(false)}
              data-testid="button-public-mode"
              className="h-8 px-4 text-sm font-medium rounded-lg"
            >
              Public
            </Button>
            <Button
              size="sm"
              variant={isPrivateMode ? "default" : "ghost"}
              onClick={() => setIsPrivateMode(true)}
              data-testid="button-private-mode"
              className="h-8 px-4 text-sm font-medium rounded-lg flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Private
            </Button>
          </div>
          {isPrivateMode && (
            <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20" data-testid="private-mode-info">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-amber-600 dark:text-amber-500">Private swaps coming soon.</span> For now, use the faucet to mint encrypted tokens (ePUSD/ePETH) and verify the ciphertext on Etherscan to see FHEVM in action.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          {/* You Pay Section */}
          <div className="rounded-2xl bg-muted/50 border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">You pay</span>
              {isConnected && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Balance: {tokenA.isLoadingBalance ? '...' : tokenA.balance || '0.00'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleMaxClick}
                    data-testid="button-max"
                    className="h-6 px-2 text-xs font-semibold text-primary hover:text-primary hover-elevate active-elevate-2 rounded-md"
                  >
                    MAX
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Input
                type="text"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => handleAmountInChange(e.target.value)}
                data-testid="input-amount-in"
                className="flex-1 text-3xl sm:text-4xl font-bold bg-transparent border-0 p-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 text-foreground font-mono"
              />
              <Button
                variant="secondary"
                onClick={onSelectTokenA}
                data-testid="button-select-token-a"
                className="flex items-center gap-2 px-4 py-2 hover-elevate active-elevate-2 rounded-xl shrink-0 h-12"
              >
                <span className="font-semibold text-foreground text-base">{tokenA.symbol}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
            {amountIn && (
              <div className="text-sm text-muted-foreground">
                {calculateUSDValue(amountIn, tokenAPrice)}
              </div>
            )}
          </div>

          {/* Flip Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleFlipTokens}
              data-testid="button-flip-tokens"
              className="hover-elevate active-elevate-2 h-10 w-10 rounded-xl border-2 border-border bg-background"
            >
              <ArrowDownUp className="w-4 h-4 text-foreground" />
            </Button>
          </div>

          {/* You Receive Section */}
          <div className="rounded-2xl bg-muted/50 border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">You receive</span>
              {isConnected && (
                <span className="text-sm text-muted-foreground">
                  Balance: {tokenB.isLoadingBalance ? '...' : tokenB.balance || '0.00'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Input
                type="text"
                placeholder="0.0"
                value={amountOut}
                readOnly
                data-testid="text-amount-out"
                className="flex-1 text-3xl sm:text-4xl font-bold bg-transparent border-0 p-0 placeholder:text-muted-foreground/30 text-foreground font-mono"
              />
              <Button
                variant="secondary"
                onClick={onSelectTokenB}
                data-testid="button-select-token-b"
                className="flex items-center gap-2 px-4 py-2 hover-elevate active-elevate-2 rounded-xl shrink-0 h-12"
              >
                <span className="font-semibold text-foreground text-base">{tokenB.symbol}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
            {amountOut && (
              <div className="text-sm text-muted-foreground">
                {calculateUSDValue(amountOut, tokenBPrice)}
              </div>
            )}
          </div>
        </div>

        {/* Private Quote Badge - Only show in private mode */}
        {isPrivateMode && !!amountIn && !!amountOut && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-primary">Encrypted Quote Computed</span>
          </div>
        )}

        {/* Pool Liquidity Warning */}
        {!hasLiquidity && !isLoading && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-sm font-medium text-destructive">Pool has no liquidity</span>
          </div>
        )}

        {/* Exchange Rate */}
        {amountIn && amountOut && hasLiquidity && (
          <div className="mt-4 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
              <span data-testid="text-exchange-rate">
                1 {tokenA.symbol} ≈ {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(4)} {tokenB.symbol}
              </span>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              data-testid="button-toggle-details"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <span>{showDetails ? 'Hide' : 'Show'} details</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}

        {/* Transaction Details */}
        {showDetails && amountIn && (
          <div className="mt-4 space-y-3 p-4 rounded-xl bg-muted/30 border border-border" data-testid="section-details">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Price impact</span>
              <span className={`font-medium ${priceImpact < 1 ? 'text-success' : priceImpact < 3 ? 'text-warning' : 'text-destructive'}`}>
                {priceImpact < 0.01 ? '<0.01' : priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Slippage tolerance</span>
              <span className="text-foreground font-medium">{slippageTolerance}%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Minimum received</span>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-foreground font-medium">{minimumReceived} {tokenB.symbol}</span>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Network fee</span>
                <span className="text-foreground font-medium">${gasEstimateUSD} ({gasEstimateETH} ETH)</span>
              </div>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwapClick}
          disabled={!isConnected || !amountIn || !hasLiquidity || isPrivateMode || parseFloat(amountIn) > parseFloat(tokenA.balance || "0")}
          data-testid="button-swap"
          variant="default"
          className="w-full mt-4 h-14 text-base font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!isConnected 
            ? "Connect Wallet" 
            : !hasLiquidity 
            ? "Insufficient liquidity" 
            : isPrivateMode
            ? "Private Swaps Coming Soon"
            : parseFloat(amountIn || "0") > parseFloat(tokenA.balance || "0")
            ? "Insufficient balance"
            : !amountIn 
            ? "Enter amount" 
            : "Preview Swap"}
        </Button>
      </div>
    </div>
  );
}
