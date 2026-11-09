import 'dotenv/config';
import mongoose from 'mongoose';
import * as models from '../models/index.js';
import {databaseOptions} from '../lib/database-options.js';
try{
 await mongoose.connect(process.env.MONGODB_URI,{...databaseOptions(),autoIndex:false});
 const unique=[...new Set(Object.values(models))].filter(model=>typeof model.createIndexes==='function');
 for(const model of unique)await model.createIndexes();
 console.log('Indeksi su provereni/dodati za '+unique.length+' modela; podaci i postojeći indeksi nisu brisani.');
}catch{console.error('Indeksi nisu potvrđeni. Proverite konekciju i dozvole baze; tajne nisu ispisane.');process.exitCode=1;}finally{await mongoose.disconnect();}
