FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# TODO: 프로덕션에서는 워커 수 조정 (--workers 2 등)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]