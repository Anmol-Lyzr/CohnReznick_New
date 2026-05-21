import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "CohnRehnick";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient(): Promise<MongoClient> {
  if (!uri) {
    return Promise.reject(
      new Error("MONGODB_URI is not set. Add it to .env.local to enable persistence.")
    );
  }
  const client = new MongoClient(uri);
  return client.connect();
}

export function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClient();
    }
    return global._mongoClientPromise;
  }
  return createClient();
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

export function isMongoConfigured(): boolean {
  return Boolean(uri && dbName);
}
