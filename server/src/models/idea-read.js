import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 idea:{type:mongoose.Schema.Types.ObjectId,ref:'Idea',required:true},
 seenAt:{type:Date,required:true}
},{timestamps:true,versionKey:false});
schema.index({user:1,idea:1},{unique:true});
export const IdeaRead=mongoose.models.IdeaRead||mongoose.model('IdeaRead',schema);
