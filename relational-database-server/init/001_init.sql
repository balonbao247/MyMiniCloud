-- Cấu hình CSDL cơ bản
CREATE DATABASE IF NOT EXISTS minicloud;
USE minicloud;

CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notes (title) VALUES ('Hello from MariaDB!');

-- Yêu cầu mở rộng 7.3: Database studentdb
CREATE DATABASE IF NOT EXISTS studentdb;
USE studentdb;

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    major VARCHAR(50) NOT NULL
);

INSERT INTO students (student_id, fullname, dob, major) VALUES
('SV001', 'Nguyen Van A', '2004-01-15', 'Computer Science'),
('SV002', 'Tran Thi B', '2004-05-20', 'Software Engineering'),
('SV003', 'Le Van C', '2003-12-10', 'Data Science');
