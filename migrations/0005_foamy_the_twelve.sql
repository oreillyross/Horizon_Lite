CREATE TABLE "user_sessions" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
