FROM node:20-slim

# Install OpenSSL — required by Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy ALL files first (including prisma schema)
COPY . .

RUN npm install

EXPOSE 5000

CMD ["npm", "start"]