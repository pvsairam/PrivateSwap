import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, ExternalLink, Lock } from "lucide-react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";

type FaucetSettings = {
  enabled: boolean;
  cooldownHours: number;
  pusdAmount: string;
  pethAmount: string;
};

export function MintCard() {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const { toast } = useToast();

  // Fetch faucet settings to display amounts
  const { data: settings } = useQuery<FaucetSettings>({
    queryKey: ["/api/faucet/settings"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleMint = async (token: "PUSD" | "PETH" | "ePUSD" | "ePETH") => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to request tokens",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mint tokens");
      }

      const isEncrypted = token === "ePUSD" || token === "ePETH";
      
      toast({
        title: isEncrypted ? "Encrypted Tokens Minted!" : "Tokens Minted!",
        description: (
          <div className="space-y-2">
            <p>Received {data.amount} {data.token}</p>
            {isEncrypted && (
              <p className="text-xs text-muted-foreground">
                Amounts encrypted on blockchain using FHEVM
              </p>
            )}
            <a
              href={data.explorerUrl}
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
    } catch (error: any) {
      console.error("Faucet error:", error);
      toast({
        title: "Mint Failed",
        description: error.message || "Failed to mint tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md" data-testid="card-mint">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          Get Test Tokens
        </CardTitle>
        <CardDescription>
          Request free test tokens to try the swap
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Public Tokens</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleMint("PUSD")}
              disabled={!address || isLoading || !settings}
              data-testid="button-mint-pusd"
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <span className="text-2xl font-bold">{settings?.pusdAmount || "..."}</span>
              <span className="text-xs text-muted-foreground">PUSD</span>
            </Button>
            <Button
              onClick={() => handleMint("PETH")}
              disabled={!address || isLoading || !settings}
              data-testid="button-mint-peth"
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <span className="text-2xl font-bold">{settings?.pethAmount || "..."}</span>
              <span className="text-xs text-muted-foreground">PETH</span>
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Encrypted Tokens (FHEVM)
            </p>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-500 font-medium border border-amber-500/20">
              Requires FHEVM Network
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 opacity-60">
            <Button
              disabled={true}
              data-testid="button-mint-epusd"
              variant="outline"
              className="h-20 flex flex-col gap-2 border-primary/20 cursor-not-allowed"
            >
              <span className="text-2xl font-bold">{settings?.pusdAmount || "..."}</span>
              <span className="text-xs text-muted-foreground">ePUSD</span>
            </Button>
            <Button
              disabled={true}
              data-testid="button-mint-epeth"
              variant="outline"
              className="h-20 flex flex-col gap-2 border-primary/20 cursor-not-allowed"
            >
              <span className="text-2xl font-bold">{settings?.pethAmount || "..."}</span>
              <span className="text-xs text-muted-foreground">ePETH</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Contracts deployed on Sepolia. Minting requires FHE precompiles (available on Zama testnet). View <a href="https://sepolia.etherscan.io/address/0x6D95E7c9BA9a1271B377BcCb5233B4e7d40D0822#code" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ePUSD</a> or <a href="https://sepolia.etherscan.io/address/0xc0A50C6B79Fe7754B89460cFdF2685B0913771Ee#code" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ePETH</a> contracts on Etherscan.
          </p>
        </div>

        {!address && (
          <p className="text-sm text-muted-foreground text-center">
            Connect your wallet to request tokens
          </p>
        )}
        
        {address && (
          <p className="text-sm text-muted-foreground text-center">
            Click a button to receive test tokens instantly
          </p>
        )}
      </CardContent>
    </Card>
  );
}
