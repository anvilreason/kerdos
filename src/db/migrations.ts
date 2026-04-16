// Version 1 migration is handled declaratively in schema.ts via Dexie's
// `this.version(1).stores(...)`.  No imperative upgrade callback is needed
// for the initial schema — Dexie creates the object stores and indexes
// automatically.
//
// Future versions can be added here by importing the db instance and calling
// `db.version(N).stores({...}).upgrade(tx => { ... })`.
