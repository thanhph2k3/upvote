# Upvote Backend

Node.js backend base using Express and PostgreSQL 16.

## Requirements

- Node.js 20+
- PostgreSQL 16 running outside this project

## Setup

```bash
cp .env.example .env
npm install
npm run db:init
npm run db:check
npm run dev
```

Update `DATABASE_URL` in `.env` to match your existing PostgreSQL connection.

Frontend:

```text
http://localhost:3000
```

## Docker

Build and run the app on port 3000:

```bash
docker build -t upvote .
docker run --rm --name upvote -p 3000:3000 --env-file .env upvote
```

Run the command from this project directory so Docker reads the intended `.env` file. If PostgreSQL is running on your host machine and `DATABASE_URL` uses `localhost`, change the host to `host.docker.internal` for Docker Desktop:

```text
DATABASE_URL=postgres://upvote:upvote_password@host.docker.internal:5432/upvote
```

If PostgreSQL is on another machine or VPN IP, use that reachable IP/hostname instead. A hostname that only exists on your host, such as a local alias, may not resolve inside the container unless you add it to Docker networking.

API base path:

```text
http://localhost:3000/v1
```

## Endpoints

- `GET /v1/health` - application health
- `GET /v1/health/db` - PostgreSQL connectivity check
- `GET /v1/vote/campaigns` - list campaigns with vote summary
- `GET /v1/vote/campaigns/:campaignCode` - list votes for one campaign with vote summary
- `POST /v1/vote` - create one vote or a batch of votes
- `GET /v1/vote/campaigns/:campaignCode/realtime-vote` - fetch realtime vote count from an HTML page

Campaign list and detail endpoints support optional `start_unix` and `end_unix` query params for date filtering.

Example `POST /v1/vote` body:

```json
{
  "campaign_code": "campaign-1",
  "vote_number_before": 0,
  "voter": "user-a",
  "choice": "A",
  "status": true
}
```
