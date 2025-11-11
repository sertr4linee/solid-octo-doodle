FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install

COPY . .

RUN bunx prisma generate

RUN bun run build

EXPOSE 3000

CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && bun start"]