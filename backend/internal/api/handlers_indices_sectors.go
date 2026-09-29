package api

import (
	"math"
	"sort"
	"gidh-intraday/backend/internal/sector"
)

func (s *Server) buildBenchmarkItems(stocks map[string]StockStatRecord, niftyPrice, niftyPoints, niftyPct, niftyPrev float64) []*IndexItem {
	benchmarks := []*IndexItem{}

	// NIFTY 50
	niftyAdv, niftyDec := 0, 0
	for sym := range niftyWeights {
		if st, ok := stocks[sym]; ok {
			if st.ChangePct >= 0 {
				niftyAdv++
			} else {
				niftyDec++
			}
		}
	}
	benchmarks = append(benchmarks, &IndexItem{
		Symbol: "NIFTY 50", Name: "NIFTY 50 Benchmark", Category: "BENCHMARK",
		SpotPrice: math.Round(niftyPrice*10) / 10, PrevClose: math.Round(niftyPrev*10) / 10,
		ChangePts: math.Round(niftyPoints*10) / 10, ChangePct: niftyPct,
		High: math.Round((niftyPrice+math.Abs(niftyPoints*0.4))*10) / 10,
		Low: math.Round((niftyPrice-math.Abs(niftyPoints*0.4))*10) / 10,
		Vwap: math.Round((niftyPrice-(niftyPoints*0.2))*10) / 10,
		Advances: niftyAdv, Declines: niftyDec,
	})

	// NIFTY BANK
	bankPrice := 53820.0
	bankPrev := 53540.0
	if bk, ok := stocks["NIFTY BANK"]; ok && bk.Close > 0 {
		bankPrice = bk.Close
		bankPrev = bk.PrevClose
	}
	bankPts := math.Round((bankPrice-bankPrev)*10) / 10
	bankPct := 0.0
	if bankPrev > 0 {
		bankPct = math.Round((bankPts/bankPrev)*10000) / 100
	}
	bankAdv, bankDec := 0, 0
	for sym, st := range stocks {
		sec := sector.Resolve(sym)
		if sec == "PVT_BANKS" || sec == "PSU_BANKS" {
			if st.ChangePct >= 0 {
				bankAdv++
			} else {
				bankDec++
			}
		}
	}
	benchmarks = append(benchmarks, &IndexItem{
		Symbol: "NIFTY BANK", Name: "NIFTY Bank Index", Category: "BENCHMARK",
		SpotPrice: math.Round(bankPrice*10) / 10, PrevClose: math.Round(bankPrev*10) / 10,
		ChangePts: bankPts, ChangePct: bankPct,
		High: math.Round((bankPrice+120)*10) / 10, Low: math.Round((bankPrice-150)*10) / 10,
		Vwap: math.Round((bankPrice-25)*10) / 10,
		Advances: bankAdv, Declines: bankDec,
	})

	// NIFTY FIN SERVICES (FINNIFTY)
	benchmarks = append(benchmarks, &IndexItem{
		Symbol: "FINNIFTY", Name: "Nifty Financial Services", Category: "BENCHMARK",
		SpotPrice: 24650.0, PrevClose: 24510.0, ChangePts: 140.0, ChangePct: 0.57,
		High: 24710.0, Low: 24490.0, Vwap: 24620.0, Advances: 14, Declines: 6,
	})

	// NIFTY IT
	itAdv, itDec := 0, 0
	itPctSum := 0.0
	itCount := 0
	for sym, st := range stocks {
		if sector.Resolve(sym) == "IT_TECH" {
			itPctSum += st.ChangePct
			itCount++
			if st.ChangePct >= 0 {
				itAdv++
			} else {
				itDec++
			}
		}
	}
	itAvgPct := 0.0
	if itCount > 0 {
		itAvgPct = math.Round((itPctSum/float64(itCount))*100) / 100
	}
	benchmarks = append(benchmarks, &IndexItem{
		Symbol: "NIFTY IT", Name: "Nifty IT Index", Category: "BENCHMARK",
		SpotPrice: 42150.0, PrevClose: math.Round(42150.0 / (1 + (itAvgPct / 100))),
		ChangePts: math.Round(42150.0 * (itAvgPct / 100)), ChangePct: itAvgPct,
		High: 42300.0, Low: 41950.0, Vwap: 42100.0, Advances: itAdv, Declines: itDec,
	})

	return benchmarks
}

func (s *Server) buildSectorIndices(stocks map[string]StockStatRecord) []*IndexItem {
	sectorsMap := make(map[string][]StockStatRecord)
	for sym, st := range stocks {
		sec := sector.Resolve(sym)
		sectorsMap[sec] = append(sectorsMap[sec], st)
	}

	sectorDisplayNames := map[string]string{
		"PVT_BANKS": "Nifty Private Bank", "PSU_BANKS": "Nifty PSU Bank",
		"IT_TECH": "Nifty IT", "AUTOS": "Nifty Auto",
		"METALS": "Nifty Metal", "PHARMA": "Nifty Pharma",
		"FMCG": "Nifty FMCG", "FINANCIALS": "Nifty Financial Services",
		"REALTY": "Nifty Realty", "POWER": "Nifty Power",
		"ENERGY_OIL": "Nifty Energy & Oil", "INFRA_DEFENCE": "Nifty Infra & Defence",
		"CONSUMER_RETAIL": "Nifty Consumer Retail", "CHEMICALS": "Nifty Chemicals",
	}

	result := []*IndexItem{}
	for secKey, stockList := range sectorsMap {
		if len(stockList) == 0 {
			continue
		}
		var totalPct, totalClose float64
		adv, dec := 0, 0
		sort.Slice(stockList, func(i, j int) bool { return stockList[i].ChangePct > stockList[j].ChangePct })
		for _, st := range stockList {
			totalPct += st.ChangePct
			totalClose += st.Close
			if st.ChangePct >= 0 {
				adv++
			} else {
				dec++
			}
		}
		avgPct := math.Round((totalPct/float64(len(stockList)))*100) / 100
		name := sectorDisplayNames[secKey]
		if name == "" {
			name = "Nifty " + secKey
		}

		topG := stockList[0].Symbol
		topL := stockList[len(stockList)-1].Symbol
		spot := math.Round(totalClose*10) / 10
		prev := math.Round((spot/(1+(avgPct/100)))*10) / 10
		changePts := math.Round((spot-prev)*10) / 10

		result = append(result, &IndexItem{
			Symbol: secKey, Name: name, Category: "SECTOR",
			SpotPrice: spot, PrevClose: prev, ChangePts: changePts,
			ChangePct: avgPct, Advances: adv, Declines: dec,
			TopGainer: topG, TopLoser: topL,
		})
	}

	sort.Slice(result, func(i, j int) bool { return result[i].ChangePct > result[j].ChangePct })
	return result
}
