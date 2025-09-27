package entity

type Preschool struct {
	Id           int
	Name         string
	BuildingCode string
}

type PreschoolWithLocation struct {
	Id           int
	Name         string
	BuildingCode string
	Longitude    float64
	Latitude     float64
}

type PreschoolStat struct {
	PreschoolId     int
	AgeClass        string
	WaitingCount    string
	ChildrenCount   string
	AcceptanceCount string
}

type CsvImportHistory struct {
	Id       int
	FileName string
	Kind     string
}

type PreschoolMonthlyStat struct {
	CsvImportHistoryId int
	PreschoolId        int
	AgeClassId         int
	TargetMonth        string
	Kind               string
	Value              string
}

type AgeClass struct {
	Id   int
	Name string
}
