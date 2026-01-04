FROM node:20-alpine AS web-build

WORKDIR /web

COPY services/web/package.json ./
RUN npm install

COPY services/web/index.html ./
COPY services/web/vite.config.js ./
COPY services/web/src ./src

RUN npm run build

FROM node:20-alpine AS hub-build

WORKDIR /hub

COPY services/hub/package.json ./
RUN npm install --production

COPY services/hub/src ./src

FROM node:20-alpine

RUN apk add --no-cache nginx

WORKDIR /app

COPY --from=hub-build /hub /app/hub
COPY --from=web-build /web/dist /usr/share/nginx/html
COPY services/web/nginx/default.single.conf /etc/nginx/conf.d/default.conf
COPY scripts/start-all.sh /app/start-all.sh

ENV PORT=8081
EXPOSE 80 8081

CMD ["/app/start-all.sh"]
