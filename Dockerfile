FROM registry.access.redhat.com/ubi9/nodejs-18:latest AS build
USER root
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM registry.access.redhat.com/ubi9/nginx-122:latest
COPY --from=build /app/dist /usr/share/nginx/html
USER 1001
CMD ["nginx", "-g", "daemon off;"]
