FROM postgres:15

# Install the hypopg extension natively into the PostgreSQL image
RUN apt-get update && \
    apt-get install -y postgresql-15-hypopg && \
    rm -rf /var/lib/apt/lists/*
