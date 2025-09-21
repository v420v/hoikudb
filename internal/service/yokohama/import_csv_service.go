package yokohama

import (
	"context"
	"encoding/csv"
	"io"
	"os"
	"strings"

	"github.com/v420v/hoipla/internal/domain/preschool/entity"
	"github.com/v420v/hoipla/internal/domain/preschool/repository"
	"github.com/v420v/hoipla/internal/infra/mysql"
	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/transform"
)

/*

インポートするCSVファイルのフォーマットについて

文字コード：SHIFT-JIS
改行コード：CRLF

CSVヘッダサンプル構成例
+------------------------------------------------------------------------------------------------------------
|【令和７年９月１日時点】                                                                                        |
+----------+-------------+------------+--------+-------+-------+-------+-------+-------+-------+-----+------+
| 施設所在区 | 標準地域コード | 施設・事業名 | 施設番号 | ０歳児 | １歳児 | ２歳児 | ３歳児 | ４歳児 | ５歳児 | 合計 | 更新日 |
+----------+-------------+------------+--------+-------+-------+-------+-------+-------+-------+-----+------+

CSVデータサンプル例
- 施設所在区（例: "西区"）
- 標準地域コード（例: "14103"）
- 施設・事業名（例: "横浜保育園"）
- 施設番号（例: "12345"）
- ０歳児の人数または定員（例: "10"）
- １歳児の人数または定員（例: "12"）
- ２歳児の人数または定員（例: "15"）
- ３歳児の人数または定員（例: "18"）
- ４歳児の人数または定員（例: "20"）
- ５歳児の人数または定員（例: "20"）
- 合計人数または定員（例: "95"）
- 更新日（例: "2024/06/01"）

その他注意事項
- 以下の６カラムは値が未定義の場合、"-" 文字列で格納されています。
  - ０歳児、１歳児、２歳児、３歳児、４歳児、５歳児

- 受入可能数、入所児童数、待機児童数のCSVファイルそれぞれ同じフォーマットです。（2025年9月時点）

横浜市のオープンデータ
https://www.city.yokohama.lg.jp/kosodate-kyoiku/hoiku-yoji/shisetsu/riyou/info/nyusho-jokyo.html

*/

type ImportCsvService interface {
	ImportCsv(fileName string, kind string) error
}

type ImportCsvServiceImpl struct {
	preschoolRepository repository.PreschoolRepository
}

func NewImportCsvServiceImpl(
	preschoolRepository repository.PreschoolRepository,
) ImportCsvService {
	return &ImportCsvServiceImpl{
		preschoolRepository: preschoolRepository,
	}
}

var ageClassMap = map[string]int{
	"0歳児": 1,
	"1歳児": 2,
	"2歳児": 3,
	"3歳児": 4,
	"4歳児": 5,
	"5歳児": 6,
}

func (s *ImportCsvServiceImpl) ImportCsv(fileName string, kind string) error {
	err := mysql.Transaction(context.Background(), func(ctx context.Context) error {
		err := s.preschoolRepository.InsertCsvImportHistory(fileName, kind)
		if err != nil {
			return err
		}

		csvImportHistory, err := s.preschoolRepository.FetchLatestCsvImportHistory(kind)
		if err != nil {
			return err
		}

		preFetchPreschools, err := s.preschoolRepository.FetchPreschools()
		if err != nil {
			return err
		}

		preschoolMap := make(map[string]entity.Preschool)
		for _, preschool := range preFetchPreschools {
			preschoolMap[preschool.BuildingCode] = preschool
		}

		f, err := os.Open(fileName)
		if err != nil {
			return err
		}
		defer f.Close()

		reader := csv.NewReader(transform.NewReader(f, japanese.ShiftJIS.NewDecoder()))

		insertNeededPreschools := make([]entity.Preschool, 0)
		insertNeededPreschoolMonthlyStats := make(map[string][]*entity.PreschoolMonthlyStat, 0)
		lineNumber := 1
		for {
			records, err := reader.Read()
			if err == io.EOF {
				break
			}
			if err != nil {
				return err
			}
			if strings.TrimSpace(records[0]) == "" || strings.TrimSpace(records[1]) == "" || strings.TrimSpace(records[2]) == "" || strings.TrimSpace(records[3]) == "" {
				lineNumber++
				continue
			}
			if lineNumber <= 2 {
				lineNumber++
				continue
			}

			preschoolName := records[2]
			preschoolBuildingCode := records[3]

			if _, ok := preschoolMap[preschoolBuildingCode]; !ok {
				insertNeededPreschools = append(insertNeededPreschools, entity.Preschool{
					Name:         preschoolName,
					BuildingCode: preschoolBuildingCode,
				})
			}

			insertNeededPreschoolMonthlyStats[preschoolBuildingCode] = make([]*entity.PreschoolMonthlyStat, 0)

			for _, ageClassId := range ageClassMap {
				value := records[4+ageClassId]
				if value == "-" || value == "" {
					continue
				}
				preschoolMonthlyStat := &entity.PreschoolMonthlyStat{
					CsvImportHistoryId: csvImportHistory.Id,
					AgeClassId:         ageClassId,
					TargetMonth:        "2025-09-01",
					Kind:               kind,
					Value:              value,
				}
				insertNeededPreschoolMonthlyStats[preschoolBuildingCode] = append(insertNeededPreschoolMonthlyStats[preschoolBuildingCode], preschoolMonthlyStat)
			}
		}

		if len(insertNeededPreschools) > 0 {
			err = s.preschoolRepository.InsertPreschools(insertNeededPreschools)
			if err != nil {
				return err
			}
		}

		preschools, err := s.preschoolRepository.FetchPreschools()
		if err != nil {
			return err
		}

		for _, preschool := range preschools {
			preschoolMonthlyStats := insertNeededPreschoolMonthlyStats[preschool.BuildingCode]
			for _, preschoolMonthlyStat := range preschoolMonthlyStats {
				preschoolMonthlyStat.PreschoolId = preschool.Id
			}
		}

		result := []entity.PreschoolMonthlyStat{}
		for _, preschoolMonthlyStats := range insertNeededPreschoolMonthlyStats {
			for _, preschoolMonthlyStat := range preschoolMonthlyStats {
				result = append(result, *preschoolMonthlyStat)
			}
		}

		if len(result) > 0 {
			err = s.preschoolRepository.InsertPreschoolMonthlyStats(result)
			if err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return err
	}

	return nil
}
