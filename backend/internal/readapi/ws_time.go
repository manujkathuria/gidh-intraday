package readapi

import "fmt"

func parseTimeToMinutes(t string) int {
	var h, min, sec int
	_, _ = fmt.Sscanf(t, "%d:%d:%d", &h, &min, &sec)
	if h == 0 && min == 0 {
		_, _ = fmt.Sscanf(t, "%d:%d", &h, &min)
	}
	total := h*60 + min
	if total < 554 {
		total = 554
	}
	if total > 930 {
		total = 930
	}
	return total
}

func formatMinutesToString(mins int) string {
	h := mins / 60
	m := mins % 60
	return fmt.Sprintf("%02d:%02d:00", h, m)
}
