import { Routes, Route } from "react-router-dom";

function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-white">
        🎾 GameSetMatch
      </h1>
      <p className="mt-4 text-slate-400">
        ATP match history, stats, and performance ratings — coming soon.
      </p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
