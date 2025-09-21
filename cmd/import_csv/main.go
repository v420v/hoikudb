package main

import (
	"log"

	"github.com/v420v/hoipla/internal/service/yokohama"
)

type CsvFile struct {
	FileName string
	Kind     string
}

func main() {
	// TODO: S3からファイルを取得する
	files := []CsvFile{
		{
			FileName: "0860_20250901.csv",
			Kind:     "waiting",
		},
		{
			FileName: "0857_20250901.csv",
			Kind:     "acceptance",
		},
		{
			FileName: "0854_20250901.csv",
			Kind:     "children",
		},
	}

	service := yokohama.NewImportCsvService()

	for _, file := range files {
		err := service.ImportCsv(file.FileName, file.Kind)
		if err != nil {
			log.Fatalln(err)
		}
	}
}
