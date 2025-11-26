package routes

import "database/sql"

func nullableString(value sql.NullString) *string {
	if value.Valid {
		v := value.String
		return &v
	}
	return nil
}
