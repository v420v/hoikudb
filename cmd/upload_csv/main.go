package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/v420v/hoipla/internal/domain/preschool/response"
	"github.com/v420v/hoipla/internal/infra/s3"
	"github.com/v420v/hoipla/internal/service/preschool"
)

const bucket = "hoipla-monthly"
const key = "latest.json"

func main() {
	preschoolStats, err := preschool.NewGetPreschoolStatService().GetPreschoolStats()
	if err != nil {
		log.Fatalln(err)
		return
	}

	response := response.NewPreschoolStatsResponse(preschoolStats)

	jsonContent, err := json.Marshal(response)
	if err != nil {
		log.Fatalln(err)
		return
	}

	_, err = s3.Conn.PutObject(
		context.Background(),
		bucket,
		key,
		jsonContent,
	)
	if err != nil {
		log.Fatalln(err)
		return
	}
}
