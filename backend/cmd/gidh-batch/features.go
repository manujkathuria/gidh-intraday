package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"gidh-intraday/backend/internal/config"
	"gidh-intraday/backend/internal/features/daily"
	"gidh-intraday/backend/internal/store"
)

func buildDailyFeatures(args []string) {
	flags := flag.NewFlagSet("features daily", flag.ExitOnError)
	sessionDate := flags.String("session-date", "", "one trading session date (YYYY-MM-DD)")
	from := flags.String("from", "", "first session date for a historical range (YYYY-MM-DD)")
	to := flags.String("to", "", "last session date for a historical range (YYYY-MM-DD)")
	version := flags.String("version", "daily-v1", "immutable feature definition version")
	_ = flags.Parse(args)

	if *sessionDate == "" && *from == "" && *to == "" {
		*sessionDate = indiaToday()
	}
	if (*from == "") != (*to == "") || (*sessionDate != "" && *from != "") {
		log.Fatal("use either --session-date or both --from and --to")
	}

	ctx, db, repo := openFeatureRepo()
	defer db.Close()
	if *sessionDate != "" {
		validateDate(*sessionDate)
		if err := daily.Publish(ctx, repo, *sessionDate, *version); err != nil {
			log.Fatal(err)
		}
		return
	}

	validateDate(*from)
	validateDate(*to)
	dates, err := repo.SessionDates(ctx, *from, *to)
	if err != nil {
		log.Fatal(err)
	}
	if len(dates) == 0 {
		log.Fatal("no raw daily sessions found in the requested range")
	}
	for _, date := range dates {
		if err := daily.Publish(ctx, repo, date, *version); err != nil {
			log.Fatal(err)
		}
	}
}

func backfillIntradayFeatures(args []string) {
	flags := flag.NewFlagSet("features intraday backfill", flag.ExitOnError)
	from := flags.String("from", "", "first session date to replay (YYYY-MM-DD)")
	to := flags.String("to", "", "last session date to replay (YYYY-MM-DD)")
	version := flags.String("version", "daily-v1", "daily baseline version to use")
	_ = flags.Parse(args)
	if *from == "" || *to == "" {
		log.Fatal("--from and --to are required for intraday feature backfill")
	}
	validateDate(*from)
	validateDate(*to)

	ctx, db, repo := openFeatureRepo()
	defer db.Close()

	// A minute feature is meaningful only with the daily baseline available at
	// that session's open. Publish any missing baselines before replaying bars.
	dates, err := repo.SessionDates(ctx, *from, *to)
	if err != nil {
		log.Fatal(err)
	}
	if len(dates) == 0 {
		log.Fatal("no raw daily sessions found in the requested range")
	}
	for _, date := range dates {
		if err := daily.Publish(ctx, repo, date, *version); err != nil {
			log.Fatal(err)
		}
	}

	const sessionsPerBatch = 5
	var totalRows int64
	for start := 0; start < len(dates); start += sessionsPerBatch {
		end := start + sessionsPerBatch
		if end > len(dates) {
			end = len(dates)
		}
		rows, err := repo.BuildIntraday(ctx, dates[start], dates[end-1])
		if err != nil {
			log.Fatal(err)
		}
		totalRows += rows
		fmt.Printf("replayed intraday features: sessions=%s..%s rows=%d (%d/%d)\n", dates[start], dates[end-1], rows, end, len(dates))
	}
	fmt.Printf("published intraday feature replay: from=%s to=%s version=%s rows=%d\n", *from, *to, *version, totalRows)
}

func openFeatureRepo() (context.Context, *store.DB, *store.DailyFeatureRepo) {
	ctx := context.Background()
	dbURL, err := config.LoadDatabaseURL()
	if err != nil {
		log.Fatal(err)
	}
	db, err := store.NewDB(ctx, dbURL)
	if err != nil {
		log.Fatal(err)
	}
	return ctx, db, store.NewDailyFeatureRepo(db)
}

func validateDate(value string) {
	if _, err := time.Parse(time.DateOnly, value); err != nil {
		log.Fatalf("date must use YYYY-MM-DD: %v", err)
	}
}

func indiaToday() string {
	location, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		return time.Now().Format(time.DateOnly)
	}
	return time.Now().In(location).Format(time.DateOnly)
}
