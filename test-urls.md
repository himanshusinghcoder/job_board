# Test URLs for Applications Page

## Working Test URLs (using actual seed data job IDs):

### Senior React Developer Job
http://localhost:3000/applications?job=750e8400-e29b-41d4-a716-446655440001

### Full Stack Engineer Job  
http://localhost:3000/applications?job=750e8400-e29b-41d4-a716-446655440002

### DevOps Engineer Job
http://localhost:3000/applications?job=750e8400-e29b-41d4-a716-446655440003

### All Applications (no filter)
http://localhost:3000/applications

## Problematic URL (job doesn't exist in seed data):
http://localhost:3000/applications?job=122612da-16cb-4c02-b286-81f57224ae7b

## Expected Applications from Seed Data:
- Job ID 750e8400-e29b-41d4-a716-446655440001 should have 1 application (from Alex Rodriguez)
- Job ID 750e8400-e29b-41d4-a716-446655440002 should have 1 application (from Jamie Smith)  
- Job ID 750e8400-e29b-41d4-a716-446655440003 should have 1 application (from Casey Brown)

## Debugging Steps:
1. Run the debug-job-id.sql script to verify what jobs exist
2. Test with the working URLs above
3. Check console logs for the debugging output we added
4. Verify your database has the seed data loaded