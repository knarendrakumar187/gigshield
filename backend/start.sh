#!/bin/bash
echo "Running database migrations..."
python manage.py migrate --noinput

echo "Starting Celery Worker..."
celery -A gigshield worker -l info &

echo "Starting Celery Beat..."
celery -A gigshield beat -l info &

echo "Starting Gunicorn Web Server..."
gunicorn gigshield.wsgi:application --bind 0.0.0.0:$PORT
