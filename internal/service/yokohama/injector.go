package yokohama

import (
	"github.com/v420v/hoipla/internal/infra/mysql/preschool"
)

func NewImportCsvService() ImportCsvService {
	preschoolRepository := preschool.NewPreschoolRepository()

	return NewImportCsvServiceImpl(
		preschoolRepository,
	)
}
