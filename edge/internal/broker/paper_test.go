package broker

import (
	"context"
	"testing"
)

func TestPaperMarketOrderFillsAtReferencePrice(t *testing.T) {
	paper := NewPaper()
	placed, err := paper.PlaceMISMarketOrder(context.Background(), MarketOrderRequest{
		Exchange: "NSE", Symbol: "RELIANCE", TransactionType: "BUY",
		Quantity: 4, ReferencePrice: 2500.25, Tag: "test",
	})
	if err != nil {
		t.Fatal(err)
	}
	if placed.Status != "COMPLETE" || placed.FilledQuantity != 4 || placed.AveragePrice != 2500.25 {
		t.Fatalf("unexpected paper fill: %+v", placed)
	}
	fetched, err := paper.GetOrder(context.Background(), placed.OrderID)
	if err != nil || fetched.OrderID != placed.OrderID {
		t.Fatalf("paper order was not recoverable: %+v, %v", fetched, err)
	}
}
