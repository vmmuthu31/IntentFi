import mongoose, { Schema } from 'mongoose';

export interface ISmartAccount {
  address: string;
  privateKey: string;
  isDeployed: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

const SmartAccountSchema = new Schema<ISmartAccount>({
  address: { type: String, required: true, unique: true },
  privateKey: { type: String, required: true },
  isDeployed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date }
});

export const SmartAccount = mongoose.models.SmartAccount || 
  mongoose.model<ISmartAccount>('SmartAccount', SmartAccountSchema); 