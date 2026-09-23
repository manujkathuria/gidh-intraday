package ordermanager

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestTripwireFuse(t *testing.T) {
	mgr := &Manager{}
	ctx := context.Background()

	// 1. First 5 orders within 3s should succeed
	for i := 0; i < 5; i++ {
		if err := mgr.checkAndTripwire(ctx); err != nil {
			t.Fatalf("order %d should have passed tripwire check, got err: %v", i+1, err)
		}
	}

	// 2. The 6th order within 3s must trip the fuse
	err := mgr.checkAndTripwire(ctx)
	if err == nil {
		t.Fatal("6th order within 3s should have failed tripwire check, but passed")
	}
	if !strings.Contains(err.Error(), "TRIPWIRE FUSE TRIPPED") {
		t.Fatalf("expected TRIPWIRE error, got: %v", err)
	}

	// 3. Reset tripwire
	mgr.tripMu.Lock()
	mgr.orderTimes = nil
	mgr.tripMu.Unlock()

	// 4. Now orders should pass again
	if err := mgr.checkAndTripwire(ctx); err != nil {
		t.Fatalf("order after reset should have passed, got: %v", err)
	}
}

func TestTripwireSlidingWindowPruning(t *testing.T) {
	mgr := &Manager{}
	ctx := context.Background()

	// Insert 4 orders from 4 seconds ago
	past := time.Now().Add(-4 * time.Second)
	mgr.tripMu.Lock()
	mgr.orderTimes = []time.Time{past, past, past, past}
	mgr.tripMu.Unlock()

	// 5 new orders now should succeed because past orders expired
	for i := 0; i < 5; i++ {
		if err := mgr.checkAndTripwire(ctx); err != nil {
			t.Fatalf("order %d should have passed after window expiration, got err: %v", i+1, err)
		}
	}

	// 6th order now must trip the fuse
	if err := mgr.checkAndTripwire(ctx); err == nil {
		t.Fatal("6th order should have tripped fuse")
	}
}
