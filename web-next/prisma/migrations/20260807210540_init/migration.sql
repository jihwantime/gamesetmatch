-- CreateTable
CREATE TABLE "players" (
    "id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "hand" TEXT,
    "dob" INTEGER,
    "ioc" TEXT,
    "height" INTEGER,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "tourney_id" TEXT NOT NULL,
    "tourney_name" TEXT NOT NULL,
    "surface" TEXT,
    "draw_size" INTEGER,
    "tourney_level" TEXT,
    "tourney_date" INTEGER NOT NULL,
    "match_num" INTEGER NOT NULL,
    "winner_id" INTEGER NOT NULL,
    "loser_id" INTEGER NOT NULL,
    "score" TEXT,
    "best_of" INTEGER,
    "round" TEXT,
    "minutes" INTEGER,
    "w_ace" INTEGER,
    "w_df" INTEGER,
    "w_svpt" INTEGER,
    "w_1st_in" INTEGER,
    "w_1st_won" INTEGER,
    "w_2nd_won" INTEGER,
    "w_sv_gms" INTEGER,
    "w_bp_saved" INTEGER,
    "w_bp_faced" INTEGER,
    "l_ace" INTEGER,
    "l_df" INTEGER,
    "l_svpt" INTEGER,
    "l_1st_in" INTEGER,
    "l_1st_won" INTEGER,
    "l_2nd_won" INTEGER,
    "l_sv_gms" INTEGER,
    "l_bp_saved" INTEGER,
    "l_bp_faced" INTEGER,
    "winner_rank" INTEGER,
    "winner_rank_points" INTEGER,
    "loser_rank" INTEGER,
    "loser_rank_points" INTEGER,
    "winner_rating" DOUBLE PRECISION,
    "loser_rating" DOUBLE PRECISION,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rankings" (
    "ranking_date" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "points" INTEGER,

    CONSTRAINT "rankings_pkey" PRIMARY KEY ("ranking_date","rank","player_id")
);

-- CreateTable
CREATE TABLE "live_rankings" (
    "rank" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "points" INTEGER,
    "as_of" INTEGER NOT NULL,

    CONSTRAINT "live_rankings_pkey" PRIMARY KEY ("rank")
);

-- CreateTable
CREATE TABLE "player_elo" (
    "player_id" INTEGER NOT NULL,
    "elo" DOUBLE PRECISION NOT NULL,
    "elo_hard" DOUBLE PRECISION,
    "elo_clay" DOUBLE PRECISION,
    "elo_grass" DOUBLE PRECISION,
    "elo_carpet" DOUBLE PRECISION,
    "matches" INTEGER,
    "peak_elo" DOUBLE PRECISION,

    CONSTRAINT "player_elo_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "meta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "meta_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "players_full_name_idx" ON "players"("full_name");

-- CreateIndex
CREATE INDEX "matches_winner_id_tourney_date_idx" ON "matches"("winner_id", "tourney_date");

-- CreateIndex
CREATE INDEX "matches_loser_id_tourney_date_idx" ON "matches"("loser_id", "tourney_date");

-- CreateIndex
CREATE INDEX "matches_tourney_date_idx" ON "matches"("tourney_date");

-- CreateIndex
CREATE UNIQUE INDEX "matches_tourney_id_match_num_key" ON "matches"("tourney_id", "match_num");

-- CreateIndex
CREATE INDEX "rankings_player_id_ranking_date_idx" ON "rankings"("player_id", "ranking_date");

-- CreateIndex
CREATE INDEX "rankings_ranking_date_rank_idx" ON "rankings"("ranking_date", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "live_rankings_player_id_key" ON "live_rankings"("player_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_loser_id_fkey" FOREIGN KEY ("loser_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_rankings" ADD CONSTRAINT "live_rankings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_elo" ADD CONSTRAINT "player_elo_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
