FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --no-audit --no-fund

COPY . .

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NODE_ENV=production

RUN npm run build

RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 app \
    && chown -R app:app /app

USER app

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0"]
