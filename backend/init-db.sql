-- Create database if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'volkai_hr_edu') THEN
      CREATE DATABASE volkai_hr_edu;
   END IF;
END
$$;

-- Create user if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'volkai_user') THEN
      CREATE USER volkai_user WITH ENCRYPTED PASSWORD 'volkai_password';
   END IF;
END
$$;
