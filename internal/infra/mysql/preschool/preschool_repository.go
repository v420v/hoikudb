package preschool

import (
	"database/sql"
	"time"

	"github.com/doug-martin/goqu/v9"
	_ "github.com/doug-martin/goqu/v9/dialect/mysql"
	"github.com/v420v/hoipla/internal/domain/preschool/entity"
	"github.com/v420v/hoipla/internal/infra/mysql"
)

type PreschoolRepository struct {
	db   *sql.DB
	goqu goqu.DialectWrapper
}

func NewPreschoolRepository() *PreschoolRepository {
	dialect := goqu.Dialect("mysql")
	return &PreschoolRepository{
		db:   mysql.Conn,
		goqu: dialect,
	}
}

func (r *PreschoolRepository) InsertPreschools(preschools []entity.Preschool) error {
	records := make([]goqu.Record, 0, len(preschools))
	for _, p := range preschools {
		record := goqu.Record{
			"name":          p.Name,
			"building_code": p.BuildingCode,
		}
		records = append(records, record)
	}

	query, args, err := r.goqu.
		Insert("preschools").
		Rows(records).
		ToSQL()

	if err != nil {
		return err
	}

	_, err = r.db.Exec(query, args...)
	if err != nil {
		return err
	}

	return nil
}

func (r *PreschoolRepository) FetchPreschools() ([]entity.Preschool, error) {
	query, args, err := r.goqu.
		Select(
			goqu.I("id").As("id"),
			goqu.I("name").As("name"),
			goqu.I("building_code").As("building_code"),
		).
		From("preschools").
		ToSQL()

	if err != nil {
		return []entity.Preschool{}, err
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return []entity.Preschool{}, err
	}
	defer rows.Close()

	preschools := []entity.Preschool{}
	for rows.Next() {
		var preschool entity.Preschool
		err := rows.Scan(&preschool.Id, &preschool.Name, &preschool.BuildingCode)
		if err != nil {
			return []entity.Preschool{}, err
		}

		preschools = append(preschools, preschool)
	}

	return preschools, nil
}

func (r *PreschoolRepository) FetchPreschoolWithLocation() ([]entity.PreschoolWithLocation, error) {
	query, args, err := r.goqu.
		Select(
			goqu.I("preschools.id").As("id"),
			goqu.I("preschools.name").As("name"),
			goqu.I("preschools.building_code").As("building_code"),
			goqu.L("ST_X(preschool_locations.location)").As("longitude"),
			goqu.L("ST_Y(preschool_locations.location)").As("latitude"),
		).
		From("preschools").
		InnerJoin(
			goqu.T("preschool_locations"),
			goqu.On(goqu.I("preschool_locations.preschool_id").Eq(goqu.I("preschools.id"))),
		).
		Order(goqu.I("preschools.id").Asc()).
		ToSQL()

	if err != nil {
		return []entity.PreschoolWithLocation{}, err
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return []entity.PreschoolWithLocation{}, err
	}
	defer rows.Close()

	preschoolLocations := []entity.PreschoolWithLocation{}
	for rows.Next() {
		var preschoolLocation entity.PreschoolWithLocation
		err := rows.Scan(
			&preschoolLocation.Id,
			&preschoolLocation.Name,
			&preschoolLocation.BuildingCode,
			&preschoolLocation.Longitude,
			&preschoolLocation.Latitude,
		)
		if err != nil {
			return []entity.PreschoolWithLocation{}, err
		}

		preschoolLocations = append(preschoolLocations, preschoolLocation)
	}

	return preschoolLocations, nil
}

func (r *PreschoolRepository) FetchLatestCsvImportHistories() ([]entity.CsvImportHistory, error) {
	subQuery := r.goqu.
		Select(
			goqu.I("kind"),
			goqu.MAX(goqu.I("created_at")).As("max_created"),
		).
		From("csv_import_histories").
		Where(goqu.I("kind").In("waiting", "children", "acceptance")).
		GroupBy("kind")

	query, args, err := r.goqu.
		Select(
			goqu.I("c.id"),
			goqu.I("c.file_name"),
			goqu.I("c.kind"),
		).
		From(goqu.T("csv_import_histories").As("c")).
		Join(
			subQuery.As("m"),
			goqu.On(
				goqu.I("c.kind").Eq(goqu.I("m.kind")),
				goqu.I("c.created_at").Eq(goqu.I("m.max_created")),
			),
		).
		Order(goqu.I("c.created_at").Desc()).
		Limit(3).
		ToSQL()

	if err != nil {
		return []entity.CsvImportHistory{}, err
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return []entity.CsvImportHistory{}, err
	}
	defer rows.Close()

	csvImportHistories := []entity.CsvImportHistory{}
	for rows.Next() {
		var csvImportHistory entity.CsvImportHistory
		err := rows.Scan(&csvImportHistory.Id, &csvImportHistory.FileName, &csvImportHistory.Kind)
		if err != nil {
			return []entity.CsvImportHistory{}, err
		}
		csvImportHistories = append(csvImportHistories, csvImportHistory)
	}

	return csvImportHistories, nil
}

func (r *PreschoolRepository) FetchPreschoolMonthlyStats(csvImportHistoryIds []int) ([]entity.PreschoolStat, error) {
	now := time.Now()
	targetMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).Format("2006-01-02")

	query, args, err := r.goqu.
		Select(
			goqu.I("p.id").As("preschool_id"),
			goqu.I("ac.name").As("age_class_name"),
			goqu.L("COALESCE(MAX(CASE WHEN ms.kind='waiting' THEN ms.value END), '-')").As("waiting"),
			goqu.L("COALESCE(MAX(CASE WHEN ms.kind='children' THEN ms.value END), '-')").As("children"),
			goqu.L("COALESCE(MAX(CASE WHEN ms.kind='acceptance' THEN ms.value END), '-')").As("acceptance"),
		).
		From(goqu.T("preschools").As("p")).
		CrossJoin(
			goqu.T("age_classes").As("ac"),
		).
		LeftJoin(
			goqu.T("preschool_monthly_stats").As("ms"),
			goqu.On(
				goqu.I("ms.preschool_id").Eq(goqu.I("p.id")),
				goqu.I("ms.age_class_id").Eq(goqu.I("ac.id")),
				goqu.I("ms.target_month").Eq(targetMonth),
			),
		).
		Join(
			goqu.T("csv_import_histories").As("cih"),
			goqu.On(
				goqu.I("cih.id").Eq(goqu.I("ms.csv_import_history_id")),
			),
		).
		Where(
			goqu.I("cih.id").In(csvImportHistoryIds),
		).
		GroupBy(
			goqu.I("p.id"),
			goqu.I("ac.id"),
			goqu.I("ac.name"),
		).
		Order(
			goqu.I("p.id").Asc(),
			goqu.I("ac.id").Asc(),
		).
		ToSQL()

	if err != nil {
		return []entity.PreschoolStat{}, err
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return []entity.PreschoolStat{}, err
	}
	defer rows.Close()

	preschools := []entity.PreschoolStat{}
	for rows.Next() {
		var preschoolStat entity.PreschoolStat
		err := rows.Scan(
			&preschoolStat.PreschoolId,
			&preschoolStat.AgeClass,
			&preschoolStat.WaitingCount,
			&preschoolStat.ChildrenCount,
			&preschoolStat.AcceptanceCount,
		)
		if err != nil {
			return []entity.PreschoolStat{}, err
		}

		preschools = append(preschools, preschoolStat)
	}

	return preschools, nil
}

func (r *PreschoolRepository) InsertPreschoolMonthlyStats(preschoolMonthlyStats []entity.PreschoolMonthlyStat) error {
	records := make([]goqu.Record, 0, len(preschoolMonthlyStats))
	for _, p := range preschoolMonthlyStats {
		record := goqu.Record{
			"csv_import_history_id": p.CsvImportHistoryId,
			"preschool_id":          p.PreschoolId,
			"age_class_id":          p.AgeClassId,
			"target_month":          p.TargetMonth,
			"kind":                  p.Kind,
			"value":                 p.Value,
		}
		records = append(records, record)
	}

	query, args, err := r.goqu.
		Insert("preschool_monthly_stats").
		Rows(records).
		ToSQL()
	if err != nil {
		return err
	}

	_, err = r.db.Exec(query, args...)
	if err != nil {
		return err
	}

	return nil
}

func (r *PreschoolRepository) FetchLatestCsvImportHistory(kind string) (entity.CsvImportHistory, error) {
	query, args, err := r.goqu.
		Select("id", "file_name", "kind").
		From("csv_import_histories").
		Where(goqu.I("kind").Eq(kind)).
		Order(goqu.I("created_at").Desc()).
		Limit(1).ToSQL()
	if err != nil {
		return entity.CsvImportHistory{}, err
	}

	row := r.db.QueryRow(query, args...)

	var csvImportHistory entity.CsvImportHistory
	err = row.Scan(
		&csvImportHistory.Id,
		&csvImportHistory.FileName,
		&csvImportHistory.Kind,
	)
	if err != nil {
		return entity.CsvImportHistory{}, err
	}

	return csvImportHistory, nil
}

func (r *PreschoolRepository) InsertCsvImportHistory(fileName string, kind string) error {
	query, args, err := r.goqu.
		Insert("csv_import_histories").
		Rows(goqu.Record{
			"file_name": fileName,
			"kind":      kind,
		}).
		ToSQL()

	if err != nil {
		return err
	}

	_, err = r.db.Exec(query, args...)
	if err != nil {
		return err
	}

	return nil
}
