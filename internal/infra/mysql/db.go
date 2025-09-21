package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

type transactionKeyType string

const transactionKey transactionKeyType = "transaction"

var Conn *sql.DB = newConn()

func newConn() *sql.DB {
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s",
		os.Getenv("MYSQL_USER"),
		os.Getenv("MYSQL_PASSWORD"),
		os.Getenv("MYSQL_HOST"),
		os.Getenv("MYSQL_PORT"),
		os.Getenv("MYSQL_DATABASE"),
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to MySQL: %v", err)
	}

	return db
}

func Transaction(ctx context.Context, fn func(ctx context.Context) error) error {
	if _, ok := ctx.Value(transactionKey).(*sql.Tx); ok {
		return fn(ctx)
	}

	tx, err := Conn.BeginTx(ctx, nil)
	ctx = context.WithValue(ctx, transactionKey, tx)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err := fn(ctx); err != nil {
		tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		tx.Rollback()
		return err
	}

	return nil
}
