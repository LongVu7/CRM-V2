FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --ignore-scripts

COPY . .

# Generate Prisma Client after all files (including prisma schema) are copied
RUN npx prisma generate

EXPOSE 3003

# Run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
