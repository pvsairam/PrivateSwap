import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, Unlock, ArrowRight, Eye, EyeOff, ExternalLink, Sparkles } from "lucide-react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";

type FaucetSettings = {
  enabled: boolean;
  cooldownHours: number;
  pusdAmount: string;
  pethAmount: string;
};

export function EncryptionDemo() {
  const [amount, setAmount] = useState("100");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const { toast } = useToast();

  // Fetch faucet settings
  const { data: settings } = useQuery<FaucetSettings>({
    queryKey: ["/api/faucet/settings"],
    refetchInterval: 10000,
  });

  // Simple encryption simulation (for visual demo)
  const mockEncrypt = (value: string): string => {
    const chars = "0123456789abcdef";
    let result = "0x";
    for (let i = 0; i < 64; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  const encryptedValue = mockEncrypt(amount);

  const handleShowDemo = () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to see the demo",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Simulate the encryption process
    setTimeout(() => {
      setIsEncrypted(true);
      setShowDecrypted(false);
      setIsLoading(false);

      toast({
        title: "Encryption Demo Active",
        description: "See below how FHE encryption would work on a FHEVM-enabled network",
      });
    }, 1000);
  };

  return (
    <Card className="w-full max-w-2xl" data-testid="card-encryption-demo">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          FHEVM Encryption Demo
        </CardTitle>
        <CardDescription>
          Interactive demonstration of how FHE encryption works for private token balances
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Token Amount (from Faucet)</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={settings?.pusdAmount || "100"}
              disabled
              className="flex-1 text-lg"
              data-testid="input-amount"
            />
            <span className="flex items-center px-4 py-2 bg-muted rounded-lg text-foreground font-medium">
              ePUSD
            </span>
          </div>
        </div>

        {/* Demo Button */}
        <div className="flex items-center justify-center">
          <Button
            onClick={handleShowDemo}
            disabled={isLoading || !address}
            data-testid="button-show-encryption-demo"
            size="lg"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? "Loading..." : "Show Encryption Demo"}
          </Button>
        </div>

        {!address && (
          <p className="text-sm text-center text-muted-foreground">
            Connect your wallet to see the encryption demo
          </p>
        )}

        {/* Encryption Flow Visualization */}
        {isEncrypted && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Lock className="w-5 h-5 text-green-600 dark:text-green-500" />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <Button
                onClick={() => setShowDecrypted(!showDecrypted)}
                data-testid="button-decrypt"
                variant={showDecrypted ? "default" : "outline"}
                className="gap-2"
              >
                {showDecrypted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showDecrypted ? "Hide" : "Decrypt (Your View)"}
              </Button>
            </div>

            {/* Encrypted View */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-medium text-foreground">Encrypted On-Chain Storage</p>
                    <p className="text-xs text-muted-foreground">
                      This is how your encrypted balance would appear on a FHEVM network
                    </p>
                    <div className="p-3 rounded-lg bg-background border border-border font-mono text-xs break-all">
                      {encryptedValue}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Encrypted using FHE.asEuint64() (demonstration)
                    </div>
                  </div>
                </div>
              </div>

              {/* Decrypted View */}
              {showDecrypted && (
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                      <Unlock className="w-4 h-4 text-green-600 dark:text-green-500" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-foreground">Decrypted View (Only You)</p>
                      <p className="text-xs text-muted-foreground">
                        Only you can decrypt and see your actual balance
                      </p>
                      <div className="p-3 rounded-lg bg-background border border-border">
                        <span className="text-2xl font-bold text-foreground font-mono">
                          {settings?.pusdAmount || "100"} ePUSD
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-500">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Private key required to decrypt
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
          <p className="text-sm font-semibold text-foreground">How FHE Encryption Works</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
              <p><strong className="text-foreground">Encryption:</strong> FHE.asEuint64() converts plaintext amounts into encrypted ciphertext</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
              <p><strong className="text-foreground">On-Chain Privacy:</strong> Balances stored as euint64 - completely encrypted on blockchain</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
              <p><strong className="text-foreground">Selective Decryption:</strong> Only authorized parties can decrypt and view balances</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0"></div>
              <p><strong className="text-foreground">FHE Operations:</strong> Add, multiply, compare encrypted values without decryption</p>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-500">
                Requires Zama FHEVM Testnet
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                EncryptedPUSD/PETH contracts are deployed on Sepolia. Full FHE operations require Zama testnet infrastructure.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
