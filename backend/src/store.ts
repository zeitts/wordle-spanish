import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { AWS_REGION, TABLE_NAME } from "./config.js";

export interface PuzzleRecord {
  date: string; // YYYY-MM-DD (partition key)
  word: string;
  wordIndex: number;
  dayNumber: number;
  createdAt: string; // ISO
}

export interface PuzzleStore {
  get(date: string): Promise<PuzzleRecord | null>;
  // Insert if the date is not present; always resolves to the authoritative
  // stored record (the existing one if another writer won the race).
  putIfAbsent(record: PuzzleRecord): Promise<PuzzleRecord>;
  listDates(): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// DynamoDB implementation (used in Lambda)
// ---------------------------------------------------------------------------

export class DynamoPuzzleStore implements PuzzleStore {
  private doc: DynamoDBDocumentClient;

  constructor(private table: string = TABLE_NAME) {
    this.doc = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: AWS_REGION }),
      { marshallOptions: { removeUndefinedValues: true } },
    );
  }

  async get(date: string): Promise<PuzzleRecord | null> {
    const res = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { date } }),
    );
    return (res.Item as PuzzleRecord | undefined) ?? null;
  }

  async putIfAbsent(record: PuzzleRecord): Promise<PuzzleRecord> {
    try {
      await this.doc.send(
        new PutCommand({
          TableName: this.table,
          Item: record,
          ConditionExpression: "attribute_not_exists(#d)",
          ExpressionAttributeNames: { "#d": "date" },
        }),
      );
      return record;
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "ConditionalCheckFailedException") {
        const existing = await this.get(record.date);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async listDates(): Promise<string[]> {
    const dates: string[] = [];
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const res = await this.doc.send(
        new ScanCommand({
          TableName: this.table,
          ProjectionExpression: "#d",
          ExpressionAttributeNames: { "#d": "date" },
          ExclusiveStartKey,
        }),
      );
      for (const item of res.Items ?? []) dates.push((item as { date: string }).date);
      ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (ExclusiveStartKey);
    return dates.sort();
  }
}

// ---------------------------------------------------------------------------
// In-memory implementation (used by the local dev server and tests)
// ---------------------------------------------------------------------------

export class MemoryPuzzleStore implements PuzzleStore {
  private map = new Map<string, PuzzleRecord>();

  async get(date: string): Promise<PuzzleRecord | null> {
    return this.map.get(date) ?? null;
  }

  async putIfAbsent(record: PuzzleRecord): Promise<PuzzleRecord> {
    const existing = this.map.get(record.date);
    if (existing) return existing;
    this.map.set(record.date, record);
    return record;
  }

  async listDates(): Promise<string[]> {
    return [...this.map.keys()].sort();
  }
}
