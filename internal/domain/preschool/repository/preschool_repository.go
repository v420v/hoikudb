package repository

import "github.com/v420v/hoipla/internal/domain/preschool/entity"

type PreschoolRepository interface {
	FetchPreschoolWithLocation() ([]entity.PreschoolWithLocation, error)
	FetchPreschoolMonthlyStats(csvImportHistoryIds []int) ([]entity.PreschoolStat, error)
	FetchPreschools() ([]entity.Preschool, error)
	InsertPreschools(preschools []entity.Preschool) error
	InsertCsvImportHistory(fileName string, kind string) error
	FetchLatestCsvImportHistory(kind string) (entity.CsvImportHistory, error)
	InsertPreschoolMonthlyStats(preschoolMonthlyStats []entity.PreschoolMonthlyStat) error
	FetchLatestCsvImportHistories() ([]entity.CsvImportHistory, error)
}
