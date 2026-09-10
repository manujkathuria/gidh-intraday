package readapi

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeReader struct {
	dailyDate                    string
	intradayDate, intradaySymbol string
	intradayLimit                int
}

func (f *fakeReader) Ping(context.Context) error                       { return nil }
func (f *fakeReader) Universe(context.Context) ([]UniverseItem, error) { return []UniverseItem{}, nil }
func (f *fakeReader) Sessions(context.Context) ([]Session, error)      { return []Session{}, nil }
func (f *fakeReader) DailyFeatures(_ context.Context, date string) ([]DailyFeature, error) {
	f.dailyDate = date
	return []DailyFeature{}, nil
}
func (f *fakeReader) IntradayFeatures(_ context.Context, date, symbol string, limit int) ([]IntradayFeature, error) {
	f.intradayDate, f.intradaySymbol, f.intradayLimit = date, symbol, limit
	return []IntradayFeature{}, nil
}
func (f *fakeReader) DailyFocus(context.Context, string) ([]DailyFocusItem, error) {
	return []DailyFocusItem{}, nil
}

func TestDailyFeaturesRequiresValidSessionDate(t *testing.T) {
	h := NewServer(&fakeReader{})
	r := httptest.NewRecorder()
	h.ServeHTTP(r, httptest.NewRequest(http.MethodGet, "/v1/market/daily-features", nil))
	if r.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", r.Code, http.StatusBadRequest)
	}
}

func TestIntradayFeaturesPassesExplicitQuery(t *testing.T) {
	fake := &fakeReader{}
	h := NewServer(fake)
	r := httptest.NewRecorder()
	h.ServeHTTP(r, httptest.NewRequest(http.MethodGet, "/v1/market/intraday-features?session_date=2026-09-10&symbol=RELIANCE&limit=120", nil))
	if r.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", r.Code, http.StatusOK)
	}
	if fake.intradayDate != "2026-09-10" || fake.intradaySymbol != "RELIANCE" || fake.intradayLimit != 120 {
		t.Fatalf("unexpected query: %#v", fake)
	}
}

func TestIntradayFeaturesRejectsInvalidLimit(t *testing.T) {
	h := NewServer(&fakeReader{})
	r := httptest.NewRecorder()
	h.ServeHTTP(r, httptest.NewRequest(http.MethodGet, "/v1/market/intraday-features?session_date=2026-09-10&symbol=RELIANCE&limit=501", nil))
	if r.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", r.Code, http.StatusBadRequest)
	}
}
