import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Megaphone,
  Trophy,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import BASE_URL from "../src/config";

interface Game {
  _id: string;
  name: string;
  type: "jodi" | "haruf" | "crossing";
  currentStatus: string;
  isActive: boolean;
  declaredResult?: string;
  resultDeclaredAt?: string;
}

const AdminDeclareResults = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [resultNumber, setResultNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [declaring, setDeclaring] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const navigate = useNavigate();

  // Fetch all games
  const fetchGames = async () => {
    try {
      const token = localStorage.getItem("admin_token");

      if (!token) {
        setMessage({
          type: "error",
          text: "Admin token not found. Please login again.",
        });
        console.error("Admin token not found");
        return;
      }

      console.log(
        "🔑 Fetching games with admin token:",
        token ? "present" : "missing",
      );

      const response = await fetch(`${BASE_URL}/api/admin/games`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log(
        "📊 Games API response:",
        response.status,
        response.statusText,
      );

      if (response.ok) {
        const data = await response.json();
        setGames(data.data || []);
        console.log("✅ Loaded games:", data.data?.length || 0);
      } else {
        const errorData = await response.text();
        console.error("❌ Games API error:", response.status, errorData);
        setMessage({
          type: "error",
          text: `Failed to fetch games (${response.status})`,
        });
        setGames([]); // Ensure games is always an array
      }
    } catch (error) {
      console.error("Error fetching games:", error);
      setMessage({ type: "error", text: "Error loading games" });
      setGames([]); // Ensure games is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Declare result for selected game
  const handleDeclareResult = async () => {
    if (!selectedGame || !resultNumber.trim()) {
      setMessage({
        type: "error",
        text: "Please select a game and enter result number",
      });
      return;
    }

    const selectedGameData = Array.isArray(games)
      ? games.find((g) => g._id === selectedGame)
      : null;
    if (!selectedGameData) {
      setMessage({ type: "error", text: "Selected game not found" });
      return;
    }

    // Validate result number format
    const trimmedResult = resultNumber.trim();
    if (!/^\d{1,2}$/.test(trimmedResult)) {
      setMessage({
        type: "error",
        text: "Result must be a 1 or 2 digit number (0-99)",
      });
      return;
    }

    setDeclaring(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("admin_token");

      // Prepare the result data based on game type
      const resultData: any = {};
      if (selectedGameData.type === "jodi") {
        resultData.jodiResult = trimmedResult;
      } else if (selectedGameData.type === "haruf") {
        resultData.harufResult = trimmedResult;
      } else if (selectedGameData.type === "crossing") {
        resultData.crossingResult = trimmedResult;
      }
      resultData.declaredResult = trimmedResult;

      console.log("🎯 Declaring result:", {
        gameId: selectedGame,
        gameName: selectedGameData.name,
        gameType: selectedGameData.type,
        result: trimmedResult,
        resultData,
      });

      const response = await fetch(
        `${BASE_URL}/api/results/declare/${selectedGame}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resultData),
        },
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: "success",
          text: `✅ Result declared successfully! ${selectedGameData.name}: ${trimmedResult}`,
        });

        // Reset form
        setSelectedGame("");
        setResultNumber("");

        // Refresh games list
        await fetchGames();

        console.log("🎉 Result declared successfully:", data);
      } else {
        setMessage({
          type: "error",
          text: data.message || `Failed to declare result: ${response.status}`,
        });
      }
    } catch (error: any) {
      console.error("Error declaring result:", error);
      setMessage({
        type: "error",
        text: `Error: ${error.message || "Unable to declare result"}`,
      });
    } finally {
      setDeclaring(false);
    }
  };

  const selectedGameData = Array.isArray(games)
    ? games.find((g) => g._id === selectedGame)
    : null;

  return (
    <div className="min-h-screen bg-matka-dark">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-sm border-b border-border/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate("/admin/dashboard")}
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </Button>
              <div className="flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-matka-gold" />
                <h1 className="text-foreground text-xl font-bold">
                  Declare Results
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Instructions */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Trophy className="h-5 w-5 text-matka-gold mt-1" />
              <div>
                <h2 className="text-foreground font-semibold mb-2">
                  How to Declare Results
                </h2>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>1. Select a game from the dropdown</li>
                  <li>2. Enter the winning number (0-99)</li>
                  <li>3. Click "Declare Result"</li>
                  <li>4. Result will immediately appear in Charts page</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message */}
        {message && (
          <Card
            className={`mb-6 ${message.type === "success" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {message.type === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span
                  className={
                    message.type === "success"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {message.text}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Declare Result Form */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/50 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-foreground text-center">
              Declare Game Result
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-matka-gold mx-auto mb-2" />
                <span className="text-muted-foreground">Loading games...</span>
              </div>
            ) : (
              <>
                {/* Game Selection */}
                <div className="space-y-2">
                  <Label htmlFor="game" className="text-foreground">
                    Select Game
                  </Label>
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger className="bg-input border-border text-foreground">
                      <SelectValue placeholder="Choose a game to declare result" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(games) &&
                        games
                          .filter((game) => game.isActive)
                          .map((game) => (
                            <SelectItem key={game._id} value={game._id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{game.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({game.type}) - {game.currentStatus}
                                  {game.declaredResult &&
                                    ` | Result: ${game.declaredResult}`}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Game Info */}
                {selectedGameData && (
                  <Card className="bg-muted/30 border-border/30">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Game:</span>
                          <span className="text-foreground ml-2 font-medium">
                            {selectedGameData.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <span className="text-foreground ml-2 font-medium capitalize">
                            {selectedGameData.type}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <span className="text-foreground ml-2 font-medium">
                            {selectedGameData.currentStatus}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Current Result:
                          </span>
                          <span className="text-foreground ml-2 font-medium">
                            {selectedGameData.declaredResult || "Not declared"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Result Number Input */}
                <div className="space-y-2">
                  <Label htmlFor="result" className="text-foreground">
                    Winning Number
                  </Label>
                  <Input
                    id="result"
                    type="number"
                    min="0"
                    max="99"
                    value={resultNumber}
                    onChange={(e) => setResultNumber(e.target.value)}
                    placeholder="Enter winning number (0-99)"
                    className="bg-input border-border text-foreground text-center text-2xl font-bold"
                    disabled={declaring}
                  />
                  <p className="text-muted-foreground text-xs">
                    Enter a number between 0 and 99
                  </p>
                </div>

                {/* Declare Button */}
                <Button
                  onClick={handleDeclareResult}
                  disabled={!selectedGame || !resultNumber.trim() || declaring}
                  className="w-full bg-gradient-to-r from-matka-gold to-yellow-500 text-matka-dark font-bold hover:from-yellow-500 hover:to-matka-gold transition-all duration-300 py-3"
                >
                  {declaring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Declaring Result...
                    </>
                  ) : (
                    <>
                      <Megaphone className="h-4 w-4 mr-2" />
                      Declare Result
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Access */}
        <div className="text-center mt-6">
          <Button
            onClick={() => navigate("/charts")}
            variant="outline"
            className="border-matka-gold text-matka-gold hover:bg-matka-gold hover:text-matka-dark"
          >
            View Results in Charts →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminDeclareResults;
