package ordermanager

import "testing"

func TestFixedLevels(t *testing.T) {
	tests := []struct {
		name       string
		side       TradeSide
		fill       float64
		wantStop   float64
		wantTarget float64
	}{
		{name: "long", side: SideLong, fill: 100, wantStop: 99, wantTarget: 102},
		{name: "short", side: SideShort, fill: 100, wantStop: 101, wantTarget: 98},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			stop, target := fixedLevels(test.side, test.fill)
			if stop != test.wantStop || target != test.wantTarget {
				t.Fatalf("fixedLevels(%s, %.2f) = %.2f/%.2f, want %.2f/%.2f", test.side, test.fill, stop, target, test.wantStop, test.wantTarget)
			}
		})
	}
}

func TestPositionPnLRespectsSide(t *testing.T) {
	long := &ActivePosition{Side: SideLong, Quantity: 10, EntryPrice: 100}
	long.updatePnL(102)
	if long.PnLINR != 20 || long.PnLPct != 2 {
		t.Fatalf("long PnL = %.2f/%.2f%%", long.PnLINR, long.PnLPct)
	}
	short := &ActivePosition{Side: SideShort, Quantity: 10, EntryPrice: 100}
	short.updatePnL(98)
	if short.PnLINR != 20 || short.PnLPct != 2 {
		t.Fatalf("short PnL = %.2f/%.2f%%", short.PnLINR, short.PnLPct)
	}
}
