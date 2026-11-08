// A transport/server failure may happen after a POST has already been persisted.
export const uncertainWrite = error => !error.status || error.status >= 500;
