package marketdata

import "math"

func computeStdDev(returns []float64, window int) *float64 {
	n := len(returns)
	if n == 0 || window <= 1 {
		return nil
	}
	start := n - window
	if start < 0 {
		start = 0
	}
	slice := returns[start:]
	k := len(slice)
	if k <= 1 {
		return nil
	}

	var sum float64
	for _, v := range slice {
		sum += v
	}
	mean := sum / float64(k)

	var sumSqDiff float64
	for _, v := range slice {
		diff := v - mean
		sumSqDiff += diff * diff
	}

	stddev := math.Sqrt(sumSqDiff / float64(k-1))
	return &stddev
}
