// Reserved local addresses only. Never rewrite real corporate domains.
export const canonicalLocalEmail=value=>typeof value==='string'?value.replace(/@demo\.zepter\.test$/i,'@zepter.test'):value;
export function legacyLocalLogin(email){return process.env.NODE_ENV!=='production'&&/@demo\.zepter\.test$/i.test(email)?canonicalLocalEmail(email):null;}
