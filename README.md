# Upvote

Project đã được tách thành hai project độc lập:

- `backend/` - Node.js + Express API dùng PostgreSQL.
- `frontend/` - Vite + React + MUI dashboard.

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:init
npm run db:check
npm run dev
```

Backend mặc định chạy tại:

```text
http://localhost:3000
```

API base path:

```text
http://localhost:3000/api/v1
```

## Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

`frontend/.env` có thể trỏ sang backend khác bằng:

```text
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Docker Backend

```bash
cd backend
docker build -t upvote-backend .
docker run --rm --name upvote-backend -p 3000:3000 --env-file .env upvote-backend
```

Nếu PostgreSQL chạy trên host machine và `DATABASE_URL` dùng `localhost`, đổi host thành `host.docker.internal` khi chạy bằng Docker Desktop.

## Docker Compose

Chạy đủ 3 service `frontend`, `backend`, `db` PostgreSQL 16:

```bash
docker compose up --build
```

Sau khi compose chạy xong:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
Database: localhost:5432
```

PostgreSQL dùng thông tin mặc định:

```text
POSTGRES_DB=upvote
POSTGRES_USER=upvote
POSTGRES_PASSWORD=upvote_password
```

Lần đầu khởi tạo, DB tự tạo bảng `votes` từ `backend/db/init/001-create-votes.sql`.

## Endpoints

- `GET /api/v1/health` - application health
- `GET /api/v1/health/db` - PostgreSQL connectivity check
- `GET /api/v1/vote/campaigns` - list campaigns with vote summary
- `GET /api/v1/vote/campaigns/:campaignCode` - list votes for one campaign with vote summary
- `POST /api/v1/vote` - create one vote or a batch of votes
- `GET /api/v1/vote/campaigns/:campaignCode/realtime-vote` - fetch realtime vote count from the upstream HTML page
- `POST /api/v1/vote/campaigns/realtime-votes` - fetch realtime vote count for multiple campaigns

Campaign list and detail endpoints support optional `start_unix` and `end_unix` query params for date filtering.
