# ===== Builder =====
FROM node:20-alpine AS builder

WORKDIR /app

# 🔥 build args 선언
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_ESSAY_API_BASE_URL
ARG NEXT_PUBLIC_USE_MOCK_DATA

# 🔥 build time env로 주입
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_ESSAY_API_BASE_URL=$NEXT_PUBLIC_ESSAY_API_BASE_URL
ENV NEXT_PUBLIC_USE_MOCK_DATA=$NEXT_PUBLIC_USE_MOCK_DATA

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== Runner =====
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "start"]
