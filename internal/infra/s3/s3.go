package s3

import (
	"bytes"
	"context"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Client struct {
	client *s3.Client
}

var Conn *S3Client = newS3Client()

func newS3Client() *S3Client {
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_ACCESS_SECRET_KEY")

	s3Client := s3.New(s3.Options{
		Credentials: aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
			return aws.Credentials{
				AccessKeyID:     accessKey,
				SecretAccessKey: secretKey,
			}, nil
		}),
		Region: "ap-northeast-1",
	})

	return &S3Client{
		client: s3Client,
	}
}

func (c *S3Client) PutObject(ctx context.Context, bucket string, key string, jsonResponse []byte) (*s3.PutObjectOutput, error) {
	output, err := c.client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
		Body:   bytes.NewReader(jsonResponse),
	})
	if err != nil {
		return nil, err
	}

	return output, nil
}
