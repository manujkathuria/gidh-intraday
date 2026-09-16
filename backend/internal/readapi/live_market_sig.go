package readapi

import (
	"reflect"
	"strconv"
)

func latestCandleSignature(candles any) string {
	value := reflect.ValueOf(candles)
	if value.Kind() != reflect.Slice || value.Len() == 0 {
		return ""
	}
	last := value.Index(value.Len() - 1)
	if last.Kind() == reflect.Pointer {
		last = last.Elem()
	}
	if last.Kind() != reflect.Struct {
		return ""
	}
	return candleField(last, "Time") + "|" +
		candleField(last, "Open") + "|" +
		candleField(last, "High") + "|" +
		candleField(last, "Low") + "|" +
		candleField(last, "Close") + "|" +
		candleField(last, "Volume") + "|" +
		candleField(last, "VWAP")
}

func candleField(value reflect.Value, name string) string {
	field := value.FieldByName(name)
	if !field.IsValid() {
		return ""
	}
	switch field.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return strconv.FormatInt(field.Int(), 10)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return strconv.FormatUint(field.Uint(), 10)
	case reflect.Float32, reflect.Float64:
		return strconv.FormatFloat(field.Float(), 'f', 4, 64)
	default:
		return ""
	}
}
