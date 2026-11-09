export function databaseOptions(env=process.env){
 const number=(key,fallback,min,max)=>{const value=Number(env[key]||fallback);if(!Number.isInteger(value)||value<min||value>max)throw Error('Neispravno podešavanje '+key);return value;};
 return {maxPoolSize:number('MONGO_POOL_SIZE',10,2,30),minPoolSize:0,maxConnecting:2,maxIdleTimeMS:60000,serverSelectionTimeoutMS:10000,waitQueueTimeoutMS:15000,autoIndex:env.NODE_ENV!=='production'};
}
