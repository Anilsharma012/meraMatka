import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Filter,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import BASE_URL from "../src/config";

interface GameResult {
  id: string;
  gameId: string;
  marketId: string;
  marketName: string;
  gameType: string;
  result: {
    jodi?: string;
    haruf?: string;
    crossing?: string;
  };
  winnerNumber: string;
  declaredTimeIST: string;
  declaredDateIST: string;
  declaredAtUTC: string;
  status: string;
  method: string;
  declaredBy: string;
  icon: string;
  color: string;
  totalBets: number;
  totalWinners: number;
  totalWinningAmount: number;
}

interface Market {
  id: string;
  name: string;
  icon: string;
  color: string;
  lastResult?: {
    result: string;
    date: string;
    time: string;
  };
}

interface ApiResponse {
  success: boolean;
  date: string;
  marketId: string;
  results: GameResult[];
  total: number;
  metadata: {
    fetchedAt: string;
    timezone: string;
  };
}

const ChartsEnhanced = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastFetched, setLastFetched] = useState<string>("");

  // Fetch available markets
  const fetchMarkets = useCallback(async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/charts/markets`, {
        headers: { "Content-Type": "application/json" },
        mode: "cors",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMarkets(data.markets);
        }
      }
    } catch (err) {
      console.error("Error fetching markets:", err);
    }
  }, []);

  // Fetch results for selected date and market
  const fetchResults = useCallback(
    async (date: string, marketId: string = "all") => {
      try {
        setLoading(true);
        setError("");

        console.log(`📊 Fetching results - Date: ${date}, Market: ${marketId}`);

        const url = `${BASE_URL}/api/charts/results/by-date?date=${date}&marketId=${marketId}`;
        console.log("📊 Request URL:", url);

        const response = await fetch(url, {
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} - ${response.statusText}`,
          );
        }

        const data: ApiResponse = await response.json();

        if (data.success) {
          setGameResults(data.results);
          setLastFetched(data.metadata.fetchedAt);
          console.log(
            `📊 Loaded ${data.results.length} results for ${date} (${marketId})`,
          );
        } else {
          setError("Failed to load results");
        }
      } catch (err: any) {
        console.error("Error fetching results:", err);
        setError(err.message || "Unable to connect to server");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Handle market change
  const handleMarketChange = (marketId: string) => {
    setSelectedMarket(marketId);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchResults(selectedDate, selectedMarket);
    setRefreshing(false);
  };

  // Auto-refresh effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(() => {
        console.log("🔄 Auto-refreshing results...");
        fetchResults(selectedDate, selectedMarket);
      }, 30000); // 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedDate, selectedMarket, fetchResults]);

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchResults(selectedDate, selectedMarket);
  }, [selectedDate, selectedMarket, fetchResults]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Format time for display
  const formatTime = (timeIST: string) => {
    const [hours, minutes] = timeIST.split(":");
    const hour24 = parseInt(hours);
    const isPM = hour24 >= 12;
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minutes} ${isPM ? "PM" : "AM"}`;
  };

  return (
    <div className="min-h-screen bg-matka-dark">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate("/dashboard")}
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </Button>
              <h1 className="text-foreground text-xl font-bold">Live Charts</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label
                  htmlFor="auto-refresh"
                  className="text-sm text-muted-foreground"
                >
                  Auto-refresh (30s)
                </Label>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-muted"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/50 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="pl-10 bg-input border-border text-foreground"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              {/* Market Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Market
                </Label>
                <Select
                  value={selectedMarket}
                  onValueChange={handleMarketChange}
                >
                  <SelectTrigger className="bg-input border-border text-foreground">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue placeholder="Select market" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map((market) => (
                      <SelectItem key={market.id} value={market.id}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{market.icon}</span>
                          <span>{market.name}</span>
                          {market.lastResult && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({market.lastResult.result})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Info */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Status
                </Label>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-matka-gold" />
                  <span className="text-muted-foreground">
                    {lastFetched
                      ? `Updated: ${new Date(lastFetched).toLocaleTimeString()}`
                      : "Loading..."}
                  </span>
                  {autoRefresh && (
                    <span className="text-green-500 text-xs">● Live</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-matka-gold" />
            <span className="ml-2 text-muted-foreground">
              Loading results...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mx-auto max-w-md">
              {error}
            </div>
            <Button
              onClick={handleRefresh}
              className="mt-4 mr-2"
              variant="outline"
            >
              Try Again
            </Button>
            <Button
              onClick={() => navigate("/admin/declare-results")}
              variant="outline"
              className="mt-4 border-matka-gold text-matka-gold hover:bg-matka-gold hover:text-matka-dark"
            >
              Declare Results →
            </Button>
          </div>
        )}

        {/* Results Grid */}
        {!loading && !error && (
          <>
            {gameResults.length > 0 ? (
              <div className="space-y-4 mb-8">
                <h2 className="text-foreground text-xl font-bold text-center">
                  Results for{" "}
                  {new Date(selectedDate).toLocaleDateString("en-IN")}
                  {selectedMarket !== "all" && (
                    <span className="text-matka-gold">
                      {" "}
                      • {markets.find((m) => m.id === selectedMarket)?.name}
                    </span>
                  )}
                </h2>
                {gameResults.map((result) => (
                  <Card
                    key={result.id}
                    className={`bg-gradient-to-r ${result.color} bg-opacity-10 backdrop-blur-sm border-border/50 hover:border-matka-gold/50 transition-all duration-300`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-matka-gold to-yellow-500 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">{result.icon}</span>
                          </div>
                          <div>
                            <h3 className="text-foreground text-xl font-bold">
                              {result.marketName}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              {result.gameType.charAt(0).toUpperCase() +
                                result.gameType.slice(1)}{" "}
                              • Declared at {formatTime(result.declaredTimeIST)}
                            </p>
                            <div className="flex gap-2 mt-1">
                              {result.result.jodi && (
                                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                                  Jodi: {result.result.jodi}
                                </span>
                              )}
                              {result.result.haruf && (
                                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
                                  Haruf: {result.result.haruf}
                                </span>
                              )}
                              {result.result.crossing && (
                                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
                                  Crossing: {result.result.crossing}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="bg-matka-dark px-6 py-3 rounded-xl border border-matka-gold/30">
                            <span className="text-matka-gold text-2xl font-bold">
                              {result.winnerNumber}
                            </span>
                          </div>
                          {result.totalBets > 0 && (
                            <p className="text-muted-foreground text-xs mt-2">
                              {result.totalBets} bets • {result.totalWinners}{" "}
                              winners
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-foreground text-xl font-bold mb-2">
                  No Results Found
                </h3>
                <p className="text-muted-foreground">
                  No results were declared for{" "}
                  {new Date(selectedDate).toLocaleDateString("en-IN")}
                  {selectedMarket !== "all" &&
                    ` in ${markets.find((m) => m.id === selectedMarket)?.name}`}
                </p>
                <div className="mt-4 space-x-2">
                  <Button
                    onClick={() =>
                      setSelectedDate(new Date().toISOString().split("T")[0])
                    }
                    variant="outline"
                  >
                    View Today's Results
                  </Button>
                  <Button
                    onClick={() => navigate("/admin/declare-results")}
                    variant="outline"
                    className="border-matka-gold text-matka-gold hover:bg-matka-gold hover:text-matka-dark"
                  >
                    Declare Results →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChartsEnhanced;
