export interface TransactionManager { run<T>(operation: () => Promise<T>): Promise<T>; }
