import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function validateEnvironmentVariables() {
    const requiredVars = ['S3_ACCESS_KEY', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
}

let s3Client: S3Client | null = null;

function getS3Client() {
    if (!s3Client) {
        validateEnvironmentVariables();

        s3Client = new S3Client({
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY!,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
            region: process.env.S3_REGION || 'ap-northeast-1',
        });
    }
    return s3Client;
}

export async function GET(request: NextRequest) {
    try {
        const client = getS3Client();

        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: 'latest.json',
        });

        const response = await client.send(command);

        if (!response.Body) {
            return NextResponse.json(
                { error: 'データが見つかりません' },
                { status: 404 }
            );
        }

        const data = await response.Body.transformToString();
        const jsonData = JSON.parse(data);

        const responseHeaders = new Headers();
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

        return NextResponse.json(jsonData, { headers: responseHeaders });
    } catch (error) {
        console.error('S3からのデータ取得エラー:', error);

        if (error instanceof Error && error.message.includes('Missing required environment variables')) {
            return NextResponse.json(
                { error: 'サーバー設定エラー: 環境変数が設定されていません' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'データの取得に失敗しました' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
