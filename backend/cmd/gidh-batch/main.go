package main

import (
	"log"
	"os"
)

func main() {
	if len(os.Args) < 3 {
		log.Fatal("usage: gidh-batch instruments sync | candles backfill | features daily | features intraday backfill | integrity eod")
	}
	switch {
	case os.Args[1] == "instruments" && os.Args[2] == "sync":
		syncInstruments(os.Args[3:])
	case os.Args[1] == "candles" && os.Args[2] == "backfill":
		backfillCandles(os.Args[3:])
	case os.Args[1] == "features" && os.Args[2] == "daily":
		buildDailyFeatures(os.Args[3:])
	case os.Args[1] == "features" && os.Args[2] == "intraday" && len(os.Args) >= 4 && os.Args[3] == "backfill":
		backfillIntradayFeatures(os.Args[4:])
	case os.Args[1] == "integrity" && os.Args[2] == "eod":
		runEODIntegrity(os.Args[3:])
	default:
		log.Fatal("usage: gidh-batch instruments sync | candles backfill | features daily | features intraday backfill | integrity eod")
	}
}
