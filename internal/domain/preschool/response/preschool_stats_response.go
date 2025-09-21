package response

import (
	"github.com/v420v/hoipla/internal/domain/preschool/dto"
)

type PreschoolStatsResponse struct {
	Type string `json:"type"`
	Crs  struct {
		Type       string `json:"type"`
		Properties struct {
			Name string `json:"name"`
		} `json:"properties"`
	} `json:"crs"`
	Features []PreschoolFeature `json:"features"`
}

type PreschoolFeature struct {
	Type       string `json:"type"`
	Properties struct {
		ID    int    `json:"id"`
		Name  string `json:"name"`
		Stats []struct {
			AgeClass        string `json:"age_class"`
			AcceptanceCount string `json:"acceptance_count"`
			ChildrenCount   string `json:"children_count"`
			WaitingCount    string `json:"waiting_count"`
		} `json:"stats"`
	} `json:"properties"`
	Geometry struct {
		Type        string    `json:"type"`
		Coordinates []float64 `json:"coordinates"`
	} `json:"geometry"`
}

func NewPreschoolStatsResponse(preschoolStats []dto.PreschoolStatDTO) PreschoolStatsResponse {
	features := make([]PreschoolFeature, len(preschoolStats))
	for i, stat := range preschoolStats {
		stats := make([]struct {
			AgeClass        string `json:"age_class"`
			AcceptanceCount string `json:"acceptance_count"`
			ChildrenCount   string `json:"children_count"`
			WaitingCount    string `json:"waiting_count"`
		}, len(stat.Stats))

		for j, monthlyStat := range stat.Stats {
			stats[j] = struct {
				AgeClass        string `json:"age_class"`
				AcceptanceCount string `json:"acceptance_count"`
				ChildrenCount   string `json:"children_count"`
				WaitingCount    string `json:"waiting_count"`
			}{
				AgeClass:        monthlyStat.AgeClass,
				AcceptanceCount: monthlyStat.AcceptanceCount,
				ChildrenCount:   monthlyStat.ChildrenCount,
				WaitingCount:    monthlyStat.WaitingCount,
			}
		}

		features[i] = PreschoolFeature{
			Type: "Feature",
			Properties: struct {
				ID    int    `json:"id"`
				Name  string `json:"name"`
				Stats []struct {
					AgeClass        string `json:"age_class"`
					AcceptanceCount string `json:"acceptance_count"`
					ChildrenCount   string `json:"children_count"`
					WaitingCount    string `json:"waiting_count"`
				} `json:"stats"`
			}{
				ID:    stat.Id,
				Name:  stat.Name,
				Stats: stats,
			},
			Geometry: struct {
				Type        string    `json:"type"`
				Coordinates []float64 `json:"coordinates"`
			}{
				Type:        "Point",
				Coordinates: []float64{stat.Longitude, stat.Latitude, 0},
			},
		}
	}

	return PreschoolStatsResponse{
		Type: "FeatureCollection",
		Crs: struct {
			Type       string `json:"type"`
			Properties struct {
				Name string `json:"name"`
			} `json:"properties"`
		}{
			Type: "name",
			Properties: struct {
				Name string `json:"name"`
			}{
				Name: "urn:ogc:def:crs:OGC:1.3:CRS84",
			},
		},
		Features: features,
	}
}
