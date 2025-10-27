-- Create the main database
CREATE DATABASE volkai_hr_edu;

-- Create the user
CREATE USER volkai_user WITH ENCRYPTED PASSWORD 'volkai_password';

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE volkai_hr_edu TO volkai_user;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

