package preschool

import (
	"github.com/v420v/hoipla/internal/infra/mysql/preschool"
)

func NewGetPreschoolStatService() GetPreschoolStatService {
	/*
		// TODO: モックを使用する場合はここでサービスを切り替える
		useMock := os.Getenv("USE_MOCK")
		if useMock {
			return NewGetPreschoolServiceMock()
		} else {
			return NewGetPreschoolServiceImpl()
		}
	*/

	preschoolRepository := preschool.NewPreschoolRepository()
	return NewGetPreschoolStatServiceImpl(preschoolRepository)
}
