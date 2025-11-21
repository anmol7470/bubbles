package utils

import "strings"

// EscapeLikePattern escapes special LIKE/ILIKE pattern characters to prevent pattern injection.
// It escapes: % _ \
func EscapeLikePattern(s string) string {
	replacer := strings.NewReplacer(
		`\`, `\\`,
		`%`, `\%`,
		`_`, `\_`,
	)
	return replacer.Replace(s)
}
