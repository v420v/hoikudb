package dto

type PreschoolStatDTO struct {
	Id        int
	Name      string
	Longitude float64
	Latitude  float64
	Stats     []PreschoolMonthlyStatDTO
}

type PreschoolMonthlyStatDTO struct {
	AgeClass        string
	AcceptanceCount string
	ChildrenCount   string
	WaitingCount    string
}
