declare module 'better-sqlite3' {
  interface Database {
    prepare(sql: string): any;
    exec(sql: string): Database;
    close(): void;
  }
  const Database: new (filename: string, options?: { readonly?: boolean }) => Database;
  export default Database;
}
