import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Player from "./pages/Player";
import MatchDetail from "./pages/MatchDetail";
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/player/:id" element={<Player />} />
      <Route path="/match/:id" element={<MatchDetail />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
    </Routes>
  );
}
