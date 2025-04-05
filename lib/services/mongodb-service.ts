import { MongoClient, ServerApiVersion } from 'mongodb';

// Connection URI
const uri = process.env.MONGODB_URI || '';

// Create a MongoClient with a MongoClientOptions object
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Database and collection names
const DB_NAME = 'intentfi';
const INTENTS_COLLECTION = 'intents';

export interface StoredIntent {
  userAddress: string;
  description: string;
  chain: string;
  type: string;
  steps: Array<{
    description: string;
    chain: string;
    transactionHash?: string;
  }>;
  createdAt: Date;
}

export async function storeIntent(intentData: Omit<StoredIntent, 'createdAt'>): Promise<string> {
  try {
    await client.connect();
    
    const database = client.db(DB_NAME);
    const intents = database.collection<StoredIntent>(INTENTS_COLLECTION);
    
    const result = await intents.insertOne({
      ...intentData,
      createdAt: new Date()
    });
    
    return result.insertedId.toString();
  } finally {
    await client.close();
  }
}

export async function getUserIntents(userAddress: string): Promise<StoredIntent[]> {
  try {
    await client.connect();
    
    const database = client.db(DB_NAME);
    const intents = database.collection<StoredIntent>(INTENTS_COLLECTION);
    
    const cursor = intents.find({ userAddress }).sort({ createdAt: -1 });
    return await cursor.toArray();
  } finally {
    await client.close();
  }
} 