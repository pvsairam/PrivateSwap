import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, RefreshCw, Lock, ExternalLink, AlertCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ADMIN_ADDRESS = "0xF9810b951d45D19754435D8e44b7761aA1635D72";

type FaucetSettings = {
  id: number;
  enabled: boolean;
  cooldownHours: number;
  pusdAmount: string;
  pethAmount: string;
};

type FaucetClaim = {
  id: number;
  address: string;
  token: string;
  amount: string;
  txHash: string;
  claimedAt: string;
};

export default function Admin() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<FaucetSettings | null>(null);
  const [claims, setClaims] = useState<FaucetClaim[]>([]);
  
  const [enabled, setEnabled] = useState(true);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [pusdAmount, setPusdAmount] = useState("1000");
  const [pethAmount, setPethAmount] = useState("0.5");

  // Authenticate and load claims
  const handleAuthenticate = async () => {
    if (!address || !isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Sign authentication message
      const message = `PrivateSwap Admin Authentication\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      
      // Fetch claims with signature verification
      const response = await fetch(
        `/api/faucet/claims?address=${encodeURIComponent(address)}&message=${encodeURIComponent(message)}&signature=${encodeURIComponent(signature)}`
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Authentication failed");
      }

      const data = await response.json();
      setClaims(data);
      setIsAuthenticated(true);

      toast({
        title: "Authenticated",
        description: "Admin access granted",
      });
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate as admin",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch settings (public endpoint)
  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/faucet/settings");
      const data = await response.json();
      setSettings(data);
      setEnabled(data.enabled);
      setCooldownHours(data.cooldownHours);
      setPusdAmount(data.pusdAmount);
      setPethAmount(data.pethAmount);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  // Refresh claims
  const refreshClaims = async () => {
    if (!address || !isAuthenticated) return;

    setIsLoading(true);
    try {
      // Sign authentication message
      const message = `PrivateSwap Admin Authentication\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      
      const response = await fetch(
        `/api/faucet/claims?address=${encodeURIComponent(address)}&message=${encodeURIComponent(message)}&signature=${encodeURIComponent(signature)}`
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch claims");
      }

      const data = await response.json();
      setClaims(data);

      toast({
        title: "Refreshed",
        description: "Claims data updated",
      });
    } catch (error: any) {
      console.error("Refresh error:", error);
      toast({
        title: "Refresh Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update settings
  const handleUpdateSettings = async () => {
    if (!address || !isAuthenticated) return;

    setIsLoading(true);
    try {
      // Sign update message
      const message = `PrivateSwap Admin Settings Update\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      
      const response = await fetch("/api/faucet/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          message,
          signature,
          enabled,
          cooldownHours,
          pusdAmount,
          pethAmount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update settings");
      }

      const data = await response.json();
      setSettings(data);

      toast({
        title: "Settings Updated",
        description: "Faucet configuration saved successfully",
      });
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-4 py-20 bg-background">
        <Card className="w-full max-w-md" data-testid="card-admin-connect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Admin Panel
            </CardTitle>
            <CardDescription>
              Connect your wallet to access admin controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Lock className="w-4 h-4" />
              <AlertDescription>
                This page requires wallet authentication. Please connect your wallet to continue.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (address?.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-4 py-20 bg-background">
        <Card className="w-full max-w-md" data-testid="card-admin-forbidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              This page is restricted to admin accounts only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Your wallet address does not have admin permissions.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Connected Address:</p>
              <p className="text-xs font-mono">{address}</p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Please connect with an authorized admin wallet to access this panel.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-4 py-20 bg-background">
        <Card className="w-full max-w-md" data-testid="card-admin-auth">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Admin Panel
            </CardTitle>
            <CardDescription>
              Sign a message to verify admin access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                You'll be prompted to sign a message with your wallet. This verifies you have admin permissions without exposing your private key.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Connected Address:</p>
              <p className="text-sm font-mono font-semibold">{address}</p>
            </div>

            <Button
              onClick={handleAuthenticate}
              disabled={isLoading}
              className="w-full"
              data-testid="button-authenticate"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Sign Message to Authenticate
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen px-4 py-20 bg-background">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage faucet settings and monitor token claims
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {formatAddress(address!)}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Faucet Settings */}
          <Card data-testid="card-faucet-settings">
            <CardHeader>
              <CardTitle>Faucet Settings</CardTitle>
              <CardDescription>
                Configure token amounts and claim restrictions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Faucet Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow users to claim tokens
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                  data-testid="switch-enabled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldown">Cooldown Period (hours)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  value={cooldownHours}
                  onChange={(e) => setCooldownHours(parseInt(e.target.value))}
                  min="1"
                  max="168"
                  data-testid="input-cooldown"
                />
                <p className="text-xs text-muted-foreground">
                  Time between claims for each address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pusd">PUSD Amount per Claim</Label>
                <Input
                  id="pusd"
                  type="text"
                  value={pusdAmount}
                  onChange={(e) => setPusdAmount(e.target.value)}
                  data-testid="input-pusd-amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="peth">PETH Amount per Claim</Label>
                <Input
                  id="peth"
                  type="text"
                  value={pethAmount}
                  onChange={(e) => setPethAmount(e.target.value)}
                  data-testid="input-peth-amount"
                />
              </div>

              <Button
                onClick={handleUpdateSettings}
                disabled={isLoading}
                className="w-full"
                data-testid="button-update-settings"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card data-testid="card-statistics">
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>
                Recent faucet activity overview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Claims</p>
                  <p className="text-2xl font-bold">{claims.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={enabled ? "default" : "destructive"}>
                    {enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Token Distribution</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">PUSD Claims</span>
                    <Badge variant="outline">
                      {claims.filter(c => c.token === "PUSD").length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">PETH Claims</span>
                    <Badge variant="outline">
                      {claims.filter(c => c.token === "PETH").length}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Claims Table */}
        <Card data-testid="card-recent-claims">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Claims</CardTitle>
                <CardDescription>
                  Last 50 token claims from the faucet
                </CardDescription>
              </div>
              <Button
                onClick={refreshClaims}
                disabled={isLoading}
                variant="outline"
                size="sm"
                data-testid="button-refresh-claims"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>TX</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No claims yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    claims.map((claim) => (
                      <TableRow key={claim.id} data-testid={`row-claim-${claim.id}`}>
                        <TableCell className="font-mono text-sm">
                          {formatAddress(claim.address)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={claim.token === "PUSD" ? "default" : "secondary"}>
                            {claim.token}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {claim.amount}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(claim.claimedAt)}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
