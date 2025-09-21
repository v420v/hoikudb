package preschool

import (
	"github.com/v420v/hoipla/internal/domain/preschool/dto"
	"github.com/v420v/hoipla/internal/domain/preschool/repository"
)

type GetPreschoolStatService interface {
	GetPreschoolStats() ([]dto.PreschoolStatDTO, error)
}

type GetPreschoolStatServiceImpl struct {
	preschoolRepository repository.PreschoolRepository
}

func NewGetPreschoolStatServiceImpl(preschoolRepository repository.PreschoolRepository) GetPreschoolStatService {
	return &GetPreschoolStatServiceImpl{
		preschoolRepository: preschoolRepository,
	}
}

func (s *GetPreschoolStatServiceImpl) GetPreschoolStats() ([]dto.PreschoolStatDTO, error) {
	preschools, err := s.preschoolRepository.FetchPreschoolWithLocation()
	if err != nil {
		return nil, err
	}

	csvImportHistories, err := s.preschoolRepository.FetchLatestCsvImportHistories()
	if err != nil {
		return nil, err
	}

	csvImportHistoryIds := make([]int, len(csvImportHistories))
	for i, csvImportHistory := range csvImportHistories {
		csvImportHistoryIds[i] = csvImportHistory.Id
	}

	preschoolMonthlyStats, err := s.preschoolRepository.FetchPreschoolMonthlyStats(csvImportHistoryIds)
	if err != nil {
		return nil, err
	}

	preschoolStatMap := make(map[int]*dto.PreschoolStatDTO)

	for _, preschool := range preschools {
		preschoolStatMap[preschool.Id] = &dto.PreschoolStatDTO{
			Id:        preschool.Id,
			Name:      preschool.Name,
			Longitude: preschool.Longitude,
			Latitude:  preschool.Latitude,
			Stats:     []dto.PreschoolMonthlyStatDTO{},
		}
	}

	for _, preschoolMonthlyStat := range preschoolMonthlyStats {
		if preschoolStat, ok := preschoolStatMap[preschoolMonthlyStat.PreschoolId]; ok {
			preschoolStat.Stats = append(preschoolStat.Stats, dto.PreschoolMonthlyStatDTO{
				AgeClass:        preschoolMonthlyStat.AgeClass,
				AcceptanceCount: preschoolMonthlyStat.AcceptanceCount,
				ChildrenCount:   preschoolMonthlyStat.ChildrenCount,
				WaitingCount:    preschoolMonthlyStat.WaitingCount,
			})
		}
	}

	preschoolStats := make([]dto.PreschoolStatDTO, 0, len(preschoolStatMap))
	for _, preschoolStat := range preschoolStatMap {
		preschoolStats = append(preschoolStats, *preschoolStat)
	}

	return preschoolStats, nil
}
