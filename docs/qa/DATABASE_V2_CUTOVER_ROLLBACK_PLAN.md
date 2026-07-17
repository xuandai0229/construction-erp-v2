# Cutover Rollback Plan
In case of cutover failure:
1. Switch connection strings back to source database.
2. No data is lost because source is not mutated.
3. Drop the new rehearsal/target database.