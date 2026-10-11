# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY etl/requirements.txt ./etl/requirements.txt
RUN pip install --no-cache-dir -r etl/requirements.txt
COPY etl ./etl
COPY ml ./ml
COPY scripts/docker-refresh.sh ./scripts/docker-refresh.sh
CMD ["sh", "scripts/docker-refresh.sh"]
