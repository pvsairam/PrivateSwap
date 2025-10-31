import { useState, useMemo } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import SwapCard from "@/components/SwapCard";
import TokenSelector from "@/components/TokenSelector";
import { MintCard } from "@/components/MintCard";
import { EncryptionDemo } from "@/components/EncryptionDemo";
import { Token } from "@/lib/tokens";
import { useAllTokenBalances } from "@/hooks/useTokenBalance";
import { usePrices } from "@/hooks/usePrices";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Info } from "lucide-react";
import { CONTRACTS, ENCRYPTED_TOKEN_ABI, DEMO_SWAP_ABI, PRIVATE_SWAP_ABI } from "@/lib/contracts";

export default function Home() {
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const [selectedTokenAIndex, setSelectedTokenAIndex] = useState(0);
  const [selectedTokenBIndex, setSelectedTokenBIndex] = useState(1);
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false);
  const [selectingToken, setSelectingToken] = useState<"A" | "B">("A");

  // Fetch all token balances (hooks called at top level)
  const tokensWithBalances = useAllTokenBalances();
  
  // Fetch live prices
  const { data: prices } = usePrices();

  // Merge live prices with token data
  const tokensWithPrices = useMemo(() => {
    if (!prices) return tokensWithBalances;
    
    return tokensWithBalances.map(token => {
      if (token.symbol === "PUSD" || token.symbol === "ePUSD") {
        return { ...token, price: prices.usdt };
      } else if (token.symbol === "PETH" || token.symbol === "ePETH") {
        return { ...token, price: prices.eth };
      }
      return token;
    });
  }, [tokensWithBalances, prices]);

  const tokenA = tokensWithPrices[selectedTokenAIndex];
  const tokenB = tokensWithPrices[selectedTokenBIndex];

  // Contract write hooks
  const { writeContractAsync } = useWriteContract();

  const handleSwap = async (amountIn: string, minAmountOut: string) => {
    try {
      // Determine which direction we're swapping
      const isAToB = tokenA.address === CONTRACTS.PUSD;
      const tokenAddress = tokenA.address;
      
      // Parse amounts to wei (18 decimals)
      const amountInWei = parseUnits(amountIn, 18);
      const minAmountOutWei = parseUnits(minAmountOut, 18);

      // Show approval toast
      const approvalToast = toast({
        title: "Approval Required",
        description: (
          <div className="space-y-2">
            <p>Approving {tokenA.symbol} for swap...</p>
            <p className="text-sm text-muted-foreground">Please confirm in your wallet</p>
          </div>
        ),
        duration: Infinity,
      });

      // Step 1: Approve DemoSwap to spend tokens
      const approveTx = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: ENCRYPTED_TOKEN_ABI,
        functionName: "approve",
        args: [CONTRACTS.DEMO_SWAP, amountInWei],
      });

      console.log("Approve transaction:", approveTx);
      approvalToast.dismiss();

      // Show swap pending toast
      const swapToast = toast({
        title: "Swap Pending",
        description: (
          <div className="space-y-2">
            <p>Swapping {amountIn} {tokenA.symbol} for ~{minAmountOut} {tokenB.symbol}</p>
            <p className="text-sm text-muted-foreground">Please confirm in your wallet...</p>
          </div>
        ),
        duration: Infinity,
      });

      // Step 2: Execute swap
      const swapTx = await writeContractAsync({
        address: CONTRACTS.DEMO_SWAP,
        abi: DEMO_SWAP_ABI,
        functionName: "swap",
        args: [isAToB, amountInWei, minAmountOutWei],
        gas: BigInt(500000), // Set reasonable gas limit to avoid estimation issues
      });

      console.log("Swap transaction:", swapTx);
      swapToast.dismiss();

      const sepoliaExplorerUrl = `https://sepolia.etherscan.io/tx/${swapTx}`;

      // Show success toast with transaction link
      toast({
        title: "Swap Successful!",
        description: (
          <div className="space-y-2">
            <p>Swapped {amountIn} {tokenA.symbol} for ~{minAmountOut} {tokenB.symbol}</p>
            <a
              href={sepoliaExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
            >
              View on Etherscan <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ),
        duration: 10000,
      });

      console.log(`Transaction hash: ${swapTx}`);
      console.log(`View on Etherscan: ${sepoliaExplorerUrl}`);
    } catch (error: any) {
      console.error("Swap error:", error);
      toast({
        title: "Swap Failed",
        description: error.message || "Transaction rejected or failed",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleSelectToken = (token: Token) => {
    const tokenIndex = tokensWithPrices.findIndex((t) => t.address === token.address);
    if (tokenIndex === -1) return;

    if (selectingToken === "A") {
      setSelectedTokenAIndex(tokenIndex);
    } else {
      setSelectedTokenBIndex(tokenIndex);
    }
    console.log(`Selected ${token.symbol} for token ${selectingToken}`);
  };

  const handleFlipTokens = () => {
    // Swap the selected token indices
    const tempIndex = selectedTokenAIndex;
    setSelectedTokenAIndex(selectedTokenBIndex);
    setSelectedTokenBIndex(tempIndex);
  };

  return (
    <>
      <main className="flex flex-col items-center justify-center min-h-screen px-3 sm:px-4 pt-16 sm:pt-20 pb-16 sm:pb-20 bg-background gap-6">
        <SwapCard
          tokenA={tokenA}
          tokenB={tokenB}
          isConnected={isConnected}
          onSwap={handleSwap}
          onFlipTokens={handleFlipTokens}
          onSelectTokenA={() => {
            setSelectingToken("A");
            setTokenSelectorOpen(true);
          }}
          onSelectTokenB={() => {
            setSelectingToken("B");
            setTokenSelectorOpen(true);
          }}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl">
          <MintCard />
          <EncryptionDemo />
        </div>
      </main>

      <TokenSelector
        open={tokenSelectorOpen}
        onClose={() => setTokenSelectorOpen(false)}
        tokens={tokensWithPrices}
        onSelectToken={handleSelectToken}
      />
    </>
  );
}
