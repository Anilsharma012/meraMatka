import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import BASE_URL from "../src/config";
import { safeParseResponse } from "@/lib/responseUtils";

interface GameResult {
  id: string;
  name: string;
  type: string;
  winnerNumber: string;
  resultTime: string;
  icon: string;
  color: string;
}

interface HistoricalResult {
  date: string;
  displayDate: string;
  results: Array<{
    gameName: string;
    result: string;
    time: string;
  }>;
}

interface ApiResponse {
  success: boolean;
  date: string;
  results: GameResult[];
  total: number;
}

interface HistoryResponse {
  success: boolean;
  history: HistoricalResult[];
  totalDays: number;
}

const Charts = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [historicalResults, setHistoricalResults] = useState<
    HistoricalResult[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<AbortController | null>(
    null,
  );

  // Fetch results for selected date
  const fetchResults = async (date: string) => {
    try {
      // Cancel any ongoing request
      if (currentRequest) {
        currentRequest.abort();
      }

      const abortController = new AbortController();
      setCurrentRequest(abortController);

      setLoading(true);
      setError("");

      console.log(`📊 Fetching results for date: ${date}`);
      console.log("📊 Using BASE_URL:", BASE_URL || "(same-origin)");

      const url = `${BASE_URL}/api/charts/results?date=${date}`;
      console.log("📊 Request URL:", url);

      const response = await fetch(url, {
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "include",
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Use safe response parsing to avoid body consumption issues
      const data = await safeParseResponse(response);

      if (data.error) {
        setError(data.message || "Failed to load results");
        return;
      }

      if (data.success) {
        setGameResults(data.results);
        console.log(`📊 Loaded ${data.results.length} results for ${date}`);
      } else {
        setError(data.message || "Failed to load results");
      }
    } catch (err: any) {
      // Don't show error if request was aborted
      if (err.name === "AbortError") {
        console.log("Request was aborted");
        return;
      }

      console.error("Error fetching results:", err);
      setError(err.message || "Unable to connect to server");
    } finally {
      setLoading(false);
      setCurrentRequest(null);
    }
  };

  // Fetch historical results
  const fetchHistory = async () => {
    try {
      console.log("📊 Fetching historical results...");
      console.log("📊 Using BASE_URL:", BASE_URL || "(same-origin)");

      const url = `${BASE_URL}/api/charts/history?days=7`;
      console.log("📊 Request URL:", url);

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "include",
      });

      console.log("📊 Response status:", response.status);
      console.log("📊 Response ok:", response.ok);

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`,
        );
      }

      // Use safe response parsing to avoid body consumption issues
      const data = await safeParseResponse(response);

      if (data.error) {
        console.error("Failed to load history:", data.message);
        return;
      }

      if (data.success) {
        setHistoricalResults(data.history);
        console.log(`📊 Loaded history for ${data.totalDays} days`);
      } else {
        console.warn("📊 API returned success: false");
      }
    } catch (err: any) {
      console.error("Error fetching history:", err);
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
      // Don't set error state for history as it's not critical
      // Set empty array as fallback
      setHistoricalResults([]);
    }
  };

  // Load data on component mount and date change
  useEffect(() => {
    fetchResults(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    // Test basic API connectivity first
    const testAPI = async () => {
      try {
        console.log("🔧 Testing API connectivity...");
        const testResponse = await fetch(`${BASE_URL}/api/ping`, {
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          credentials: "include",
        });
        console.log(
          "🔧 API ping test:",
          testResponse.ok ? "SUCCESS" : "FAILED",
        );
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log("🔧 API ping response:", testData);
        }
      } catch (err) {
        console.error("🔧 API ping failed:", err);
      }
    };

    testAPI();
    fetchHistory();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentRequest) {
        currentRequest.abort();
      }
    };
  }, [currentRequest]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchResults(selectedDate), fetchHistory()]);
    setRefreshing(false);
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
              <h1 className="text-foreground text-xl font-bold">Charts</h1>
            </div>
            <div className="flex items-center gap-2">
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
        {/* Date Selection */}
        <div className="mb-6">
          <div className="text-center mb-4">
            <p className="text-muted-foreground text-lg">
              Select Date to see the winners
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="pl-10 bg-card border-border text-foreground w-48"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

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
            <div className="mt-4 space-y-2">
              <Button
                onClick={() => fetchResults(selectedDate)}
                variant="outline"
                className="mr-2"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate("/admin/declare-results")}
                variant="outline"
                className="border-matka-gold text-matka-gold hover:bg-matka-gold hover:text-matka-dark"
              >
                Declare Results Instead →
              </Button>
            </div>
            <p className="text-muted-foreground text-sm mt-4">
              If API is not working, use the admin panel to declare results
              directly
            </p>
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
                </h2>
                {gameResults.map((game) => (
                  <Card
                    key={game.id}
                    className="bg-card/90 backdrop-blur-sm border-border/50 hover:border-matka-gold/50 transition-all duration-300"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-matka-gold to-yellow-500 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">{game.icon}</span>
                          </div>
                          <div>
                            <h3 className="text-foreground text-xl font-bold">
                              {game.name}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              Winner Number • {game.type}
                            </p>
                            {game.resultTime && (
                              <p className="text-muted-foreground text-xs">
                                Declared at:{" "}
                                {new Date(game.resultTime).toLocaleTimeString(
                                  "en-IN",
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="bg-matka-dark px-6 py-3 rounded-xl border border-matka-gold/30">
                          <span className="text-matka-gold text-2xl font-bold">
                            {game.winnerNumber}
                          </span>
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
                  No game results were declared on{" "}
                  {new Date(selectedDate).toLocaleDateString("en-IN")}
                </p>
                <Button
                  onClick={() =>
                    setSelectedDate(new Date().toISOString().split("T")[0])
                  }
                  className="mt-4"
                  variant="outline"
                >
                  View Today's Results
                </Button>
              </div>
            )}
          </>
        )}

        {/* Historical Results */}
        {historicalResults.length > 0 && (
          <div className="mt-8">
            <h2 className="text-foreground text-xl font-bold mb-4">
              Previous Results
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {historicalResults.map((dayResult, index) => (
                <Card
                  key={index}
                  className="bg-card/50 backdrop-blur-sm border-border/30 hover:border-border/50 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedDate(dayResult.date)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">
                        {dayResult.displayDate}
                      </span>
                      <div className="flex gap-3 flex-wrap">
                        {dayResult.results.slice(0, 3).map((result, idx) => (
                          <span key={idx} className="text-foreground text-sm">
                            {result.gameName}:{" "}
                            <span className="text-matka-gold font-bold">
                              {result.result}
                            </span>
                          </span>
                        ))}
                        {dayResult.results.length > 3 && (
                          <span className="text-muted-foreground text-sm">
                            +{dayResult.results.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Charts;
