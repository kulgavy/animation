INSERT INTO "user" ("user_id", "full_name", "email_address", "hashed_password", "user_type","created_at","updated_at")
VALUES ('5667bebd-f8de-454d-9f60-aa43d448ad38', 'Admin User', 'admin@example.com', 'hashed_admin_password', 'admin',
        '2025-02-24 23:26:45.726050 +00:00', '2025-02-24 23:26:45.726050 +00:00'),
       ('d4424332-9a8e-4cfc-9dbf-982b1435853c', 'User One', 'user1@example.com', 'hashed_user1_password', 'user',
        '2025-02-24 23:26:45.726050 +00:00', '2025-02-24 23:26:45.726050 +00:00'),
       ('d686ba31-377f-4f8d-ab12-afa01abbf51d', 'User Two', 'user2@example.com', 'hashed_user2_password', 'user',
        '2025-02-24 23:26:45.726050 +00:00', '2025-02-24 23:26:45.726050 +00:00');
-- Migration number: 0002 	 2025-02-24T23:20:58.491Z
