# --- Build asamasi ---
FROM node:18-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Docker icin environment degiskenleri
ARG VITE_CHAOS_URL=http://localhost:8081
ARG VITE_SECURITY_URL=http://localhost:8082
ARG VITE_REPORT_URL=http://localhost:8083

ENV VITE_CHAOS_URL=$VITE_CHAOS_URL
ENV VITE_SECURITY_URL=$VITE_SECURITY_URL
ENV VITE_REPORT_URL=$VITE_REPORT_URL

RUN npm run build

# --- Nginx runtime asamasi ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
