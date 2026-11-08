import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true},
  tokenHash:{type:String,required:true,unique:true,select:false},
  generation:{type:Number,required:true,min:1},
  revokedAt:Date,expiresAt:Date,lastUsedAt:Date
},{timestamps:true,versionKey:false});
export const PresidentAccessLink=mongoose.models.PresidentAccessLink||mongoose.model('PresidentAccessLink',schema);
